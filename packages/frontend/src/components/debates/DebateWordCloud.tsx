'use client';

import React, { useMemo } from 'react';
import ReactWordcloud from 'react-wordcloud';
import { useLocale } from 'next-intl';

interface Keyword {
  word: string;
  weight: number;
}

interface DebateWordCloudProps {
  keywords_en?: string;
  keywords_fr?: string;
  compact?: boolean;
  className?: string;
}

export function DebateWordCloud({
  keywords_en,
  keywords_fr,
  compact = false,
  className = ''
}: DebateWordCloudProps) {
  const locale = useLocale();

  const keywordsJson = locale === 'fr' ? keywords_fr : keywords_en;

  const words = useMemo(() => {
    if (!keywordsJson) return [];

    try {
      const keywords: Keyword[] = JSON.parse(keywordsJson);
      return keywords.map(k => ({
        text: k.word,
        value: Math.round(k.weight * 100)
      }));
    } catch (error) {
      console.error('Error parsing keywords:', error);
      return [];
    }
  }, [keywordsJson]);

  if (words.length === 0) return null;

  const options = {
    rotations: 2,
    rotationAngles: [-90, 0] as [number, number],
    fontSizes: (compact ? [12, 36] : [16, 64]) as [number, number],
    padding: 2,
    deterministic: true,
    enableTooltip: true,
    colors: ['#DC2626', '#991B1B', '#7F1D1D', '#EF4444', '#F87171'],
    fontFamily: 'Inter, system-ui, sans-serif',
    scale: 'sqrt' as const,
  };

  return (
    <div className={`w-full ${compact ? 'h-48' : 'h-64'} ${className}`}>
      <ReactWordcloud words={words} options={options} />
    </div>
  );
}
