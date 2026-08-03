export type ProfileGridDensity = 1 | 2 | 3;

export type LikesGridDensity = 3 | 6;

export const PROFILE_GRID_DENSITY_KEY = 'profile_grid_density';
export const LIKES_GRID_DENSITY_KEY = 'profile_likes_grid_density';

export function loadProfileGridDensity(): ProfileGridDensity {
  if (typeof window === 'undefined') return 2;
  const raw = localStorage.getItem(PROFILE_GRID_DENSITY_KEY);
  const n = Number(raw);
  if (n === 1 || n === 2 || n === 3) return n;
  return 2;
}

export function loadLikesGridDensity(): LikesGridDensity {
  if (typeof window === 'undefined') return 6;
  const raw = localStorage.getItem(LIKES_GRID_DENSITY_KEY);
  const n = Number(raw);
  if (n === 3 || n === 6) return n;
  if (n === 9) return 6;
  return 6;
}

export function saveProfileGridDensity(density: ProfileGridDensity) {
  localStorage.setItem(PROFILE_GRID_DENSITY_KEY, String(density));
}

export function saveLikesGridDensity(density: LikesGridDensity) {
  localStorage.setItem(LIKES_GRID_DENSITY_KEY, String(density));
}

export function profileGridClass(density: ProfileGridDensity): string {
  if (density === 1) return 'grid-cols-1 lg:grid-cols-4';
  if (density === 3) return 'grid-cols-4 lg:grid-cols-8';
  return 'grid-cols-2 lg:grid-cols-6';
}

export function likesGridClass(density: LikesGridDensity): string {
  if (density === 3) return 'grid-cols-3';
  return 'grid-cols-3 sm:grid-cols-6';
}

export function profileGridGapClass(density: ProfileGridDensity): string {
  return density === 3 ? 'gap-2' : 'gap-3';
}

export function likesGridGapClass(_density: LikesGridDensity): string {
  return 'gap-3';
}

export const PROFILE_GRID_DENSITY_SPECS: Record<ProfileGridDensity, { mobile: number; desktop: number }> = {
  1: { mobile: 1, desktop: 4 },
  2: { mobile: 2, desktop: 6 },
  3: { mobile: 4, desktop: 8 },
};
