/**
 * Shared Speech Page
 *
 * Dedicated route for sharing individual parliamentary speeches with rich social media previews
 */

import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createApolloClient } from '@/lib/apollo-client';
import { gql } from '@apollo/client';
import { getMPPhotoUrl } from '@/lib/utils/mpPhotoUrl';

const GET_STATEMENT = gql`
  query GetStatement($id: ID!) {
    statements(where: { id: $id }) {
      id
      content_en
      content_fr
      who_en
      who_fr
      time
      h2_en
      h2_fr
      statement_type
      madeBy {
        id
        name
        party
        photo_url
        photo_url_source
      }
      partOf {
        id
        date
        document_type
      }
    }
  }
`;

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const client = createApolloClient();

  try {
    const { data } = await client.query({
      query: GET_STATEMENT,
      variables: { id },
    });

    const statement = data?.statements?.[0];

    if (!statement) {
      return {
        title: 'Statement Not Found | CanadaGPT',
      };
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://canadagpt.ca';
    const speaker = statement.madeBy?.name || (locale === 'fr' ? statement.who_fr : statement.who_en) || 'Unknown';
    const content = (locale === 'fr' ? statement.content_fr : statement.content_en) || '';
    const preview = content.substring(0, 200) + (content.length > 200 ? '...' : '');

    const title = `${speaker} - Parliamentary Speech`;
    const description = preview;

    // Build OG image URL with MP photo if available
    const ogImageParams = new URLSearchParams({
      title,
      description: preview,
      type: 'speech',
    });

    if (statement.madeBy) {
      const photoUrl = getMPPhotoUrl(statement.madeBy);
      if (photoUrl) {
        ogImageParams.set('image', photoUrl);
      }
    }

    const ogImageUrl = `${baseUrl}/api/og?${ogImageParams.toString()}`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `${baseUrl}/${locale}/share/speech/${id}`,
        siteName: 'CanadaGPT',
        locale: locale === 'fr' ? 'fr_CA' : 'en_CA',
        type: 'article',
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImageUrl],
        creator: '@CanadaGPT',
        site: '@CanadaGPT',
      },
    };
  } catch (error) {
    console.error('Failed to generate metadata for speech:', error);
    return {
      title: 'CanadaGPT',
    };
  }
}

export default async function SharedSpeechPage({ params }: Props) {
  const { locale, id } = await params;

  // Redirect to the debates page with the statement ID as anchor
  // This ensures users land on the actual content after social media preview
  redirect(`/${locale}/hansard#${id}`);
}
