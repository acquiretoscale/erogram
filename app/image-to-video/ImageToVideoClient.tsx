'use client';

import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import { ImageIcon, Loader2, Upload, Video } from 'lucide-react';
import {
  listAiToolGenerations,
  pollWavespeedImageToVideo,
  saveAiToolGeneration,
  submitWavespeedImageEdit,
  submitWavespeedImageToVideo,
  uploadImageToVideoSource,
} from '@/lib/actions/wavespeedImageToVideo';
import type { VideoModel } from '@/lib/imageToVideo/types';
import { getAuthToken, getImageToVideoClientId } from './clientId';
import GenerationLoadingOverlay from './GenerationLoadingOverlay';

type Phase = 'idle' | 'uploading' | 'generating' | 'done' | 'error';
type Mode = 'image' | 'video';
type Quality = '480p' | '720p' | '1080p';

const QUALITY_OPTIONS: Quality[] = ['480p', '720p', '1080p'];
const CURRENT_DURATION_OPTIONS = Array.from({ length: 18 }, (_, i) => i + 3);
const CHEAP_DURATION_OPTIONS = [5, 8];
const MAX_UPLOAD_EDGE = 1920;

async function compressImageForUpload(file: File): Promise<File> {
  if (file.size <= 900 * 1024) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_UPLOAD_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', 0.85);
  });
  bitmap.close();
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
}

const selectClass =
  'w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-[#00AFF0]/40';

const modeBtnBase =
  'flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-black uppercase tracking-wider transition-colors';
const modeBtnOn = 'bg-[#00AFF0] text-white';
const modeBtnOff = 'text-white/60 hover:text-white';

export default function ImageToVideoClient() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<Mode>('image');
  const [videoModel, setVideoModel] = useState<VideoModel>('cheap');
  const [quality, setQuality] = useState<Quality>('480p');
  const [duration, setDuration] = useState(5);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState('');
  const [resultUrl, setResultUrl] = useState('');
  const [resultKind, setResultKind] = useState<'image' | 'video' | null>(null);
  const generating = phase === 'uploading' || phase === 'generating';

  const resetOutput = () => {
    setResultUrl('');
    setResultKind(null);
    setError('');
    setStatusText('');
    setPhase('idle');
  };

  const onSelectMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    resetOutput();
  };

  const onSelectVideoModel = (next: VideoModel) => {
    if (next === videoModel) return;
    setVideoModel(next);
    if (next === 'cheap') {
      setQuality('480p');
      setDuration((d) => (CHEAP_DURATION_OPTIONS.includes(d) ? d : 5));
    }
    resetOutput();
  };

  const onFileChange = (file: File | null) => {
    if (!file) return;
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      setError('Use JPG or PNG.');
      return;
    }
    resetOutput();
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const pollUntilDone = useCallback(async (pollUrl: string) => {
    for (let i = 0; i < 120; i += 1) {
      const result = await pollWavespeedImageToVideo(pollUrl);
      if (result.status === 'completed' && result.outputUrl) {
        return result.outputUrl;
      }
      if (result.status === 'failed' || result.status === 'cancelled' || result.status === 'timeout') {
        throw new Error(result.error || 'Generation failed.');
      }
      setStatusText(result.status === 'processing' ? 'Generating...' : 'Queued...');
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    throw new Error('Timed out waiting for the result.');
  }, []);

  const onGenerate = async () => {
    if (!selectedFile) {
      setError('Upload an image first.');
      return;
    }
    if (mode === 'image' && !prompt.trim()) {
      setError('Write a prompt first.');
      return;
    }

    setError('');
    setResultUrl('');
    setResultKind(null);
    setPhase('uploading');
    setStatusText('Uploading image...');

    try {
      const fd = new FormData();
      fd.set('file', await compressImageForUpload(selectedFile));
      const upload = await uploadImageToVideoSource(fd);
      if (upload.error || !upload.url) throw new Error(upload.error || 'Upload failed.');

      setPhase('generating');
      setStatusText('Starting generation...');
      const submit =
        mode === 'image'
          ? await submitWavespeedImageEdit(upload.url, prompt)
          : await submitWavespeedImageToVideo(
              upload.url,
              prompt,
              quality,
              duration,
              'tuned',
              videoModel,
            );
      if (submit.error || !submit.resultUrl) throw new Error(submit.error || 'Submit failed.');

      const url = await pollUntilDone(submit.resultUrl);
      setResultUrl(url);
      setResultKind(mode);
      setPhase('done');
      setStatusText('Done.');

      void saveAiToolGeneration({
        clientId: getImageToVideoClientId(),
        token: getAuthToken(),
        mode,
        videoModel: mode === 'video' ? videoModel : null,
        sourceImageUrl: upload.url,
        outputUrl: url,
        prompt,
        quality: mode === 'video' ? quality : '',
        duration: mode === 'video' ? duration : null,
      });
    } catch (e: unknown) {
      setPhase('error');
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    }
  };

  return (
    <>
      {generating && previewUrl ? (
        <GenerationLoadingOverlay
          imageUrl={previewUrl}
          mode={mode}
          phase={phase === 'uploading' ? 'uploading' : 'generating'}
          videoModel={videoModel}
        />
      ) : null}

    <div className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#00AFF0]/10 text-[#00AFF0] border border-[#00AFF0]/25 mb-4">
          <Video className="w-3.5 h-3.5" />
          AI Tool
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-3">
          Image to Video
        </h1>
        <p className="text-white/60 text-sm sm:text-base max-w-xl mx-auto">
          Upload a photo and turn it into a video.
        </p>
        <Link
          href="/image-to-video/archive"
          className="inline-block mt-4 text-sm font-semibold text-[#00AFF0] hover:underline"
        >
          View archive
        </Link>
      </div>

      <div className="flex p-1 rounded-xl border border-white/10 bg-black/30 mb-5">
        <button
          type="button"
          disabled={generating}
          onClick={() => onSelectMode('image')}
          className={`${modeBtnBase} ${mode === 'image' ? modeBtnOn : modeBtnOff}`}
        >
          <ImageIcon className="w-4 h-4" />
          Image
        </button>
        <button
          type="button"
          disabled={generating}
          onClick={() => onSelectMode('video')}
          className={`${modeBtnBase} ${mode === 'video' ? modeBtnOn : modeBtnOff}`}
        >
          <Video className="w-4 h-4" />
          Video
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6 space-y-5">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-2">
            Source image
          </label>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full min-h-[220px] rounded-xl border-2 border-dashed border-[#00AFF0]/30 bg-[#00AFF0]/5 hover:border-[#00AFF0]/50 transition-colors flex flex-col items-center justify-center gap-3 text-white/70"
          >
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Preview" className="max-h-64 rounded-lg object-contain" />
            ) : (
              <>
                <Upload className="w-8 h-8 text-[#00AFF0]" />
                <span className="text-sm font-semibold">Click to upload JPG or PNG</span>
              </>
            )}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            className="hidden"
            onChange={(e) => onFileChange(e.target.files?.[0] || null)}
          />
        </div>

        {mode === 'video' ? (
          <>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-2">
                Model
              </label>
              <div className="flex p-1 rounded-xl border border-white/10 bg-black/30">
                <button
                  type="button"
                  disabled={generating}
                  onClick={() => onSelectVideoModel('cheap')}
                  className={`${modeBtnBase} ${videoModel === 'cheap' ? modeBtnOn : modeBtnOff}`}
                >
                  Cheap ($0.05)
                </button>
                <button
                  type="button"
                  disabled={generating}
                  onClick={() => onSelectVideoModel('current')}
                  className={`${modeBtnBase} ${videoModel === 'current' ? modeBtnOn : modeBtnOff}`}
                >
                  Current ($0.10)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="quality" className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-2">
                  Quality
                </label>
                <select
                  id="quality"
                  value={quality}
                  disabled={generating || videoModel === 'cheap'}
                  onChange={(e) => setQuality(e.target.value as Quality)}
                  className={selectClass}
                >
                  {QUALITY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="duration" className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-2">
                  Duration
                </label>
                <select
                  id="duration"
                  value={duration}
                  disabled={generating}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className={selectClass}
                >
                  {(videoModel === 'cheap' ? CHEAP_DURATION_OPTIONS : CURRENT_DURATION_OPTIONS).map(
                    (seconds) => (
                      <option key={seconds} value={seconds}>
                        {seconds} seconds
                      </option>
                    ),
                  )}
                </select>
              </div>
            </div>
          </>
        ) : null}

        <div>
          <label htmlFor="prompt" className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-2">
            {mode === 'image' ? 'Prompt' : 'Motion prompt (optional)'}
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder={mode === 'image' ? 'Describe the edit you want...' : 'Describe the motion you want...'}
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#00AFF0]/40"
          />
        </div>

        <button
          type="button"
          onClick={onGenerate}
          disabled={!selectedFile || generating || (mode === 'image' && !prompt.trim())}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-[#00AFF0] to-[#00D4FF] text-white text-sm font-black uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {phase === 'uploading' || phase === 'generating' ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              {statusText || 'Working...'}
            </span>
          ) : mode === 'image' ? (
            'Generate image'
          ) : (
            `Generate ${duration}s video`
          )}
        </button>

        {error ? (
          <p className="text-sm text-red-400 font-medium">{error}</p>
        ) : null}

        {resultUrl ? (
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-white/70">Result</p>
            {resultKind === 'image' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={resultUrl} alt="Result" className="w-full rounded-xl border border-white/10 bg-black object-contain" />
            ) : (
              <video
                src={resultUrl}
                controls
                playsInline
                className="w-full rounded-xl border border-white/10 bg-black"
              />
            )}
            <a
              href={resultUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm font-semibold text-[#00AFF0] hover:underline"
            >
              {resultKind === 'image' ? 'Open image in new tab' : 'Open video in new tab'}
            </a>
          </div>
        ) : null}
      </div>
    </div>
    </>
  );
}
