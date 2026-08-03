'use client';

import { motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import FlameReviewSection, { type FlameReviewItem } from '@/components/FlameReviewSection';
import { getCreatorReviews, submitCreatorReview, type CreatorReviewData } from '@/lib/actions/ofCreatorProfile';

interface FlameReviewModalProps {
  entityName: string;
  slug: string;
  loginRedirectPath: string;
  onClose: () => void;
}

function toFlameItems(reviews: CreatorReviewData[]): FlameReviewItem[] {
  return reviews.map((r) => ({
    authorName: r.authorName,
    authorAvatar: r.authorAvatar,
    rating: r.rating,
    text: r.content,
    createdAt: r.createdAt
      ? new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '',
  }));
}

export default function FlameReviewModal({ entityName, slug, loginRedirectPath, onClose }: FlameReviewModalProps) {
  const [reviews, setReviews] = useState<CreatorReviewData[]>([]);
  const [flameKey, setFlameKey] = useState(0);

  const loadReviews = useCallback(async () => {
    const data = await getCreatorReviews(slug);
    setReviews(data.reviews);
    setFlameKey((k) => k + 1);
  }, [slug]);

  useEffect(() => {
    loadReviews().catch(() => {});
  }, [loadReviews]);

  const handleSubmit = async (rating: number, text: string) => {
    const token = localStorage.getItem('token') || '';
    await submitCreatorReview(slug, rating, text, token);
    return 'Your rating is live!';
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-black/50 text-white text-xl font-bold hover:bg-black/70 transition"
          aria-label="Close"
        >
          ✕
        </button>
        <FlameReviewSection
          key={flameKey}
          entityName={entityName}
          reviews={toFlameItems(reviews)}
          loginHref={`/login?redirect=${encodeURIComponent(loginRedirectPath)}`}
          onSubmit={handleSubmit}
          onSubmitted={loadReviews}
          requireText={false}
          successTitle="Your rating is live!"
          successSubtitle={`Thanks for rating ${entityName}`}
        />
      </motion.div>
    </div>
  );
}
