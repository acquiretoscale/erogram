'use client';

import { EditorialMasthead } from '@/app/blog/EditorialChrome';

interface NavbarProps {
  // Kept for backwards-compat with ~40 call sites. Auth is now read internally
  // by the masthead (localStorage + /api/auth/me), so these are no-ops.
  username?: string | null;
  setUsername?: (username: string | null) => void;
  showAddGroup?: boolean;
  onAddGroupClick?: () => void;
  // 'onlyfans' forces the OnlyFans-blue accent; otherwise accent is derived
  // from the current route (OnlyFans pages = blue, everything else = dark red).
  variant?: 'default' | 'onlyfans';
}

/**
 * Global top navigation. This is now a thin fixed-position wrapper around the
 * editorial masthead so every page across Erogram shares the same /blog menu.
 * It preserves the legacy fixed layout (pages still pad with pt-20/24/28).
 */
export default function Navbar({ variant }: NavbarProps) {
  return <EditorialMasthead fixed accent={variant === 'onlyfans' ? '#00AFF0' : undefined} />;
}
