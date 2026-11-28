import { fetchWithTimeout, recordOperationalAlert } from './monitoring.js';

export function extractClientIp(req: any): string {
  const h = req?.headers || {};
  const raw = h['x-forwarded-for'] || h['x-real-ip'] || req?.socket?.remoteAddress || '';
  const first = String(Array.isArray(raw) ? raw[0] : raw).split(',')[0].trim();
  return first.slice(0, 64) || 'unknown';
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

let tableReady = false;

async function ensureRateLimitTable(sql: any): Promise<void> {
  if (tableReady || !sql?.query) return;
  await sql.query(`
    CREATE TABLE IF NOT EXISTS security_rate_limits (
      rate_key VARCHAR(200) PRIMARY KEY,
      hits INT NOT NULL DEFAULT 1,
      window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      blocked_until TIMESTAMPTZ
    );
  `).catch(() => {});
  tableReady = true;
}

/**
 * Checks and increments an attempt counter using Upstash Redis if configured, else Neon PostgreSQL.
 */
export async function checkRateLimit(
  sql: any,
  params: {
    key: string;
    maxHits: number;
    windowSeconds: number;
    blockSeconds?: number;
    increment?: boolean;
  }
): Promise<RateLimitResult> {
  const cleanKey = `rl:${String(params.key).slice(0, 180)}`;
  const windowSec = Math.max(10, params.windowSeconds);
  const blockSec = Math.max(windowSec, params.blockSeconds || windowSec);
  const increment = params.increment !== false;

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (redisUrl && redisToken && increment) {
    try {
      const res = await fetchWithTimeout(
        `${redisUrl.replace(/\/+$/, '')}/pipeline`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${redisToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify([
            ['INCR', cleanKey],
            ['EXPIRE', cleanKey, windowSec, 'NX'],
            ['TTL', cleanKey]
          ])
        },
        2000
      );
      if (res.ok) {
        const data: any = await res.json();
        const hits = Number(data?.[0]?.result || 1);
        const ttl = Math.max(1, Number(data?.[2]?.result || windowSec));
        if (hits > params.maxHits) {
          return { allowed: false, remaining: 0, retryAfterSeconds: ttl };
        }
        return { allowed: true, remaining: Math.max(0, params.maxHits - hits), retryAfterSeconds: 0 };
      }
    } catch {}
  }

  if (typeof sql !== 'function') {
    return { allowed: true, remaining: params.maxHits, retryAfterSeconds: 0 };
  }

  try {
    await ensureRateLimitTable(sql);
    const existingRows = await sql`
      SELECT hits, window_start, blocked_until
      FROM security_rate_limits
      WHERE rate_key = ${cleanKey}
      LIMIT 1;
    `;
    const row = existingRows?.[0];
    const now = Date.now();

    if (row?.blocked_until && new Date(row.blocked_until).getTime() > now) {
      const retry = Math.max(1, Math.ceil((new Date(row.blocked_until).getTime() - now) / 1000));
      return { allowed: false, remaining: 0, retryAfterSeconds: retry };
    }

    if (!increment) {
      const activeWindow = row && now - new Date(row.window_start).getTime() < windowSec * 1000;
      const hits = activeWindow ? Number(row.hits || 0) : 0;
      return {
        allowed: hits < params.maxHits,
        remaining: Math.max(0, params.maxHits - hits),
        retryAfterSeconds: hits >= params.maxHits ? windowSec : 0
      };
    }

    const updated = await sql`
      INSERT INTO security_rate_limits (rate_key, hits, window_start, blocked_until)
      VALUES (${cleanKey}, 1, NOW(), NULL)
      ON CONFLICT (rate_key) DO UPDATE SET
        hits = CASE
          WHEN security_rate_limits.window_start < NOW() - (${windowSec}::text || ' seconds')::interval THEN 1
          ELSE security_rate_limits.hits + 1
        END,
        window_start = CASE
          WHEN security_rate_limits.window_start < NOW() - (${windowSec}::text || ' seconds')::interval THEN NOW()
          ELSE security_rate_limits.window_start
        END,
        blocked_until = CASE
          WHEN security_rate_limits.window_start < NOW() - (${windowSec}::text || ' seconds')::interval THEN NULL
          WHEN security_rate_limits.hits + 1 >= ${params.maxHits} THEN NOW() + (${blockSec}::text || ' seconds')::interval
          ELSE NULL
        END
      RETURNING hits, blocked_until;
    `;
    const hits = Number(updated?.[0]?.hits || 1);
    const blockedUntil = updated?.[0]?.blocked_until;
    if (blockedUntil && new Date(blockedUntil).getTime() > now && hits > params.maxHits) {
      return { allowed: false, remaining: 0, retryAfterSeconds: blockSec };
    }
    if (hits > params.maxHits) {
      return { allowed: false, remaining: 0, retryAfterSeconds: blockSec };
    }
    return { allowed: true, remaining: Math.max(0, params.maxHits - hits), retryAfterSeconds: 0 };
  } catch (err: any) {
    void recordOperationalAlert(sql, {
      severity: 'warn',
      source: 'rateLimit',
      message: String(err?.message || err)
    });
    return { allowed: true, remaining: params.maxHits, retryAfterSeconds: 0 };
  }
}

export async function clearRateLimit(sql: any, key: string): Promise<void> {
  const cleanKey = `rl:${String(key).slice(0, 180)}`;
  if (typeof sql !== 'function') return;
  await sql`DELETE FROM security_rate_limits WHERE rate_key = ${cleanKey};`.catch(() => {});
}
