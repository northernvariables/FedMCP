/**
 * Theater mode overlay for video player
 * Full-screen video experience with backdrop
 */

'use client';

import { X, Maximize2, Minimize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

interface TheaterModeProps {
  isOpen: boolean;
  onClose: () => void;
  videoElement: React.ReactNode;
}

export function TheaterMode({ isOpen, onClose, videoElement }: TheaterModeProps) {
  // Handle escape key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/95 z-50"
          />

          {/* Theater Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
          >
            <div className="relative w-full h-full max-w-7xl max-h-[90vh] flex flex-col">
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute -top-12 right-0 p-2 rounded-lg bg-bg-elevated/50 hover:bg-bg-elevated transition-colors backdrop-blur-sm z-10"
                aria-label="Close theater mode"
              >
                <X className="h-6 w-6 text-white" />
              </button>

              {/* Video Container */}
              <div className="flex-1 bg-black rounded-lg overflow-hidden shadow-2xl">
                {videoElement}
              </div>

              {/* Controls Hint */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/70 backdrop-blur-sm rounded-full text-white text-sm opacity-50 hover:opacity-100 transition-opacity">
                Press ESC or click outside to exit theater mode
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
