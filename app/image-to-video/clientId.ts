const STORAGE_KEY = 'image-to-video-client-id';

export function getImageToVideoClientId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `iv-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}
