function normalize(origin: string): string {
  return origin.trim().replace(/\/+$/, '');
}

// CLIENT_URL plus any extra addresses in CORS_ORIGINS (comma separated)
export function getAllowedOrigins(): string[] {
  const primary = process.env.CLIENT_URL ? [process.env.CLIENT_URL] : [];
  const extra = (process.env.CORS_ORIGINS ?? '').split(',');
  return [...new Set([...primary, ...extra].map(normalize).filter(Boolean))];
}

// Used by both Express and Socket.IO. It reads the environment on every request,
// so it doesn't matter when dotenv finishes loading.
export function corsOrigin(
  requestOrigin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
): void {
  // No Origin header means it isn't a browser cross-site request (curl, Stripe's webhook)
  if (!requestOrigin || getAllowedOrigins().includes(requestOrigin)) {
    callback(null, true);
    return;
  }
  callback(null, false);
}