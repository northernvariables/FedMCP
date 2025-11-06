/**
 * Chamber View Page - 2x2 Grid Layout
 *
 * Optimized layout with:
 * - Live stats bar at top
 * - Top Left: Video player
 * - Top Right: Live transcript
 * - Bottom Left: Video playlist
 * - Bottom Right: Floor plan with filters
 */

'use client';

import { useQuery } from '@apollo/client';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Loading } from '@/components/Loading';
import { Card } from '@canadagpt/design-system';
import { GET_CHAMBER_SEATING } from '@/lib/queries';
import { SeatingChart } from '@/components/chamber/SeatingChart';
import { CPACPlayer } from '@/components/chamber/CPACPlayer';
import { VideoPlaylist } from '@/components/chamber/VideoPlaylist';
import { MPModal } from '@/components/chamber/MPModal';
import { LiveStatsBar } from '@/components/chamber/LiveStatsBar';
import { PartyFilters } from '@/components/chamber/PartyFilters';
import { TranscriptPanel } from '@/components/chamber/TranscriptPanel';
import { TheaterMode } from '@/components/chamber/TheaterMode';

interface MP {
  id: string;
  name: string;
  party: string;
  riding: string;
  photo_url?: string;
  cabinet_position?: string;
  email?: string;
  phone?: string;
  seat_row?: number;
  seat_column?: number;
  bench_section?: string;
  seat_visual_x?: number;
  seat_visual_y?: number;
}

interface Debate {
  id: string;
  date: string;
  topic?: string;
  cpac_video_url?: string;
  video_duration?: number;
}

export default function ChamberPage() {
  const searchParams = useSearchParams();
  const highlightedMpId = searchParams.get('mp');

  const [selectedMp, setSelectedMp] = useState<MP | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDebate, setSelectedDebate] = useState<Debate | null>(null);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [selectedParty, setSelectedParty] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data, loading, error } = useQuery(GET_CHAMBER_SEATING);

  // Mock debates data - will be replaced with real GraphQL query
  const mockDebates: Debate[] = [
    {
      id: 'debate-2024-01-15',
      date: '2024-01-15',
      topic: 'Question Period',
      video_duration: 3600,
    },
    {
      id: 'debate-2024-01-16',
      date: '2024-01-16',
      topic: 'Budget Debate',
      video_duration: 7200,
    },
    {
      id: 'debate-2024-01-17',
      date: '2024-01-17',
      topic: 'Private Members Business',
      video_duration: 5400,
    },
  ];

  const handleSeatClick = (mp: MP) => {
    setSelectedMp(mp);
    setIsModalOpen(true);
  };

  const handleDebateSelect = (debate: Debate) => {
    setSelectedDebate(debate);
  };

  const allMps: MP[] = data?.mps || [];

  // Filter MPs based on party and search
  const filteredMps = allMps.filter((mp) => {
    const matchesParty = !selectedParty || mp.party === selectedParty;
    const matchesSearch = !searchQuery ||
      mp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mp.riding.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesParty && matchesSearch;
  });

  const cabinetCount = allMps.filter(mp => mp.cabinet_position).length;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Live Stats Bar */}
      <LiveStatsBar />

      <main className="flex-1">
        {loading ? (
          <div className="page-container py-12">
            <Loading />
          </div>
        ) : error ? (
          <div className="page-container py-12">
            <Card>
              <p className="text-accent-red">Error loading chamber data: {error.message}</p>
            </Card>
          </div>
        ) : (
          <>
            {/* Left-Right Split Layout: Video/Transcript Stack | Floor Plan/Playlist Stack */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6">

              {/* Left Column: Combined Video + Transcript */}
              <div>
                <Card className="overflow-hidden">
                  {/* Video Player with Overlay Playlist */}
                  <div className="relative">
                    <CPACPlayer
                      title={selectedDebate?.topic || 'House of Commons - Question Period'}
                      date={
                        selectedDebate?.date
                          ? new Date(selectedDebate.date).toLocaleDateString('en-CA', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })
                          : new Date().toLocaleDateString('en-CA', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })
                      }
                      isLive={false}
                      videoUrl={selectedDebate?.cpac_video_url}
                      compact={true}
                      onTheaterMode={() => setIsTheaterMode(true)}
                      noCard={true}
                    />

                    {/* Playlist Overlay - Right 50%, starts below header, shows on hover */}
                    <div className="absolute top-[52px] right-0 bottom-0 w-1/2 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none group">
                      <div className="h-full bg-gradient-to-l from-black/60 to-transparent backdrop-blur-sm pointer-events-auto">
                        <VideoPlaylist
                          debates={mockDebates}
                          selectedDebateId={selectedDebate?.id}
                          onDebateSelect={handleDebateSelect}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Live Transcript - Fixed Height */}
                  <div className="h-[300px] border-t border-border">
                    <TranscriptPanel />
                  </div>
                </Card>
              </div>

              {/* Right Column: Floor Plan */}
              <div>
                {/* Combined: Seating Chart + Filters */}
                <Card>
                  <div className="p-4">
                    {/* Centered Title */}
                    <div className="text-center mb-3">
                      <h2 className="text-xl font-bold text-text-primary">
                        House of Commons Seating
                      </h2>
                      <p className="text-xs text-text-secondary mt-1">
                        Click any seat to view MP details. Hover to see names. Cabinet ministers have gold rings.
                      </p>
                    </div>

                    {/* Party Filters - Integrated */}
                    <div className="mb-4 pb-4 border-b border-border">
                      <PartyFilters
                        onPartyFilter={setSelectedParty}
                        onSearch={setSearchQuery}
                        selectedParty={selectedParty}
                        searchQuery={searchQuery}
                      />
                    </div>

                    {/* Seating Chart SVG */}
                    <div>
                      <SeatingChart
                        mps={filteredMps}
                        onSeatClick={handleSeatClick}
                        highlightedMpId={highlightedMpId || undefined}
                      />
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </>
        )}
      </main>

      <Footer />

      {/* MP Modal */}
      <MPModal mp={selectedMp} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* Theater Mode */}
      <TheaterMode
        isOpen={isTheaterMode}
        onClose={() => setIsTheaterMode(false)}
        videoElement={
          <CPACPlayer
            title={selectedDebate?.topic || 'House of Commons - Question Period'}
            date={
              selectedDebate?.date
                ? new Date(selectedDebate.date).toLocaleDateString('en-CA', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : new Date().toLocaleDateString('en-CA', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
            }
            isLive={false}
            videoUrl={selectedDebate?.cpac_video_url}
          />
        }
      />
    </div>
  );
}
