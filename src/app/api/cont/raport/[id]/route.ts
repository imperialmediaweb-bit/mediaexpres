import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { publicationReports } from "@/db/schema";
import { buildReportXlsx, buildReportPdf, type ReportEntry } from "@/lib/report-files";
import { SITE } from "@/data/site";

export const runtime = "nodejs";

/** Rapoartele vechi contin string[]; cele noi obiecte {url, title}. */
function parseEntries(raw: string): ReportEntry[] {
  try {
    const arr = JSON.parse(raw || "[]") as unknown[];
    return arr
      .map((x) =>
        typeof x === "string"
          ? { url: x }
          : (x as { url?: string })?.url
            ? { url: (x as { url: string }).url, title: (x as { title?: string }).title }
            : null,
      )
      .filter((x): x is ReportEntry => x !== null);
  } catch {
    return [];
  }
}

function safeName(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 60) || "raport"
  );
}

/**
 * Descarcarea raportului din contul clientului, ca .xlsx sau .pdf.
 * Raportul e legat de EMAIL (poate fi emis inainte ca omul sa aiba cont
 * activat), deci autorizarea verifica emailul sesiunii, nu un userId.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) {
    return NextResponse.json({ ok: false, error: "Neautentificat" }, { status: 401 });
  }

  const [report] = await db
    .select()
    .from(publicationReports)
    .where(and(eq(publicationReports.id, params.id), eq(publicationReports.email, email)))
    .limit(1);

  if (!report) {
    return NextResponse.json({ ok: false, error: "Raportul nu există" }, { status: 404 });
  }

  const entries = parseEntries(report.links);
  const format = req.nextUrl.searchParams.get("format") === "pdf" ? "pdf" : "xlsx";
  const base = `raport-${safeName(report.articleTitle || "publicare")}`;

  if (format === "pdf") {
    const pdf = buildReportPdf({
      entries,
      clientName: report.clientName,
      articleTitle: report.articleTitle,
      date: new Date(report.createdAt),
      siteName: SITE.name,
      siteUrl: SITE.domain,
    });
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${base}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  const xlsx = buildReportXlsx({
    entries,
    clientName: report.clientName,
    articleTitle: report.articleTitle,
    date: new Date(report.createdAt),
  });
  return new NextResponse(new Uint8Array(xlsx), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${base}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}
