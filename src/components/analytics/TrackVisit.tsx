"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const VISITOR_COOKIE = "me_vid";

/** A random value with no meaning outside this browser, so a refresh is not a second visitor. */
function visitorId(): string | null {
  try {
    const found = document.cookie.match(/(?:^|;\s*)me_vid=([^;]+)/);
    if (found?.[1]) return decodeURIComponent(found[1]);

    const id = crypto.randomUUID();
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${VISITOR_COOKIE}=${id}; Path=/; Max-Age=${90 * 86400}; SameSite=Lax${secure}`;
    return id;
  } catch {
    return null;
  }
}

/**
 * Counts an arrival on a page that sells, so a channel that sends people who
 * never order can be told apart from one that sends nobody at all.
 */
export function TrackVisit() {
  const pathname = usePathname();

  useEffect(() => {
    const id = visitorId();
    if (!id) return;
    fetch("/api/track/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname, visitorId: id }),
      keepalive: true,
    }).catch(() => undefined);
  }, [pathname]);

  return null;
}
