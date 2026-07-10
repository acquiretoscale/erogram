export const HUB_SLUG_TRANSLATIONS: Record<string, { de?: string; es?: string; pt?: string }> = {
  "best-onlyfans-accounts": { de: "beste-onlyfans-accounts", es: "mejores-cuentas-onlyfans", pt: "melhores-contas-onlyfans" },
  "best-telegram-groups": { de: "beste-telegram-gruppen", es: "mejores-grupos-telegram", pt: "melhores-grupos-telegram" },
};
export function getLocalizedHubSegment(hubKey: string, locale: 'de' | 'es' | 'pt'): string | null {
  return HUB_SLUG_TRANSLATIONS[hubKey]?.[locale] ?? null;
}

export function resolveHubKeyFromPublicSegment(segment: string): string | null {
  if (HUB_SLUG_TRANSLATIONS[segment]) return segment;
  for (const [key, tr] of Object.entries(HUB_SLUG_TRANSLATIONS)) {
    if (tr.de === segment || tr.es === segment || tr.pt === segment) return key;
  }
  return null;
}
