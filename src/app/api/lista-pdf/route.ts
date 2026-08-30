import { NextResponse } from "next/server";
import { buildNewspaperListPdf, LIST_PDF_FILENAME } from "@/lib/newspaper-list-pdf";

export const runtime = "nodejs";

/**
 * PDF-ul cu lista retelei.
 *
 * Ruta e deschisa intentionat, desi in pagina se ajunge la ea abia dupa ce
 * omul isi lasa emailul. Ascunderea in spatele unui token n-ar proteja nimic
 * — aceleasi 51 de adrese sunt afisate liber pe /reteaua-noastra — dar ar
 * strica linkul din email a doua zi, cand omul vrea sa-l redeschida. Emailul
 * se cere pentru ca merita cerut, nu pentru ca fisierul ar fi secret.
 */
export async function GET() {
  const pdf = buildNewspaperListPdf();
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${LIST_PDF_FILENAME}"`,
      // Lista se schimba rar; o ora de cache scuteste regenerarea la fiecare
      // click, dar nu tine un ziar nou afara mai mult de-atat.
      "Cache-Control": "public, max-age=3600",
    },
  });
}
