import type { MetadataRoute } from "next";
import {
  absoluteUrl,
  isPreviewDeployment,
  siteConfig,
} from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  if (isPreviewDeployment) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: siteConfig.url.origin,
  };
}
