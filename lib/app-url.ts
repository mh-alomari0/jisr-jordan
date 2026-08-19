const DEFAULT_DEVELOPMENT_ORIGIN = "http://localhost:3000";

export function getPublicAppOrigin() {
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const url = new URL(candidate.startsWith("http") ? candidate : `https://${candidate}`);
      if (url.protocol === "https:" || url.protocol === "http:") {
        return url.origin;
      }
    } catch {
      // Ignore an invalid candidate and try the next deployment-provided value.
    }
  }

  return DEFAULT_DEVELOPMENT_ORIGIN;
}
