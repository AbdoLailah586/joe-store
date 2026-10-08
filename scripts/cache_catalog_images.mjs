import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const imageTypes = {
  'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'image/gif': 'gif', 'image/avif': 'avif', 'image/svg+xml': 'svg'
};
const hash = url => crypto.createHash('sha256').update(url).digest('hex').slice(0, 24);
const remote = url => typeof url === 'string' && /^https?:\/\//i.test(url);
const validBytes = (bytes, extension) => {
  if (bytes.length < 128) return false;
  if (extension === 'jpg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (extension === 'png') return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (extension === 'webp') return bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  if (extension === 'gif') return /^GIF8[79]a$/.test(bytes.toString('ascii', 0, 6));
  if (extension === 'avif') return bytes.toString('ascii', 4, 8) === 'ftyp' && /avif|avis/.test(bytes.toString('ascii', 8, 36));
  if (extension === 'svg') return /<svg\b/i.test(bytes.toString('utf8', 0, 1024));
  return false;
};

export async function cacheCatalogImages(options) {
  const inputPath = path.resolve(options.input);
  const outputPath = path.resolve(options.output || inputPath.replace(/\.json$/i, '-localized.json'));
  if (inputPath === outputPath) throw new Error('Use a distinct output path; source catalog is preserved.');
  const cacheDir = path.resolve(options.cacheDir || path.join(projectRoot, 'public', 'product-images'));
  const reportPath = path.resolve(options.report || inputPath.replace(/\.json$/i, '-image-cache-report.json'));
  const catalog = JSON.parse(await fs.readFile(inputPath, 'utf8'));
  if (!Array.isArray(catalog)) throw new Error('Input must be a JSON product array.');
  const pools = options.pool ? JSON.parse(await fs.readFile(path.resolve(options.pool), 'utf8')) : [];
  const poolEntries = Array.isArray(pools) ? pools : pools.pools || [];
  const entries = new Map();
  const add = (url, context) => {
    if (!remote(url)) return;
    if (!entries.has(url)) entries.set(url, { url, kinds: new Set(), product_ids: new Set(), sources: new Set() });
    const record = entries.get(url);
    if (context.kind) record.kinds.add(context.kind);
    if (context.id) record.product_ids.add(context.id);
    if (context.source_url) record.sources.add(context.source_url);
  };
  for (const product of catalog) {
    const kind = product.import_metadata?.item_kind;
    const source_url = product.import_metadata?.image?.source_url;
    for (const url of product.images || []) add(url, { kind, id: product.id, source_url });
    for (const banner of product.feature_banners || []) add(banner.image_url, { kind, id: product.id, source_url });
  }
  for (const entry of poolEntries) add(entry.image_url, entry);
  await fs.mkdir(cacheDir, { recursive: true });
  const filenames = await fs.readdir(cacheDir);
  let completed = 0;
  const records = [...entries.values()];
  async function download(record) {
    const stem = hash(record.url);
    const existing = filenames.find(filename => filename.startsWith(stem + '.'));
    if (existing) {
      const extension = path.extname(existing).slice(1);
      const bytes = await fs.readFile(path.join(cacheDir, existing));
      if (validBytes(bytes, extension)) {
        Object.assign(record, { status: 'cached', local_url: `/product-images/${existing}`, bytes: bytes.length,
          content_type: Object.keys(imageTypes).find(type => imageTypes[type] === extension) || `image/${extension}` });
        return;
      }
    }
    const attempts = [];
    for (let attempt = 1; attempt <= Number(options.retries ?? 1) + 1; attempt++) {
      try {
        const response = await fetch(record.url, {
          signal: AbortSignal.timeout(Number(options.timeout ?? 20000)), redirect: 'follow',
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JOEStoreCatalog/1.0)', Accept: 'image/avif,image/webp,image/*,*/*;q=0.8' }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const content_type = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
        const extension = imageTypes[content_type];
        if (!extension) throw new Error(`Unsupported image MIME: ${content_type || '(missing)'}`);
        if (Number(response.headers.get('content-length')) > 20 * 1024 * 1024) throw new Error('Image exceeds 20 MB limit');
        const bytes = Buffer.from(await response.arrayBuffer());
        if (bytes.length > 20 * 1024 * 1024) throw new Error('Image exceeds 20 MB limit');
        if (!validBytes(bytes, extension)) throw new Error(`Invalid ${extension} signature or image too small (${bytes.length} bytes)`);
        const filename = `${stem}.${extension}`;
        // URL-based names are deterministic. Keep source bytes unchanged.
        await fs.writeFile(path.join(cacheDir, filename), bytes, { flag: 'wx' }).catch(async error => {
          if (error.code !== 'EEXIST') throw error;
          const existingBytes = await fs.readFile(path.join(cacheDir, filename));
          if (!validBytes(existingBytes, extension)) throw new Error(`Existing cached file is invalid: ${filename}`);
        });
        Object.assign(record, { status: 'downloaded', local_url: `/product-images/${filename}`, bytes: bytes.length,
          content_type, final_url: response.url, attempts });
        return;
      } catch (error) {
        attempts.push({ attempt, error: error.message });
      }
    }
    Object.assign(record, { status: 'failed', attempts, error: attempts.at(-1)?.error });
  }
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(Number(options.concurrency || 6), records.length) }, async () => {
    while (cursor < records.length) {
      const record = records[cursor++];
      await download(record);
      completed++;
      if (completed % 15 === 0 || completed === records.length) {
        process.stdout.write(`Images checked: ${completed}/${records.length}\n`);
      }
    }
  }));
  const fallbackByKind = new Map();
  for (const entry of poolEntries) {
    const cached = entries.get(entry.image_url);
    if (entry.kind && cached?.local_url && !fallbackByKind.has(entry.kind)) {
      fallbackByKind.set(entry.kind, { ...cached, source_url: entry.source_url, representative_model: entry.representative_model });
    }
  }
  // Catalog images can supply a same-kind fallback even without a pool file.
  for (const record of records) {
    if (record.local_url) for (const kind of record.kinds) {
      if (!fallbackByKind.has(kind)) fallbackByKind.set(kind, { ...record, source_url: [...record.sources][0] });
    }
  }
  const resolutions = [];
  for (const product of catalog) {
    const substitutions = [];
    const localize = url => {
      if (!remote(url)) return url;
      const record = entries.get(url);
      if (record?.local_url) {
        substitutions.push({ original_url: url, local_url: record.local_url, status: record.status });
        return record.local_url;
      }
      const fallback = fallbackByKind.get(product.import_metadata?.item_kind);
      const local_url = fallback?.local_url || '/product-placeholder.svg';
      substitutions.push({ original_url: url, local_url, status: fallback ? 'same_kind_fallback' : 'placeholder',
        fallback_original_url: fallback?.url, fallback_source_url: fallback?.source_url });
      product.image_is_illustrative = true;
      if (fallback?.source_url && !(product.data_sources || []).some(source => source.url === fallback.source_url)) {
        product.data_sources = [...(product.data_sources || []), {
          url: fallback.source_url, title: `مصدر الصورة البديلة التوضيحية: ${fallback.representative_model || 'نفس الفئة'}`
        }];
      }
      if (product.import_metadata?.image) {
        product.import_metadata.image.illustrative = true;
        product.import_metadata.image.image_match_verified = false;
      }
      resolutions.push({ product_id: product.id, item_kind: product.import_metadata?.item_kind, ...substitutions.at(-1) });
      return local_url;
    };
    product.images = [...new Set((product.images || []).map(localize))];
    if (!product.images.length) {
      product.images = ['/product-placeholder.svg'];
      product.image_is_illustrative = true;
    }
    if (product.feature_banners) product.feature_banners = product.feature_banners.map(banner => ({ ...banner, image_url: localize(banner.image_url) }));
    if (substitutions.length && product.import_metadata) {
      product.import_metadata.image_cache = substitutions;
      if (product.specs?.__catalog_import) product.specs.__catalog_import = JSON.stringify(product.import_metadata);
    }
  }
  const serializable = records.map(record => ({ ...record, kinds: [...record.kinds], product_ids: [...record.product_ids], sources: [...record.sources] }));
  const totalBytes = records.reduce((sum, record) => sum + (record.bytes || 0), 0);
  const summary = { products: catalog.length, unique_remote_urls: records.length,
    downloaded: records.filter(record => record.status === 'downloaded').length,
    reused: records.filter(record => record.status === 'cached').length,
    failed: records.filter(record => record.status === 'failed').length,
    fallback_assignments: resolutions.length, total_bytes: totalBytes,
    megabytes: Number((totalBytes / 1024 / 1024).toFixed(2)) };
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(catalog, null, 2));
  await fs.writeFile(reportPath, JSON.stringify({ observed_at: new Date().toISOString(), input_path: inputPath,
    output_path: outputPath, cache_directory: cacheDir, summary, mapping: serializable, substitutions: resolutions }, null, 2));
  process.stdout.write(JSON.stringify({ output: outputPath, report: reportPath, ...summary }) + '\n');
  return { catalog, summary, mapping: serializable, substitutions: resolutions, outputPath, reportPath };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const options = {};
  for (let index = 2; index < process.argv.length; index += 2) {
    const key = process.argv[index].replace(/^--/, '').replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    options[key] = process.argv[index + 1];
  }
  if (!options.input) {
    process.stderr.write('Usage: node scripts/cache_catalog_images.mjs --input catalog.json [--pool pools.json] [--output localized.json] [--report mapping.json] [--concurrency 6] [--timeout 20000] [--retries 1]\n');
    process.exitCode = 1;
  } else await cacheCatalogImages(options);
}
