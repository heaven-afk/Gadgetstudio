export const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
export const IDLE_WARNING_MS = 60 * 1000;

// A single atomic statement prevents a late activity request from reviving an
// expired session. Clerk token refreshes and ordinary API reads never extend it.
export async function checkSellerSession(
  db,
  { sessionId, userId, touch = false, now = null },
) {
  const row = await db
    .prepare(
      `
    WITH clock AS (
      SELECT COALESCE(?::bigint, (EXTRACT(EPOCH FROM statement_timestamp()) * 1000)::bigint) AS now
    )
    INSERT INTO seller_sessions AS existing(session_id,user_id,expires_at)
    SELECT ?,?,now + ? FROM clock
    ON CONFLICT(session_id) DO UPDATE SET
      expires_at=CASE WHEN NOT existing.revoked
        AND existing.user_id=EXCLUDED.user_id
        AND existing.expires_at>(SELECT now FROM clock) AND ?
        THEN EXCLUDED.expires_at ELSE existing.expires_at END,
      revoked=existing.revoked OR existing.user_id<>EXCLUDED.user_id
        OR existing.expires_at<=(SELECT now FROM clock)
    RETURNING expires_at, NOT revoked AS active, (SELECT now FROM clock) AS now
  `,
    )
    .bind(now, sessionId, userId, IDLE_TIMEOUT_MS, touch)
    .first();
  return {
    active: !!row?.active,
    expiresAt: Number(row?.expires_at),
    serverNow: Number(row?.now),
  };
}

export class IdleSessionExpired extends Error {
  constructor() {
    super(
      'Your session expired after 15 minutes of inactivity. Sign in again.',
    );
  }
}
