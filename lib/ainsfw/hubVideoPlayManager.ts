const active = new Map<string, HTMLVideoElement>();

export function requestHubVideoPlay(id: string, video: HTMLVideoElement): void {
  active.set(id, video);
  void video.play().catch(() => {});
}

export function releaseHubVideoPlay(id: string): void {
  if (!active.has(id)) return;
  active.get(id)?.pause();
  active.delete(id);
}
