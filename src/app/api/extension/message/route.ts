import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateLinkedInMessage } from "@/lib/linkedin-message";
import { verifyExtensionKey, corsPreflight, CORS_HEADERS } from "@/lib/extension-auth";

export const runtime = "nodejs";
export const maxDuration = 30;

const schema = z.object({
  name: z.string().min(2).max(160),
  title: z.string().max(200).optional(),
  company: z.string().max(200).optional(),
});

export function OPTIONS() {
  return corsPreflight();
}

export async function POST(req: NextRequest) {
  const authError = verifyExtensionKey(req);
  if (authError) return authError;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "JSON invalid" },
      { status: 400, headers: CORS_HEADERS },
    );
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Date invalide" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  try {
    const message = await generateLinkedInMessage(parsed.data);
    return NextResponse.json({ ok: true, message }, { headers: CORS_HEADERS });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Eroare la generare" },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
