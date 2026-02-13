'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import axios from 'axios';

interface NavbarProps {
  username?: string | null;
  setUsername?: (username: string | null) => void;
  showAddGroup?: boolean;
  onAddGroupClick?: () => void;
}

export default function Navbar({ username, setUsername, showAddGroup, onAddGroupClick }: NavbarProps) {
  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);


  useEffect(() => {
    if (!mounted) return;

    // Only update if username prop is null/undefined and we have a stored username
    if (!username && setUsername) {
      const storedUsername = localStorage.getItem('username');
      if (storedUsername) {
        setUsername(storedUsername);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]); // Only depend on mounted to run once after mount

  // Close user menu when clicking outside
  useEffect(() => {
    if (!isUserMenuOpen || !mounted) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    // Add event listener on next tick to avoid immediate execution
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside, true);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [isUserMenuOpen, mounted]);


  if (!mounted) {
    return null;
  }

  const currentUsername = username || (mounted ? localStorage.getItem('username') : null);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('firstName');
    localStorage.removeItem('photoUrl');
    if (setUsername) {
      setUsername(null);
    }
    setIsMenuOpen(false);
    setIsUserMenuOpen(false);
  };

  const handleAddGroup = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }
    if (onAddGroupClick) {
      onAddGroupClick();
    }
    setIsMenuOpen(false);
  };

  const navLinks = [
    { href: '/groups', label: 'Groups' },
    { href: '/bots', label: 'Bots' },
    { href: '/articles', label: 'Articles' },
  ];

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-[#333] bg-[#111111]/95 backdrop-blur-md"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="text-xl sm:text-2xl font-bold gradient-text cursor-pointer"
          >
            erogram
          </motion.div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex gap-2 lg:gap-3 xl:gap-4 items-center flex-wrap ml-4 lg:ml-8">
          {/* Navigation Links */}
          {navLinks.map((link, index) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-xs md:text-sm px-2 md:px-3 py-1 md:py-1.5 rounded-lg font-bold transition-all whitespace-nowrap shadow-lg ${index === 0
                  ? 'bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white hover-glow hover:scale-105'
                  : index === 1
                    ? 'bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 hover:from-orange-600 hover:via-red-600 hover:to-pink-600 text-white hover-glow hover:scale-105'
                    : 'bg-gradient-to-r from-green-500 via-teal-500 to-cyan-500 hover:from-green-600 hover:via-teal-600 hover:to-cyan-600 text-white hover-glow hover:scale-105'
                }`}
            >
              {link.label === 'Groups' ? '👥 ' : link.label === 'Bots' ? '🤖 ' : '📰 '}{link.label}
            </Link>
          ))}

          <a
            href="https://lovescape.com/create-ai-sex-girlfriend/style?userId=5ebe4f139af9bcff39155f3e9f06fbce233415fd82fd4da2a9c51ea0921d4c0e&sourceId=Erogram&creativeId=6step_hent&p1=test"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs md:text-sm px-2 md:px-3 py-1 md:py-1.5 rounded-lg font-bold transition-all whitespace-nowrap shadow-lg bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white hover-glow hover:scale-105"
          >
            🫦 Meet Your AI slut
          </a>


          {/* Add Group Button */}
          {showAddGroup && (
            <button
              onClick={handleAddGroup}
              className="text-xs md:text-sm px-2 md:px-3 py-1 md:py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-colors font-bold hover-glow whitespace-nowrap"
            >
              ➕ Add
            </button>
          )}

          {/* User Menu */}
          {currentUsername ? (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 text-xs md:text-sm text-[#f5f5f5] hover:text-[#b31b1b] transition-colors whitespace-nowrap"
              >
                <span>👤</span>
                <span>{currentUsername}</span>
                <span className={`transform transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`}>▼</span>
              </button>

              {/* Dropdown Menu - Only render when mounted and open */}
              <AnimatePresence>
                {mounted && isUserMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="absolute right-0 mt-2 w-56 bg-gradient-to-br from-gray-800/95 to-gray-900/95 backdrop-blur-xl rounded-xl border border-white/30 shadow-2xl z-50 overflow-hidden"
                  >
                    <div className="py-3">
                      <div className="px-4 py-3 text-sm font-semibold bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white border-b border-white/20">
                        👤 {currentUsername}
                      </div>
                      <Link
                        href="/profile"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-gradient-to-r hover:from-blue-500/30 hover:to-purple-500/30 transition-all duration-200"
                      >
                        <span>👤</span> Profile
                      </Link>
                      <button
                        onClick={() => {
                          handleLogout();
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-3 text-left px-4 py-3 text-sm text-white hover:bg-gradient-to-r hover:from-red-500/30 hover:to-pink-500/30 transition-all duration-200"
                      >
                        <span>🚪</span> Logout
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-xs md:text-sm px-3 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all font-bold hover-glow hover:scale-105 whitespace-nowrap"
            >
              Login
            </Link>
          )}
        </div>

        {/* Mobile Burger Menu Button */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden flex flex-col gap-1.5 w-8 h-8 items-center justify-center"
          aria-label="Toggle menu"
        >
          <motion.span
            className="w-6 h-0.5 bg-[#f5f5f5] rounded-full"
            animate={{
              rotate: isMenuOpen ? 45 : 0,
              y: isMenuOpen ? 6 : 0,
            }}
            transition={{ duration: 0.2 }}
          />
          <motion.span
            className="w-6 h-0.5 bg-[#f5f5f5] rounded-full"
            animate={{
              opacity: isMenuOpen ? 0 : 1,
            }}
            transition={{ duration: 0.2 }}
          />
          <motion.span
            className="w-6 h-0.5 bg-[#f5f5f5] rounded-full"
            animate={{
              rotate: isMenuOpen ? -45 : 0,
              y: isMenuOpen ? -6 : 0,
            }}
            transition={{ duration: 0.2 }}
          />
        </button>
      </div>

      {/* Mobile Menu */}
      <motion.div
        className="md:hidden overflow-hidden"
        initial={false}
        animate={{
          height: isMenuOpen ? 'auto' : 0,
          opacity: isMenuOpen ? 1 : 0,
        }}
        transition={{ duration: 0.3 }}
      >
        <div className="px-4 pb-4 space-y-3 border-t border-[#333] pt-4">
          {navLinks.map((link, index) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsMenuOpen(false)}
              className={`block px-4 py-2 rounded-lg font-bold text-center transition-all shadow-lg ${index === 0
                  ? 'bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white'
                  : index === 1
                    ? 'bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 hover:from-orange-600 hover:via-red-600 hover:to-pink-600 text-white'
                    : 'bg-gradient-to-r from-green-500 via-teal-500 to-cyan-500 hover:from-green-600 hover:via-teal-600 hover:to-cyan-600 text-white'
                }`}
            >
              {link.label === 'Groups' ? '👥 ' : link.label === 'Bots' ? '🤖 ' : '📰 '}{link.label}
            </Link>
          ))}
          <a
            href="https://lovescape.com/create-ai-sex-girlfriend/style?userId=5ebe4f139af9bcff39155f3e9f06fbce233415fd82fd4da2a9c51ea0921d4c0e&sourceId=Erogram&creativeId=6step_hent&p1=test"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setIsMenuOpen(false)}
            className="block px-4 py-2 rounded-lg font-bold text-center transition-all shadow-lg bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white"
          >
            🫦 Meet Your AI slut
          </a>
          {showAddGroup && (
            <button
              onClick={handleAddGroup}
              className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-colors font-bold text-center"
            >
              ➕ Add Group
            </button>
          )}
          {currentUsername ? (
            <div className="space-y-2 pt-2 border-t border-[#333]">
              <div className="text-[#f5f5f5] py-2">👤 {currentUsername}</div>
              <Link
                href="/profile"
                onClick={() => setIsMenuOpen(false)}
                className="block text-center text-[#f5f5f5] hover:text-[#b31b1b] transition-colors py-2"
              >
                Profile
              </Link>
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              onClick={() => setIsMenuOpen(false)}
              className="block text-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-colors font-bold"
            >
              Login
            </Link>
          )}
        </div>
      </motion.div>
    </motion.nav>
  );
}
