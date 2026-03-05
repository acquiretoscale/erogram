'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import StoryBar from '@/app/groups/StoryBar';
import type { StoryCategory } from '@/app/groups/types';

const StoryViewer = dynamic(() => import('@/app/groups/StoryViewer'), { ssr: false });

const PLACEHOLDER = 'https://placehold.co/400x400/1a1a1a/666?text=';

const MOCK_STORIES: StoryCategory[] = [
  {
    slug: 'erogram',
    label: 'EROGRAM',
    profileImage: '',
    hasNewContent: true,
    verified: true,
    storyType: 'erogram',
    groups: [
      { _id: '1', name: 'New Bot: FlirtBot', slug: 'flirtbot', image: `${PLACEHOLDER}EROS+1`, category: 'Bots', country: '', description: 'The hottest new AI flirt bot', createdAt: new Date().toISOString(), memberCount: 12400 },
      { _id: '2', name: 'New Group: VIP Lounge', slug: 'vip-lounge', image: `${PLACEHOLDER}EROS+2`, category: 'Groups', country: 'US', description: 'Exclusive VIP content', createdAt: new Date(Date.now() - 3600_000).toISOString(), memberCount: 53200 },
    ],
    mediaSlides: [
      { _id: 'ann1', mediaType: 'image', mediaUrl: `${PLACEHOLDER}Announcement`, ctaText: 'Check it out', ctaUrl: '/groups' },
    ],
  },
  {
    slug: 'random-girl-1',
    label: 'Vicky',
    profileImage: '',
    hasNewContent: true,
    storyType: 'random-girl',
    groups: [],
    mediaSlides: [
      { _id: 'rg1-0', mediaType: 'image', mediaUrl: `${PLACEHOLDER}Vicky+1` },
      { _id: 'rg1-1', mediaType: 'image', mediaUrl: `${PLACEHOLDER}Vicky+2` },
    ],
  },
  {
    slug: 'ai-gf',
    label: 'AI GF',
    profileImage: '',
    hasNewContent: true,
    ctaText: 'Try AI Girlfriend',
    ctaUrl: '/bots',
    storyType: 'advert',
    groups: [],
    mediaSlides: [
      { _id: 'ad1', mediaType: 'image', mediaUrl: `${PLACEHOLDER}AI+GF+1`, ctaText: 'Try Now', ctaUrl: '/bots', clientName: 'DreamGF', likes: 42 },
      { _id: 'ad2', mediaType: 'image', mediaUrl: `${PLACEHOLDER}AI+GF+2`, caption: 'Your perfect AI companion awaits', clientName: 'CandyAI', likes: 18 },
    ],
  },
  {
    slug: 'random-girl-2',
    label: 'Carla',
    profileImage: '',
    hasNewContent: true,
    storyType: 'random-girl',
    groups: [],
    mediaSlides: [
      { _id: 'rg2-0', mediaType: 'image', mediaUrl: `${PLACEHOLDER}Carla+1` },
      { _id: 'rg2-1', mediaType: 'image', mediaUrl: `${PLACEHOLDER}Carla+2` },
    ],
  },
];

const STORY_SEEN_KEY = 'dev_story_seen';

export default function DevStoriesPage() {
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [storyViewerIndex, setStoryViewerIndex] = useState(0);
  const [seenStoryMap, setSeenStoryMap] = useState<Record<string, string>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      return JSON.parse(localStorage.getItem(STORY_SEEN_KEY) || '{}');
    } catch { return {}; }
  });

  const markSeen = useCallback((slug: string) => {
    setSeenStoryMap(prev => {
      const next = { ...prev, [slug]: new Date().toISOString() };
      localStorage.setItem(STORY_SEEN_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const handleOpen = useCallback((index: number) => {
    setStoryViewerIndex(index);
    setStoryViewerOpen(true);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="sticky top-0 z-50 bg-[#1a1a1a] border-b border-white/10 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded">DEV</span>
          <span className="text-sm text-white/60">Stories Component Playground (4 circles)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { localStorage.removeItem(STORY_SEEN_KEY); setSeenStoryMap({}); }}
            className="text-xs text-white/40 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors"
          >
            Reset seen state
          </button>
          <a href="/groups" className="text-xs text-blue-400 hover:text-blue-300 bg-blue-400/10 px-3 py-1.5 rounded-lg transition-colors">
            Back to /groups
          </a>
        </div>
      </div>

      <div className="max-w-[800px] mx-auto px-4 pt-6">
        <StoryBar storyData={MOCK_STORIES} seenStoryMap={seenStoryMap} onOpenStory={handleOpen} />

        <div className="mt-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-[#161618] border border-white/[0.06] rounded-xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-white/[0.05] shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-2/3 bg-white/[0.06] rounded" />
                <div className="h-2.5 w-1/2 bg-white/[0.04] rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {storyViewerOpen && (
        <StoryViewer
          storyData={MOCK_STORIES}
          initialCategoryIndex={storyViewerIndex}
          onCategorySeen={markSeen}
          onClose={() => setStoryViewerOpen(false)}
        />
      )}
    </div>
  );
}
