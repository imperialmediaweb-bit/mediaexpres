/** Porneste planificatorul intern al cronurilor (src/planificator.ts), doar pe Node. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { pornestePlanificator } = await import("./planificator");
    await pornestePlanificator();
  }
}
