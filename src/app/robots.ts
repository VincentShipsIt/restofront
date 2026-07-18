import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/claim/", "/create", "/dashboard", "/preview/"],
      },
    ],
    sitemap: "https://restofront.com/sitemap.xml",
  };
}
