const SCHEME_REGEX = /^[a-z][a-z0-9+.-]*:/i;

export function normalizeDestinationUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  const candidate = trimmed.startsWith("//")
    ? `https:${trimmed}`
    : SCHEME_REGEX.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;

  const url = parseHttpUrl(candidate);
  return url ? url.toString() : candidate;
}

export function parseHttpUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname) return null;
    return url;
  } catch {
    return null;
  }
}

export function isRedirectLoopTarget(destinationUrl: string, siteUrl: string): boolean {
  const destination = parseHttpUrl(destinationUrl);
  const site = parseHttpUrl(siteUrl);
  if (!destination || !site) return false;

  const normalizedPath = destination.pathname.replace(/\/+$/, "");
  return destination.origin === site.origin && normalizedPath.startsWith("/r/");
}

export function safeInternalRedirectPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";

  try {
    const url = new URL(value, "http://internal.local");
    if (url.origin !== "http://internal.local") return "/dashboard";
    if (url.pathname === "/login") return "/dashboard";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/dashboard";
  }
}
