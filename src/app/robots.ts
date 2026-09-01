import type { MetadataRoute } from "next";

/**
 * A private scoreboard has no business in search results. The pages are behind
 * a login anyway, but the sign-in page itself is public and would otherwise be
 * fair game for a crawler.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
