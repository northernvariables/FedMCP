/**
 * Represent API Route
 *
 * Proxies requests to the Represent Civics API (https://represent.opennorth.ca)
 * to find MPs and ridings by postal code or coordinates
 *
 * Requires authentication to prevent abuse
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { normalizePostalCode, validateCanadianPostalCode } from '@/lib/postalCodeUtils';

const REPRESENT_API_BASE = 'https://represent.opennorth.ca';

/**
 * GET /api/represent?postalCode=K1A0A9
 * GET /api/represent?lat=45.4215&lng=-75.6972
 *
 * Returns MP and riding information from Represent API
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required. Please sign up for free to find your MP.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const postalCode = searchParams.get('postalCode');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    // Determine which Represent API endpoint to use
    let representUrl: string;

    if (postalCode) {
      // Validate and normalize postal code
      if (!validateCanadianPostalCode(postalCode)) {
        return NextResponse.json(
          { error: 'Invalid Canadian postal code format. Expected format: A1A 1A1' },
          { status: 400 }
        );
      }

      const normalized = normalizePostalCode(postalCode);
      representUrl = `${REPRESENT_API_BASE}/postcodes/${normalized}/`;
    } else if (lat && lng) {
      // Validate coordinates
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);

      if (isNaN(latitude) || isNaN(longitude)) {
        return NextResponse.json(
          { error: 'Invalid latitude or longitude' },
          { status: 400 }
        );
      }

      // Canadian bounds check
      if (latitude < 41.7 || latitude > 83.1 || longitude < -141.0 || longitude > -52.6) {
        return NextResponse.json(
          { error: 'Coordinates are outside of Canada' },
          { status: 400 }
        );
      }

      representUrl = `${REPRESENT_API_BASE}/representatives/?point=${latitude},${longitude}`;
    } else {
      return NextResponse.json(
        { error: 'Either postalCode or lat/lng coordinates are required' },
        { status: 400 }
      );
    }

    // Fetch from Represent API
    const response = await fetch(representUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CanadaGPT (https://canadagpt.ca)'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'No representatives found for this location' },
          { status: 404 }
        );
      }

      throw new Error(`Represent API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Transform response to our format
    // Represent API returns different formats for postal code vs coordinates
    if (postalCode) {
      // Postal code endpoint returns: { representatives_centroid: [...], boundaries_centroid: [...], ... }
      return NextResponse.json({
        representatives: data.representatives_centroid || [],
        boundaries: data.boundaries_centroid || [],
        centroid: data.centroid || null
      });
    } else {
      // Coordinates endpoint returns: { objects: [...] }
      return NextResponse.json({
        representatives: data.objects || [],
        boundaries: [],
        centroid: null
      });
    }
  } catch (error) {
    console.error('Represent API error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch representative information',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Helper function to extract MP data from Represent API response
 * Can be used client-side after fetching
 */
export interface RepresentativeData {
  name: string;
  district_name: string;
  elected_office: string;
  party_name: string;
  email?: string;
  url?: string;
  representative_set_name?: string;
}

export function extractMPFromRepresentResponse(representatives: any[]): RepresentativeData | null {
  // Find the House of Commons MP (representative_set_name: 'House of Commons')
  const mp = representatives.find(
    (rep) => rep.representative_set_name === 'House of Commons'
  );

  if (!mp) return null;

  return {
    name: mp.name,
    district_name: mp.district_name,
    elected_office: mp.elected_office,
    party_name: mp.party_name,
    email: mp.email,
    photo_url: mp.photo_url,
    url: mp.url,
    representative_set_name: mp.representative_set_name
  };
}
