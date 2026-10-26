"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { SOURCE_COOKIE, SOURCE_DAYS, serializeSource, sourceFromCookieHeader, sourceFromUrl } from "@/lib/sursa";

/** Remembers in a cookie where the visitor came from (see lib/source.ts). Renders nothing. */
export function SourceCapture() {
  const pathname = usePathname();

  useEffect(() => {
    try {
      const found = sourceFromUrl(window.location.search, document.referrer);
      if (!found) return;
      const existing = sourceFromCookieHeader(document.cookie);
      if (existing && !found.overwrite) return;
      const value = serializeSource(found.source);
      if (value === existing) return;
      const secure = window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${SOURCE_COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=${
        SOURCE_DAYS * 86400
      }; SameSite=Lax${secure}`;
    } catch {
      /* cookies blocked — ordering still works */
    }
  }, [pathname]);

  return null;
}
