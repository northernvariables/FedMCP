/**
 * MP Modal Component
 *
 * Displays detailed MP information in a modal dialog
 * - Large profile photo
 * - Full biographical info
 * - Quick stats (bills, votes, expenses)
 * - Link to full profile page
 */

'use client';

import React from 'react';
import { X, ExternalLink, MapPin, Users, FileText, DollarSign, Phone, Mail, Play, Clock, Eye } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { getMPPhotoUrl } from '@/lib/utils/mpPhotoUrl';

interface MP {
  id: string;
  name: string;
  party: string;
  riding: string;
  cabinet_position?: string;
  email?: string;
  phone?: string;
  bench_section?: string;
}

interface MPModalProps {
  mp: MP | null;
  isOpen: boolean;
  onClose: () => void;
}

// Party colors
const PARTY_COLORS: Record<string, string> = {
  'Conservative': '#002395',
  'Liberal': '#D71920',
  'Bloc Québécois': '#33B2CC',
  'NDP': '#F37021',
  'New Democratic Party': '#F37021',
  'Green Party': '#3D9B35',
  'Independent': '#666666',
};

export function MPModal({ mp, isOpen, onClose }: MPModalProps) {
  const router = useRouter();

  if (!mp) return null;

  const partyColor = PARTY_COLORS[mp.party] || PARTY_COLORS['Independent'];

  // Get photo URL from GCS or fallback to ID-based construction
  const photoUrl = getMPPhotoUrl(mp);
  const [imageError, setImageError] = React.useState(false);

  const handleViewProfile = () => {
    onClose();
    router.push(`/mp/${mp.id}`);
  };

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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-bg-elevated rounded-xl shadow-2xl border border-border-subtle max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Compact Header */}
              <div className="relative">
                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 z-10 p-2 rounded-full bg-bg-elevated/90 hover:bg-bg-hover border border-border-subtle transition-colors"
                  aria-label="Close"
                >
                  <X className="h-5 w-5 text-text-primary" />
                </button>

                {/* Party Color Banner */}
                <div
                  className="h-2"
                  style={{ backgroundColor: partyColor }}
                />

                {/* Compact Header with Photo and Info */}
                <div className="px-6 py-4 flex items-center gap-4">
                  {/* Small Photo */}
                  {photoUrl && !imageError ? (
                    <div className="flex-shrink-0">
                      <Image
                        src={photoUrl}
                        alt={mp.name}
                        width={80}
                        height={80}
                        className="rounded-full border-3 shadow-md"
                        style={{ borderColor: partyColor }}
                        onError={() => setImageError(true)}
                      />
                    </div>
                  ) : (
                    <div
                      className="flex-shrink-0 w-20 h-20 rounded-full border-3 shadow-md flex items-center justify-center"
                      style={{ borderColor: partyColor, backgroundColor: `${partyColor}20` }}
                    >
                      <Users className="h-10 w-10 opacity-50" style={{ color: partyColor }} />
                    </div>
                  )}

                  {/* Name and Info */}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-bold text-text-primary">
                      {mp.name}
                    </h2>
                    <p className="text-sm text-text-secondary mt-1">
                      {mp.party} • {mp.riding}
                    </p>
                    {mp.cabinet_position && (
                      <p className="text-sm text-accent-blue font-semibold mt-1">
                        ⭐ {mp.cabinet_position}
                      </p>
                    )}
                    {mp.bench_section === 'speaker' && (
                      <p className="text-sm text-accent-blue font-semibold mt-1">
                        🔨 Speaker of the House
                      </p>
                    )}
                    <button
                      onClick={handleViewProfile}
                      className="mt-2 text-sm text-accent-blue hover:text-accent-blue/80 transition-colors font-medium flex items-center gap-1"
                    >
                      View Full Profile
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 pb-6 space-y-4">
                {/* Recent & Popular Videos */}
                <div className="bg-bg-secondary rounded-lg p-4 border border-border-subtle">
                  <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
                    <Play className="h-5 w-5" />
                    Recent & Popular Videos
                  </h3>

                  <div className="space-y-3">
                    {/* Mock video items - replace with real data */}
                    {[
                      {
                        title: 'Question Period - Response on Healthcare',
                        date: '2024-01-15',
                        duration: '4:32',
                        views: '12.5K',
                      },
                      {
                        title: 'Committee Testimony - Climate Policy',
                        date: '2024-01-10',
                        duration: '12:45',
                        views: '8.2K',
                      },
                      {
                        title: 'Debate on Bill C-249',
                        date: '2024-01-08',
                        duration: '8:15',
                        views: '15.3K',
                      },
                    ].map((video, index) => (
                      <button
                        key={index}
                        className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-bg-hover transition-colors border border-border-subtle group"
                      >
                        {/* Thumbnail placeholder */}
                        <div className="flex-shrink-0 w-24 h-16 bg-black rounded flex items-center justify-center">
                          <Play className="h-6 w-6 text-white/70 group-hover:text-white transition-colors" />
                        </div>

                        {/* Video info */}
                        <div className="flex-1 text-left min-w-0">
                          <p className="text-sm font-medium text-text-primary group-hover:text-accent-blue transition-colors line-clamp-2">
                            {video.title}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-text-tertiary">
                            <span>{new Date(video.date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {video.duration}
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {video.views}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <p className="text-xs text-text-tertiary text-center mt-3">
                    Click any video to watch • View full profile for voting records, expenses, bills, and contact info
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
