/**
 * Animation utilities for mobile performance optimization
 */

export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;

  return window.innerWidth < 768;
};

export const shouldUseLightAnimations = (): boolean => {
  return prefersReducedMotion() || isMobileDevice();
};

/**
 * CSS animation classes for common effects
 */
export const animationClasses = {
  fadeInUp: 'animate-fade-in-up',
  slideInRight: 'animate-slide-in-right',
  hoverGlow: 'hover-glow',
  gradientSlow: 'animate-gradient-slow',
  gradient: 'animate-gradient',
  gradientDelayed: 'animate-gradient-delayed',
  pulse: 'animate-pulse',
} as const;

/**
 * Get appropriate animation delay for staggered animations
 */
export const getStaggerDelay = (index: number, baseDelay: number = 0.1): string => {
  return `${baseDelay * index}s`;
};