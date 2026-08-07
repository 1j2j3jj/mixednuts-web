export type ChakinCvSource = "graphene" | "ga4" | "media";

export function normalizeChakinCvSource(cv: string | null | undefined): ChakinCvSource {
  if (cv === "ga4") return "ga4";
  if (cv === "media") return "media";
  return "graphene";
}

export function readChakinCvSource(sp: { cv?: string }): ChakinCvSource {
  return normalizeChakinCvSource(sp.cv);
}
