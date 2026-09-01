export type VideoModel = 'cheap' | 'current';

export type AiToolGenerationRecord = {
  id: string;
  mode: 'image' | 'video';
  videoModel: VideoModel | null;
  sourceImageUrl: string;
  outputUrl: string;
  prompt: string;
  quality: string;
  duration: number | null;
  createdAt: string;
};
