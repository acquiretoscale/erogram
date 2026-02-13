'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import axios from 'axios';

interface Group {
  _id: string;
  name: string;
  averageRating?: number;
  reviewCount?: number;
}

interface ReviewModalProps {
  group: Group;
  reviews: any[];
  onClose: () => void;
  onSubmitReview: (data: { rating: number; content: string; authorName: string }) => void;
}

export default function ReviewModal({ group, reviews, onClose, onSubmitReview }: ReviewModalProps) {
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    content: '',
    authorName: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onSubmitReview(reviewForm);
      setReviewForm({ rating: 5, content: '', authorName: '' });
    } catch (error) {
      // Error handled in parent
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < rating ? 'text-yellow-400' : 'text-gray-400'}>
        ⭐
      </span>
    ));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass rounded-3xl shadow-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-white/10"
      >
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-5 rounded-3xl"></div>

        <div className="relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-200 text-3xl font-bold transition hover:scale-110 z-10">
            ✕
          </button>

          <div className="text-center mb-8">
            <h2 className="text-4xl font-black gradient-text mb-2">
              💬 Reviews for {group.name}
            </h2>
            <div className="flex items-center justify-center gap-2 mt-4">
              <div className="flex gap-1">
                {Array.from({ length: 5 }, (_, i) => (
                  <span key={i} className={i < Math.round(group.averageRating || 0) ? 'text-yellow-400' : 'text-gray-400'}>
                    ⭐
                  </span>
                ))}
              </div>
              <span className="text-[#999] text-lg">
                ({group.reviewCount || 0} reviews)
              </span>
            </div>
          </div>

          {/* Write Review Form */}
          <div className="mb-8 p-6 bg-white/5 rounded-2xl border border-white/10">
            <h3 className="text-xl font-bold text-[#f5f5f5] mb-4">Write a Review</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#999] mb-2">Rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                      className="text-2xl hover:scale-110 transition-transform"
                    >
                      {star <= reviewForm.rating ? '⭐' : '☆'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#999] mb-2">Your Name (Optional)</label>
                <input
                  type="text"
                  value={reviewForm.authorName}
                  onChange={(e) => setReviewForm({ ...reviewForm, authorName: e.target.value })}
                  className="w-full p-3 border border-white/20 rounded-lg bg-white/5 text-[#f5f5f5] placeholder:text-gray-500 focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none"
                  placeholder="Anonymous"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#999] mb-2">Review</label>
                <textarea
                  value={reviewForm.content}
                  onChange={(e) => setReviewForm({ ...reviewForm, content: e.target.value })}
                  rows={4}
                  className="w-full p-3 border border-white/20 rounded-lg bg-white/5 text-[#f5f5f5] placeholder:text-gray-500 focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none"
                  placeholder="Share your experience..."
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white font-bold py-3 px-6 rounded-xl hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '⏳ Submitting...' : '✨ Submit Review'}
              </button>
            </form>
          </div>

          {/* Reviews List */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-[#f5f5f5] mb-4">Community Reviews</h3>
            {reviews.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📝</div>
                <p className="text-[#999]">No reviews yet. Be the first to share your experience!</p>
              </div>
            ) : (
              reviews.map((review, index) => (
                <motion.div
                  key={review._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 bg-white/5 rounded-lg border border-white/10"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#f5f5f5]">{review.authorName || 'Anonymous'}</span>
                      <div className="flex gap-1">
                        {renderStars(review.rating)}
                      </div>
                    </div>
                    <span className="text-sm text-[#999]">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-[#999] leading-relaxed">{review.content}</p>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}