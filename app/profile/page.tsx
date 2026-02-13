'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default function ProfilePage() {
  const [mounted, setMounted] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const storedUsername = localStorage.getItem('username');
    const storedFirstName = localStorage.getItem('firstName');
    const storedPhotoUrl = localStorage.getItem('photoUrl');

    setUsername(storedUsername);
    setFirstName(storedFirstName);
    setPhotoUrl(storedPhotoUrl);
  }, [mounted, router]);

  const handleDeleteProfile = () => {
    // For now, just sign out the user
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('firstName');
    localStorage.removeItem('photoUrl');
    router.push('/');
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#111111]">
      {/* Navigation */}
      <Navbar username={username} setUsername={setUsername} />

      {/* Main Content */}
      <div className="pt-24 px-6">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="glass rounded-2xl p-8 backdrop-blur-lg border border-white/10"
          >
            <div className="text-center mb-8">
              <h1 className="text-3xl sm:text-4xl font-black mb-2 gradient-text">
                Your Profile
              </h1>
              <p className="text-[#999]">
                Manage your account settings
              </p>
            </div>

            {/* Profile Info */}
            <div className="space-y-6 mb-8">
              {photoUrl && (
                <div className="flex justify-center">
                  <img
                    src={photoUrl}
                    alt="Profile"
                    className="w-24 h-24 rounded-full border-2 border-[#b31b1b]"
                  />
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#f5f5f5] mb-1">
                    Username
                  </label>
                  <div className="glass rounded-lg p-3 text-[#f5f5f5]">
                    {username || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#f5f5f5] mb-1">
                    First Name
                  </label>
                  <div className="glass rounded-lg p-3 text-[#f5f5f5]">
                    {firstName || 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* Delete Profile Button */}
            <div className="text-center">
              <button
                onClick={handleDeleteProfile}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-bold"
              >
                Delete Profile
              </button>
              <p className="text-sm text-[#999] mt-2">
                This will sign you out of your account.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}