import { neon } from '@neondatabase/serverless';
import fs from 'node:fs';

const env = fs.readFileSync('.env', 'utf8');
const match = env.match(/DATABASE_URL=([^\r\n]+)/);
const sql = neon(match[1]);

async function main() {
  const scrapedMap = JSON.parse(fs.readFileSync('all_scraped_map.json', 'utf8'));
  
  // Also add ONMUST charger studio photo
  scrapedMap['prod-onmust-zolo-30w-1006'] = '/product-images/onmust-zolo-30w-studio.jpg';
  
  console.log(`Loaded ${Object.keys(scrapedMap).length} official studio image mappings.`);

  // 1. Update BMW case product specifically
  const bmwImages = [
    '/product-images/case-bmw-m-ip17promax-on-phone.png',
    '/product-images/case-bmw-m-ip17promax-original.jpg'
  ];
  await sql`
    UPDATE products 
    SET images = ${JSON.stringify(bmwImages)}::jsonb
    WHERE id = 'prod-case-bmw-m-ip17promax'
  `;
  console.log('✅ Updated BMW case product images:', bmwImages);

  // 2. Fetch all non-case products
  const products = await sql`
    SELECT id, name_ar, images, category, brand 
    FROM products 
    WHERE category != 'cases_protection'
  `;
  console.log(`Found ${products.length} non-case products in Neon database.`);

  let updatedCount = 0;
  for (const prod of products) {
    const studioImg = scrapedMap[prod.id];
    let currentImgs = Array.isArray(prod.images) ? prod.images : [];
    
    // Clean current images (remove trailing slashes, ensure leading slash)
    currentImgs = currentImgs.map(img => {
      let u = String(img || '').trim().replace(/\/+$/, '');
      if (!u.startsWith('/') && !u.startsWith('http')) u = '/' + u;
      return u;
    }).filter(Boolean);

    let newImages = [...currentImgs];
    if (studioImg) {
      // Remove any existing occurrence of studioImg to avoid duplicates
      newImages = newImages.filter(img => img !== studioImg);
      // Prepend studio image as the primary image
      newImages = [studioImg, ...newImages];
    }

    // Check if changed
    if (JSON.stringify(newImages) !== JSON.stringify(prod.images)) {
      await sql`
        UPDATE products 
        SET images = ${JSON.stringify(newImages)}::jsonb
        WHERE id = ${prod.id}
      `;
      updatedCount++;
      console.log(`✅ [${prod.brand}] ${prod.id} -> primary: ${newImages[0]} (total ${newImages.length} images)`);
    }
  }

  console.log(`\n🎉 Successfully updated ${updatedCount} non-case products in Neon DB!`);
}

main().catch(console.error);
