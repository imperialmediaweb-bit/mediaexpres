import { redirect } from "next/navigation";
import { findPackageById } from "@/data/packages";

/**
 * 08.10.2026 — formularul vechi de comanda (nume, email, telefon) nu cerea
 * poze, CUI sau adresa: comanda lui Florin a venit fara date de factura si
 * fara poze. Toate comenzile prin OP merg acum pe formularul complet,
 * /comanda/transfer, cu pachetul ales; fara pachet valid, pe oferta.
 */
export default function ComandaPage({ searchParams }: { searchParams?: { pachet?: string } }) {
  const pachet = searchParams?.pachet;
  if (pachet && findPackageById(pachet)) redirect(`/comanda/transfer?pachet=${encodeURIComponent(pachet)}`);
  redirect("/oferta-500");
}
