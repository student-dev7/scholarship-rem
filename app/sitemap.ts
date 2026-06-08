import type { MetadataRoute } from "next";

const routes = [
  { path: "/", priority: 1, changeFrequency: "weekly" as const },
  { path: "/simulator", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/vault", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/legal-guard", priority: 0.8, changeFrequency: "monthly" as const },
  {
    path: "/notification-settings",
    priority: 0.6,
    changeFrequency: "monthly" as const,
  },
] as const;

function getBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "https://scholarship-rem.vercel.app";
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getBaseUrl();
  const lastModified = new Date();

  return routes.map(({ path, priority, changeFrequency }) => ({
    url: `${baseUrl}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
