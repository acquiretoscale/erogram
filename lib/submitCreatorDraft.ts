export const SUBMIT_CREATOR_DRAFT_KEY = 'submitCreatorDraft';
export const SUBMIT_CREATOR_PLAN_KEY = 'submitCreatorPlan';

export type SubmitCreatorPlan = 'free' | 'boosted';

export type SubmitCreatorDraft = {
  name: string;
  onlyfansUrl: string;
  website: string;
  description: string;
  photoUrls: string[];
  instagram: string;
  twitter: string;
  telegram: string;
  tiktok: string;
  location: string;
  categories: string[];
  price: string;
  submitterType: 'creator' | 'agency';
  lookingForAgency: boolean;
  submitContactMethod: 'telegram' | 'whatsapp';
  submitContactValue: string;
};

export function saveSubmitCreatorPlan(plan: SubmitCreatorPlan) {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(SUBMIT_CREATOR_PLAN_KEY, plan);
  } catch {
    /* quota */
  }
}

export function loadSubmitCreatorPlan(): SubmitCreatorPlan | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SUBMIT_CREATOR_PLAN_KEY);
    if (raw === 'free' || raw === 'boosted') return raw;
    return null;
  } catch {
    return null;
  }
}

export function clearSubmitCreatorPlan() {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.removeItem(SUBMIT_CREATOR_PLAN_KEY);
  } catch {
    /* ok */
  }
}

export function saveSubmitCreatorDraft(draft: SubmitCreatorDraft) {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(SUBMIT_CREATOR_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* quota */
  }
}

export function loadSubmitCreatorDraft(): SubmitCreatorDraft | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SUBMIT_CREATOR_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SubmitCreatorDraft;
  } catch {
    return null;
  }
}

export function clearSubmitCreatorDraft() {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.removeItem(SUBMIT_CREATOR_DRAFT_KEY);
  } catch {
    /* ok */
  }
}
