import { motion } from 'framer-motion';

/**
 * AmbientBackground: Animated gradient background with variants
 * - search: soft blue-purple gradients
 * - results: warm golden-orange tones
 * - loading: shimmer effect
 */
const AmbientBackground = ({ variant = 'search' }) => {
  const getGradient = () => {
    switch (variant) {
      case 'results':
        return {
          from: 'from-amber-100 via-orange-50 to-rose-100',
          blob1: 'bg-gradient-to-br from-amber-300/30 to-transparent',
          blob2: 'bg-gradient-to-tl from-rose-300/20 to-transparent',
          blob3: 'bg-gradient-to-r from-orange-200/25 to-transparent',
        };
      case 'loading':
        return {
          from: 'from-slate-100 via-blue-50 to-slate-100',
          blob1: 'bg-gradient-to-br from-blue-300/25 to-transparent',
          blob2: 'bg-gradient-to-tl from-purple-300/20 to-transparent',
          blob3: 'bg-gradient-to-r from-indigo-200/20 to-transparent',
        };
      case 'search':
      default:
        return {
          from: 'from-blue-50 via-purple-50 to-blue-50',
          blob1: 'bg-gradient-to-br from-blue-300/30 to-transparent',
          blob2: 'bg-gradient-to-tl from-purple-300/25 to-transparent',
          blob3: 'bg-gradient-to-r from-cyan-200/20 to-transparent',
        };
    }
  };

  const gradient = getGradient();

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Base gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient.from}`} />

      {/* Animated blob 1 - Large, top-left */}
      <motion.div
        className={`absolute -top-40 -left-40 w-80 h-80 rounded-full blur-3xl ${gradient.blob1}`}
        animate={{
          x: [0, 30, 0],
          y: [0, 40, 0],
        }}
        transition={{
          duration: 8,
          ease: 'easeInOut',
          repeat: Infinity,
        }}
      />

      {/* Animated blob 2 - Medium, bottom-right */}
      <motion.div
        className={`absolute -bottom-32 -right-32 w-64 h-64 rounded-full blur-3xl ${gradient.blob2}`}
        animate={{
          x: [0, -25, 0],
          y: [0, -35, 0],
        }}
        transition={{
          duration: 10,
          ease: 'easeInOut',
          repeat: Infinity,
          delay: 0.5,
        }}
      />

      {/* Animated blob 3 - Small, center-right */}
      <motion.div
        className={`absolute top-1/3 -right-20 w-48 h-48 rounded-full blur-3xl ${gradient.blob3}`}
        animate={{
          x: [0, 20, 0],
          y: [0, -30, 0],
        }}
        transition={{
          duration: 7,
          ease: 'easeInOut',
          repeat: Infinity,
          delay: 1,
        }}
      />

      {/* Overlay to soften edges */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/5" />
    </div>
  );
};

export default AmbientBackground;
