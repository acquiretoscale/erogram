export const HUB_SLUG_TRANSLATIONS: Record<string, { de?: string; es?: string }> = {
  "best-onlyfans-accounts": { de: "beste-onlyfans-accounts", es: "mejores-cuentas-onlyfans" },
  "best-telegram-groups": { de: "beste-telegram-gruppen", es: "mejores-grupos-telegram" },
  "bots": { de: "bots", es: "bots" },
  "groups": { de: "gruppen", es: "grupos" },
  "onlyfanssearch": { de: "onlyfans-suche", es: "onlyfans-busca" },
};
export function getLocalizedHubSegment(hubKey: string, locale: 'de' | 'es'): string | null {
  return HUB_SLUG_TRANSLATIONS[hubKey]?.[locale] ?? null;
}

export function resolveHubKeyFromPublicSegment(segment: string): string | null {
  if (HUB_SLUG_TRANSLATIONS[segment]) return segment;
  for (const [key, tr] of Object.entries(HUB_SLUG_TRANSLATIONS)) {
    if (tr.de === segment || tr.es === segment) return key;
  }
  return null;
}
