// Gedeelde helper om een externe aanroep (bv. naar Supabase) na een
// vaste tijd op te geven i.p.v. onbeperkt te laten hangen totdat Vercel
// de aanvraag zelf hardhandig afbreekt met een kale foutpagina. Geeft
// bij een timeout `null` terug — de aanroeper behandelt dat dan als een
// mislukte poging met een vriendelijke foutmelding.
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([promise, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]);
}
