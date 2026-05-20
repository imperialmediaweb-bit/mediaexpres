import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { prospects } from "@/db/schema";
import { verifyProspectToken } from "@/lib/prospect-token";

export const runtime = "nodejs";

// 1x1 transparent GIF
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (token) {
    const decoded = verifyProspectToken(token);
    if (decoded) {
      const [prospect] = await db
        .select({ id: prospects.id, viewCount: prospects.viewCount, firstViewedAt: prospects.firstViewedAt, status: prospects.status })
        .from(prospects)
        .where(eq(prospects.id, decoded.prospectId))
        .limit(1);
      if (prospect) {
        db.update(prospects)
          .set({
            viewCount: (prospect.viewCount ?? 0) + 1,
            firstViewedAt: prospect.firstViewedAt ?? new Date(),
            lastViewedAt: new Date(),
            status: prospect.status === "new" || prospect.status === "contacted" ? "opened" : prospect.status,
            updatedAt: new Date(),
          })
          .where(eq(prospects.id, prospect.id))
          .catch(() => {});
      }
    }
  }

  return new NextResponse(PIXEL, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
    },
  });
}
