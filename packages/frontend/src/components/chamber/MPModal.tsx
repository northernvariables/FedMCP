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
import { X, ExternalLink, MapPin, Users, FileText, DollarSign, Phone, Mail } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface MP {
  id: string;
  name: string;
  party: string;
  riding: string;
  photo_url?: string;
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
              {/* Header with Photo */}
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

                {/* Photo Section */}
                <div className="px-6 py-8 text-center">
                  {mp.photo_url ? (
                    <div className="inline-block">
                      <Image
                        src={mp.photo_url}
                        alt={mp.name}
                        width={200}
                        height={200}
                        className="rounded-full border-4 shadow-lg"
                        style={{ borderColor: partyColor }}
                      />
                    </div>
                  ) : (
                    <div
                      className="w-48 h-48 mx-auto rounded-full border-4 shadow-lg flex items-center justify-center"
                      style={{ borderColor: partyColor, backgroundColor: `${partyColor}20` }}
                    >
                      <Users className="h-24 w-24 opacity-50" style={{ color: partyColor }} />
                    </div>
                  )}

                  {/* Name and Title */}
                  <h2 className="text-3xl font-bold text-text-primary mt-4">
                    {mp.name}
                  </h2>

                  {mp.cabinet_position && (
                    <p className="text-lg text-accent-blue font-semibold mt-2">
                      ⭐ {mp.cabinet_position}
                    </p>
                  )}

                  {mp.bench_section === 'speaker' && (
                    <p className="text-lg text-accent-blue font-semibold mt-2">
                      🔨 Speaker of the House
                    </p>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="px-6 pb-6 space-y-6">
                {/* Party and Riding */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-bg-secondary rounded-lg p-4 border border-border-subtle">
                    <div className="flex items-center gap-2 text-text-tertiary text-sm mb-1">
                      <Users className="h-4 w-4" />
                      <span>Party</span>
                    </div>
                    <p className="font-semibold text-text-primary">{mp.party}</p>
                  </div>

                  <div className="bg-bg-secondary rounded-lg p-4 border border-border-subtle">
                    <div className="flex items-center gap-2 text-text-tertiary text-sm mb-1">
                      <MapPin className="h-4 w-4" />
                      <span>Riding</span>
                    </div>
                    <p className="font-semibold text-text-primary">{mp.riding}</p>
                  </div>
                </div>

                {/* Contact Information */}
                {(mp.email || mp.phone) && (
                  <div className="bg-bg-secondary rounded-lg p-4 border border-border-subtle">
                    <h3 className="font-semibold text-text-primary mb-3">Contact</h3>
                    <div className="space-y-2 text-sm">
                      {mp.email && (
                        <div className="flex items-center gap-2 text-text-secondary">
                          <Mail className="h-4 w-4 flex-shrink-0" />
                          <a
                            href={`mailto:${mp.email}`}
                            className="hover:text-accent-blue transition-colors"
                          >
                            {mp.email}
                          </a>
                        </div>
                      )}
                      {mp.phone && (
                        <div className="flex items-center gap-2 text-text-secondary">
                          <Phone className="h-4 w-4 flex-shrink-0" />
                          <a
                            href={`tel:${mp.phone}`}
                            className="hover:text-accent-blue transition-colors"
                          >
                            {mp.phone}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Quick Stats - Placeholder */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-bg-secondary rounded-lg p-4 border border-border-subtle text-center">
                    <FileText className="h-6 w-6 mx-auto text-text-tertiary mb-2" />
                    <p className="text-xs text-text-tertiary">Bills Sponsored</p>
                    <p className="text-xl font-bold text-text-primary mt-1">--</p>
                  </div>

                  <div className="bg-bg-secondary rounded-lg p-4 border border-border-subtle text-center">
                    <Users className="h-6 w-6 mx-auto text-text-tertiary mb-2" />
                    <p className="text-xs text-text-tertiary">Votes Cast</p>
                    <p className="text-xl font-bold text-text-primary mt-1">--</p>
                  </div>

                  <div className="bg-bg-secondary rounded-lg p-4 border border-border-subtle text-center">
                    <DollarSign className="h-6 w-6 mx-auto text-text-tertiary mb-2" />
                    <p className="text-xs text-text-tertiary">Expenses (YTD)</p>
                    <p className="text-xl font-bold text-text-primary mt-1">--</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleViewProfile}
                    className="flex-1 px-6 py-3 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors font-semibold flex items-center justify-center gap-2"
                  >
                    View Full Profile
                    <ExternalLink className="h-4 w-4" />
                  </button>
                  <button
                    onClick={onClose}
                    className="px-6 py-3 bg-bg-secondary text-text-primary rounded-lg hover:bg-bg-hover transition-colors font-semibold border border-border-subtle"
                  >
                    Close
                  </button>
                </div>

                {/* Note */}
                <p className="text-xs text-text-tertiary text-center">
                  Click "View Full Profile" to see complete voting records, expenses, and legislative history
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
