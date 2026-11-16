import { NextRequest, NextResponse } from "next/server";
import { verifyExtensionKey } from "@/lib/extension-auth";
import { startcoFetch } from "@/lib/startco";

export const dynamic = "force-dynamic";

/**
 * 16.11.2026 — facturile din StartCo, DOAR CITIRE (proprietarul: „vezi la facturi, totul").
 * Trece doar GET pe /developer/invoice (lista sau o factura), cu parametrii din adresa.
 *   GET /api/extension/facturi?cale=/developer/invoice&page=1   (x-api-key)
 */
export async function GET(req: NextRequest) {
  const neautorizat = verifyExtensionKey(req);
  if (neautorizat) return neautorizat;
  const sp = new URLSearchParams(req.nextUrl.searchParams);
  const cale = sp.get("cale") || "/developer/invoice";
  sp.delete("cale");
  if (!/^\/developer\/invoice(\/\d+)?$/.test(cale)) {
    return NextResponse.json({ ok: false, error: "cale nepermisa" }, { status: 400 });
  }
  const qs = sp.toString();
  try {
    const r = await startcoFetch<unknown>(`${cale}${qs ? `?${qs}` : ""}`, { method: "GET" });
    return NextResponse.json({ ok: true, date: r });
  } catch (e) {
    const err = e as { message?: string; code?: string; status?: number };
    return NextResponse.json({ ok: false, error: err.message, code: err.code, status: err.status });
  }
}
