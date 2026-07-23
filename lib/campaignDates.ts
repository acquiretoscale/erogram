/** Mongo filter: campaign end date not passed (null = evergreen / lifetime). */
export function campaignNotExpired(asOf: Date) {
  return { $or: [{ endDate: null }, { endDate: { $gte: asOf } }] };
}

export function isCampaignDateEnded(endDate: string | Date | null | undefined): boolean {
  if (!endDate) return false;
  try {
    return new Date(endDate).getTime() < Date.now();
  } catch {
    return false;
  }
}

export function formatCampaignEndDate(endDate: string | Date | null | undefined): string {
  if (!endDate) return 'Evergreen';
  try {
    return new Date(endDate).toLocaleDateString();
  } catch {
    return '—';
  }
}
