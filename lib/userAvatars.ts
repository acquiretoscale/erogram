/** Preset Erogram user avatars on R2 (500px max webp). */
export const PRESET_AVATAR_COUNT = 15;

export function presetAvatarKey(id: number): string {
  return `avatars/presets/erogramx-user${id}.webp`;
}

export function randomPresetAvatarId(): number {
  return Math.floor(Math.random() * PRESET_AVATAR_COUNT) + 1;
}

export function presetAvatarUrlForId(id: number): string {
  const base = process.env.R2_PUBLIC_URL;
  if (base) return `${base.replace(/\/$/, '')}/${presetAvatarKey(id)}`;
  return `/assets/avatars/erogramx-user${id}.webp`;
}

export function randomPresetAvatarUrl(): string {
  return presetAvatarUrlForId(randomPresetAvatarId());
}

export function isPresetAvatarUrl(url: string | null | undefined, r2Base?: string): boolean {
  if (!url) return false;
  for (let i = 1; i <= PRESET_AVATAR_COUNT; i++) {
    const key = presetAvatarKey(i);
    if (url.endsWith(key) || url.endsWith(`/assets/avatars/erogramx-user${i}.webp`)) return true;
    if (r2Base && url === `${r2Base}/${key}`) return true;
  }
  return false;
}

export function presetAvatarIdFromUrl(url: string | null | undefined, r2Base?: string): number | null {
  if (!url) return null;
  for (let i = 1; i <= PRESET_AVATAR_COUNT; i++) {
    const key = presetAvatarKey(i);
    if (url.endsWith(key) || url.endsWith(`/assets/avatars/erogramx-user${i}.webp`)) return i;
    if (r2Base && url === `${r2Base}/${key}`) return i;
  }
  return null;
}
