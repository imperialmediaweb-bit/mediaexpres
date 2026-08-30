import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getCloudinaryConfig, signUploadParams } from "@/lib/cloudinary";

export const runtime = "nodejs";

/**
 * Testul care raspunde la "de ce nu pot clientii sa adauge poze".
 *
 * Pana acum, cand Cloudinary refuza o incarcare, mesajul lui in engleza aparea
 * o clipa pe ecranul clientului si disparea. Nimic nu ajungea in log si nimic
 * la noi — asa s-a putut intampla ca trei clienti la rand sa nu reuseasca, iar
 * noi sa aflam abia cand ne-au spus.
 *
 * Ruta face exact ce face browserul clientului: semneaza cu aceleasi chei si
 * urca un PNG de 1x1. Daca ceva e stricat, raspunsul spune CE si CUM se repara
 * — nu doar ca "a esuat".
 */

// PNG transparent 1x1, cel mai mic fisier valid pe care il putem trimite.
const PIXEL_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

export async function GET() {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Neautentificat" }, { status: 401 });
  }

  const cfg = getCloudinaryConfig();
  if (!cfg) {
    const lipsa = [
      ["CLOUDINARY_CLOUD_NAME", process.env.CLOUDINARY_CLOUD_NAME],
      ["CLOUDINARY_API_KEY", process.env.CLOUDINARY_API_KEY],
      ["CLOUDINARY_API_SECRET", process.env.CLOUDINARY_API_SECRET],
    ]
      .filter(([, v]) => !v?.trim())
      .map(([k]) => k);
    return NextResponse.json({
      ok: false,
      cauza: "Cloudinary nu e configurat",
      lipsesc: lipsa,
      deFacut:
        "Adaugă variabilele lipsă în Railway → proiect → serviciul web → Variables, apoi redeploy.",
    });
  }

  // Spatiile invizibile sunt cea mai frecventa cauza si singura pe care o poti
  // vedea doar comparand lungimile: raportam daca valoarea bruta difera de cea
  // curatata, fara sa scriem vreodata secretul in raspuns.
  const spatiiInPlus = (
    [
      ["CLOUDINARY_CLOUD_NAME", process.env.CLOUDINARY_CLOUD_NAME],
      ["CLOUDINARY_API_KEY", process.env.CLOUDINARY_API_KEY],
      ["CLOUDINARY_API_SECRET", process.env.CLOUDINARY_API_SECRET],
      ["CLOUDINARY_FOLDER", process.env.CLOUDINARY_FOLDER],
    ] as [string, string | undefined][]
  )
    .filter(([, v]) => v !== undefined && v !== v.trim())
    .map(([k]) => k);

  const folder = `${cfg.uploadFolder}/diagnostic`;
  const timestamp = Math.floor(Date.now() / 1000);
  const signed = signUploadParams({ timestamp, folder });

  const fd = new FormData();
  fd.append("file", `data:image/png;base64,${PIXEL_PNG_BASE64}`);
  fd.append("api_key", cfg.apiKey);
  fd.append("timestamp", String(timestamp));
  fd.append("folder", folder);
  fd.append("signature", signed!.signature);

  let status = 0;
  let raspuns: unknown = null;
  try {
    const r = await fetch(`https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/upload`, {
      method: "POST",
      body: fd,
    });
    status = r.status;
    raspuns = await r.json();
  } catch (err) {
    return NextResponse.json({
      ok: false,
      cauza: "Serverul nu ajunge la Cloudinary (rețea sau DNS)",
      detaliu: err instanceof Error ? err.message : String(err),
    });
  }

  const mesaj =
    (raspuns as { error?: { message?: string } })?.error?.message || null;
  const url = (raspuns as { secure_url?: string })?.secure_url || null;

  if (url) {
    return NextResponse.json({
      ok: true,
      concluzie: "Încărcarea funcționează. Cheile și semnătura sunt corecte.",
      cloudName: cfg.cloudName,
      folder,
      urlTest: url,
      spatiiInPlus,
    });
  }

  // Traducem cele doua refuzuri care chiar apar, ca sa nu ramana un mesaj in
  // engleza fara indicatie de rezolvare.
  let deFacut = "Vezi mesajul de la Cloudinary de mai jos.";
  if (/invalid signature/i.test(mesaj || "")) {
    deFacut =
      "Semnătura e greșită — aproape sigur CLOUDINARY_API_SECRET are un spațiu sau un enter în plus, ori e cheia altui cont. Recopiaz-o din Cloudinary → Settings → API Keys și redeploy.";
  } else if (/(quota|limit|usage)/i.test(mesaj || "")) {
    deFacut = "Contul Cloudinary a atins limita planului. Eliberează spațiu sau treci pe alt plan.";
  } else if (status === 401 || status === 403) {
    deFacut = "Cloudinary refuză cheile. Verifică CLOUDINARY_API_KEY și CLOUDINARY_CLOUD_NAME.";
  }

  return NextResponse.json({
    ok: false,
    concluzie: "Clienții NU pot încărca poze — Cloudinary refuză.",
    status,
    mesajCloudinary: mesaj,
    deFacut,
    cloudName: cfg.cloudName,
    folder,
    spatiiInPlus,
  });
}
