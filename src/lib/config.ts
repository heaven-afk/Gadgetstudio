export function configured() {
  // Read server runtime configuration rather than Next's build-time public replacements.
  const env = process.env;
  const publicKey = Reflect.get(env, 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY') || '';
  const secretKey = Reflect.get(env, 'CLERK_SECRET_KEY') || '';
  const publicMatch = /^pk_(test|live)_[A-Za-z0-9_-]{20,}={0,2}$/.exec(
    publicKey,
  );
  const secretMatch = /^sk_(test|live)_[A-Za-z0-9_-]{20,}$/.exec(secretKey);
  return !!(publicMatch && secretMatch && publicMatch[1] === secretMatch[1]);
}
export function siteUrl() {
  const value = Reflect.get(process.env, 'NEXT_PUBLIC_SITE_URL')?.trim();
  if (!value)
    throw new Error(
      'Set NEXT_PUBLIC_SITE_URL before connecting authentication.',
    );
  const url = new URL(value);
  if (
    url.protocol !== 'https:' &&
    !(
      process.env.NODE_ENV !== 'production' &&
      ['localhost', '127.0.0.1'].includes(url.hostname)
    )
  )
    throw new Error('Use an HTTPS site URL in production.');
  return url.origin;
}
export function safeNext(value: string | null) {
  return value && /^\/(dashboard|update-password)(?:[#?].*)?$/.test(value)
    ? value
    : '/dashboard';
}
