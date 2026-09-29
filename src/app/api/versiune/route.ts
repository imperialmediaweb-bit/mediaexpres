import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PORNIT = new Date().toISOString();

/** Ce versiune ruleaza pe site — ca sa stim sigur ca o reparatie a ajuns. */
export function GET() {
  return NextResponse.json({
    commit: (process.env.RAILWAY_GIT_COMMIT_SHA || "necunoscut").slice(0, 7),
    pornit: PORNIT,
  });
}
