const LOOPBACK_HOSTS = ["127.0.0.1", "localhost"];

export function isAllowedOrigin(
  origin: string | undefined,
  allowedOrigins: readonly string[]
) {
  if (!origin) return false;
  return allowedOrigins.includes(origin.replace(/\/$/, ""));
}

export function isAllowedHost(host: string | undefined, port: number) {
  if (!host) return false;
  return LOOPBACK_HOSTS.some((name) => host === `${name}:${port}`);
}
