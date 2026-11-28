function isUpstashConfigured() {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

export function extractClientIp(req) {
  try {
    const h = req?.headers || {};
    const raw = h['x-forwarded-for'] || h['x-real-ip'] || '';
    const first = String(Array.isArray(raw) ? raw[0] : raw).split(',')[0].trim();
    return first.slice(0, 64) || 'unknown';
  } catch {
    return 'unknown';
  }
}

async function checkUpstashRateLimit(key, maxHits, windowSeconds, increment) {
  const baseUrl = String(process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '');
  const token = String(process.env.UPSTASH_REDIS_REST_TOKEN || '');
  const safeKey = encodeURIComponent(`rl:${key}`);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    if (!increment) {
      const res = await fetch(`${baseUrl}/get/${safeKey}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal
      });
      const data = await res.json();
      const count = Number(data?.result || 0);
      return {
        allowed: count < maxHits,
        remaining: Math.max(0, maxHits - count),
        retryAfterSeconds: count >= maxHits ? windowSeconds : 0
      };
    }

    const pipeline = [
      ['INCR', `rl:${key}`],
      ['EXPIRE', `rl:${key}`, String(windowSeconds), 'NX'],
      ['TTL', `rl:${key}`]
    ];
    const res = await fetch(`${baseUrl}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(pipeline),
      signal: controller.signal
    });
    const out = await res.json();
    const count = Number(out?.[0]?.result || 1);
    const ttl = Math.max(1, Number(out?.[2]?.result || windowSeconds));
    return {
      allowed: count <= maxHits,
      remaining: Math.max(0, maxHits - count),
      retryAfterSeconds: count > maxHits ? ttl : 0
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function checkRateLimit(sql, opts) {
  const maxHits = Math.max(1, opts.maxHits);
  const windowSeconds = Math.max(30, opts.windowSeconds);
  const blockSeconds = Math.max(windowSeconds, opts.blockSeconds || windowSeconds);
  const increment = opts.increment !== false;
  const cleanKey = String(opts.key || 'global').slice(0, 180);

  if (isUpstashConfigured()) {
    try {
      return await checkUpstashRateLimit(cleanKey, maxHits, windowSeconds, increment);
    } catch {
      // Fallback transparently to PostgreSQL when Upstash is unreachable
    }
  }

  try {
    const existingRows = await sql`
      SELECT hits, window_started_at, blocked_until
      FROM security_rate_limits
      WHERE limit_key = ${cleanKey}
      LIMIT 1;
    `;
    const nowMs = Date.now();
    const row = existingRows?.[0];
    if (row?.blocked_until && new Date(row.blocked_until).getTime() > nowMs) {
      const retryAfterSeconds = Math.max(1, Math.ceil((new Date(row.blocked_until).getTime() - nowMs) / 1000));
      return { allowed: false, remaining: 0, retryAfterSeconds };
    }

    if (!increment) {
      const windowExpired =
        !row?.window_started_at ||
        nowMs - new Date(row.window_started_at).getTime() > windowSeconds * 1000;
      const currentHits = windowExpired ? 0 : Number(row?.hits || 0);
      return {
        allowed: currentHits < maxHits,
        remaining: Math.max(0, maxHits - currentHits),
        retryAfterSeconds: 0
      };
    }

    const windowExpired =
      !row?.window_started_at ||
      nowMs - new Date(row.window_started_at).getTime() > windowSeconds * 1000;
    const nextHits = windowExpired ? 1 : Number(row?.hits || 0) + 1;
    const shouldBlock = nextHits > maxHits;
    const blockedUntil = shouldBlock ? new Date(nowMs + blockSeconds * 1000).toISOString() : null;
    const nextWindowStart = windowExpired
      ? new Date(nowMs).toISOString()
      : new Date(row.window_started_at).toISOString();

    await sql`
      INSERT INTO security_rate_limits (limit_key, hits, window_started_at, blocked_until, updated_at)
      VALUES (${cleanKey}, ${nextHits}, ${nextWindowStart}, ${blockedUntil}, NOW())
      ON CONFLICT (limit_key) DO UPDATE SET
        hits = EXCLUDED.hits,
        window_started_at = EXCLUDED.window_started_at,
        blocked_until = EXCLUDED.blocked_until,
        updated_at = NOW();
    `;

    return {
      allowed: !shouldBlock,
      remaining: Math.max(0, maxHits - nextHits),
      retryAfterSeconds: shouldBlock ? blockSeconds : 0
    };
  } catch {
    return { allowed: true, remaining: maxHits, retryAfterSeconds: 0 };
  }
}

export async function clearRateLimit(sql, key) {
  try {
    await sql`DELETE FROM security_rate_limits WHERE limit_key = ${String(key || '').slice(0, 180)};`;
  } catch {
    // Non-critical cleanup
  }
}
