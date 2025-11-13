/**
 * Committee Meeting Detail Page
 * Shows full transcript and details of a specific committee meeting
 */

'use client';

import { use } from 'react';
import { useQuery, gql } from '@apollo/client';
import { useLocale } from 'next-intl';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Loading } from '@/components/Loading';
import { Card } from '@canadagpt/design-system';
import Link from 'next/link';
import { Calendar, Users, ArrowLeft, ExternalLink } from 'lucide-react';
import { ShareButton } from '@/components/ShareButton';
import { BookmarkButton } from '@/components/bookmarks/BookmarkButton';
import { ThreadedSpeechCard } from '@/components/hansard';

// GraphQL query for meeting details
const GET_MEETING_DETAILS = gql`
  query GetMeetingDetails($meetingId: ID!) {
    meetings(where: { id: $meetingId }) {
      id
      date
      number
      in_camera
      has_evidence
      meeting_url
      session
      parliament
      of {
        code
        name
        chamber
      }
      statements(options: { limit: 500, sort: [{ time: ASC }] }) {
        id
        time
        who_en
        who_fr
        content_en
        content_fr
        h2_en
        h2_fr
        h3_en
        h3_fr
        statement_type
        wordcount
        madeBy {
          id
          name
          party
          photo_url
          photo_url_source
        }
      }
    }
  }
`;

export default function MeetingDetailPage({ params }: { params: Promise<{ code: string; id: string }> }) {
  const { code, id } = use(params);
  const locale = useLocale();

  const { data, loading, error } = useQuery(GET_MEETING_DETAILS, {
    variables: { meetingId: id },
  });

  const meeting = data?.meetings?.[0];
  const committee = meeting?.of;
  const statements = meeting?.statements || [];

  if (loading) {
    return (
      <>
        <Header />
        <Loading />
        <Footer />
      </>
    );
  }

  if (error || !meeting || !committee) {
    return (
      <>
        <Header />
        <div className="page-container">
          <Card>
            <p className="text-accent-red">Meeting not found</p>
          </Card>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 page-container">
        {/* Back Button */}
        <Link
          href={`/${locale}/committees/${code}`}
          className="inline-flex items-center gap-2 text-accent-red hover:text-accent-red-hover mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {committee.name}
        </Link>

        {/* Meeting Header */}
        <div className="mb-8 relative">
          {/* Bookmark and Share Buttons */}
          <div className="absolute top-0 right-0 flex gap-2">
            <BookmarkButton
              bookmarkData={{
                itemType: 'meeting',
                itemId: meeting.id,
                title: `${committee.name} - Meeting #${meeting.number}`,
                subtitle: new Date(meeting.date).toLocaleDateString(),
                url: `/${locale}/committees/${code}/meetings/${id}`,
                metadata: {
                  committee_code: code,
                  meeting_number: meeting.number,
                  date: meeting.date,
                  in_camera: meeting.in_camera,
                },
              }}
              size="md"
            />
            <ShareButton
              url={`/${locale}/committees/${code}/meetings/${id}`}
              title={`${committee.name} - Meeting #${meeting.number}`}
              description={`Committee meeting on ${new Date(meeting.date).toLocaleDateString()}`}
              size="md"
            />
          </div>

          <div className="pr-24">
            <h1 className="text-4xl font-bold text-text-primary mb-2">
              Meeting #{meeting.number}
            </h1>
            <p className="text-xl text-text-secondary mb-2">{committee.name}</p>
            <div className="flex items-center gap-4 text-sm text-text-secondary">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {new Date(meeting.date).toLocaleDateString('en-CA', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                {statements.length} statements
              </div>
              {meeting.in_camera && (
                <span className="px-2 py-1 rounded bg-gray-500/20 text-gray-400">
                  In Camera
                </span>
              )}
              {meeting.has_evidence && (
                <span className="px-2 py-1 rounded bg-green-500/20 text-green-400">
                  Evidence Available
                </span>
              )}
            </div>
            {meeting.meeting_url && (
              <a
                href={`https://openparliament.ca${meeting.meeting_url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-sm text-accent-red hover:text-accent-red-hover font-medium"
              >
                View on OpenParliament
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>

        {/* Transcript */}
        <Card>
          <h2 className="text-2xl font-bold text-text-primary mb-6">Transcript</h2>
          {statements.length > 0 ? (
            <div className="space-y-4">
              {statements.map((statement: any) => (
                <ThreadedSpeechCard
                  key={statement.id}
                  rootStatement={statement}
                  variant="partisan"
                />
              ))}
            </div>
          ) : (
            <p className="text-text-secondary">No transcript available for this meeting.</p>
          )}
        </Card>
      </main>

      <Footer />
    </div>
  );
}
