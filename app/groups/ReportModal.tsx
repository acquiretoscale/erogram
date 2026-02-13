'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import axios from 'axios';

interface Group {
  _id: string;
  name: string;
  category: string;
  country: string;
}

interface ReportModalProps {
  group: Group;
  onClose: () => void;
}

export default function ReportModal({ group, onClose }: ReportModalProps) {
  const [reportForm, setReportForm] = useState({
    reason: '',
    customReason: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reportReasons = [
    'Spam',
    'Inappropriate Content',
    'Fake Group',
    'Harassment',
    'Group isn\'t available',
    'Group contains illegal content',
    'Other'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await axios.post('/api/reports', {
        groupId: group._id,
        reason: reportForm.reason,
        customReason: reportForm.reason === 'Other' ? reportForm.customReason : undefined
      });

      alert('Report submitted successfully! Thank you for helping keep our community safe.');
      onClose();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass rounded-3xl shadow-2xl p-8 max-w-md w-full border border-white/10"
      >
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 opacity-5 rounded-3xl"></div>

        <div className="relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-200 text-3xl font-bold transition hover:scale-110 z-10">
            ✕
          </button>

          <div className="text-center mb-6">
            <h2 className="text-3xl font-black gradient-text mb-2">
              🚨 Report Group
            </h2>
            <p className="text-[#999] text-sm">Help us maintain a safe community</p>
          </div>

          <div className="mb-4 p-4 bg-white/5 rounded-xl border border-white/10">
            <h3 className="text-lg font-semibold text-[#f5f5f5] mb-2">{group.name}</h3>
            <p className="text-sm text-gray-400">{group.category} • {group.country}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[#999] mb-3">Reason for reporting</label>
              <div className="space-y-2">
                {reportReasons.map((reason) => (
                  <label key={reason} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="reason"
                      value={reason}
                      checked={reportForm.reason === reason}
                      onChange={(e) => setReportForm({ ...reportForm, reason: e.target.value })}
                      className="w-4 h-4 text-[#b31b1b] bg-white/5 border-white/20 focus:ring-[#b31b1b]"
                    />
                    <span className="text-[#f5f5f5] text-sm">{reason}</span>
                  </label>
                ))}
              </div>
            </div>

            {reportForm.reason === 'Other' && (
              <div>
                <label className="block text-sm font-semibold text-[#999] mb-2">Please describe the issue</label>
                <textarea
                  value={reportForm.customReason}
                  onChange={(e) => setReportForm({ ...reportForm, customReason: e.target.value })}
                  className="w-full p-3 border border-white/20 rounded-lg bg-white/5 text-[#f5f5f5] placeholder:text-gray-500 focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none resize-none"
                  rows={3}
                  placeholder="Please provide details about why you're reporting this group..."
                  required
                />
              </div>
            )}

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting || !reportForm.reason}
                className="w-full bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold py-3 px-6 rounded-xl hover:from-red-600 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '⏳ Submitting...' : '🚨 Submit Report'}
              </button>
            </div>
          </form>

          <p className="text-xs text-gray-500 mt-4 text-center">
            Reports are anonymous and help us maintain community standards.
          </p>
        </div>
      </motion.div>
    </div>
  );
}