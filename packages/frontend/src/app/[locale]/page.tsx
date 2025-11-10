/**
 * Landing page for CanadaGPT
 * Fully bilingual with Quebec French support
 */

'use client';

import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@canadagpt/design-system';
import { ParliamentSilhouette, MapleLeafIcon } from '@canadagpt/design-system';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ArrowRight, Users, FileText, Megaphone, DollarSign } from 'lucide-react';

export default function Home() {
  const t = useTranslations('home');
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden py-20 sm:py-32">
          {/* Background Image */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: 'url(https://storage.googleapis.com/canada-gpt-ca-assets/parliament-buildings.jpg)' }}
          >
            {/* Dark overlay for text readability */}
            <div className="absolute inset-0 bg-black/60" />
          </div>

          <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <div className="flex justify-center mb-6">
                <MapleLeafIcon size={64} className="h-16 w-16 text-accent-red" />
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-text-primary mb-6">
                {t('hero.title')}
              </h1>

              <p className="text-xl text-text-secondary mb-8 max-w-2xl mx-auto">
                {t('hero.subtitle')}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/dashboard">
                  <Button size="lg" className="w-full sm:w-auto">
                    {t('hero.cta.primary')}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/mps">
                  <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                    {t('hero.cta.secondary')}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-bg-primary">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-text-primary text-center mb-12">
              {t('features.title')}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Feature 1: MPs */}
              <Link href="/mps" className="group">
                <div className="bg-bg-secondary border border-border-subtle rounded-lg p-6 hover:border-accent-red transition-colors">
                  <Users className="h-12 w-12 text-accent-red mb-4" />
                  <h3 className="text-xl font-semibold text-text-primary mb-2 group-hover:text-accent-red transition-colors">
                    {t('features.mp.title')}
                  </h3>
                  <p className="text-text-secondary text-sm">
                    {t('features.mp.description')}
                  </p>
                </div>
              </Link>

              {/* Feature 2: Bills */}
              <Link href="/bills" className="group">
                <div className="bg-bg-secondary border border-border-subtle rounded-lg p-6 hover:border-accent-red transition-colors">
                  <FileText className="h-12 w-12 text-accent-red mb-4" />
                  <h3 className="text-xl font-semibold text-text-primary mb-2 group-hover:text-accent-red transition-colors">
                    {t('features.bills.title')}
                  </h3>
                  <p className="text-text-secondary text-sm">
                    {t('features.bills.description')}
                  </p>
                </div>
              </Link>

              {/* Feature 3: Lobbying */}
              <Link href="/lobbying" className="group">
                <div className="bg-bg-secondary border border-border-subtle rounded-lg p-6 hover:border-accent-red transition-colors">
                  <Megaphone className="h-12 w-12 text-accent-red mb-4" />
                  <h3 className="text-xl font-semibold text-text-primary mb-2 group-hover:text-accent-red transition-colors">
                    {t('features.lobbying.title')}
                  </h3>
                  <p className="text-text-secondary text-sm">
                    {t('features.lobbying.description')}
                  </p>
                </div>
              </Link>

              {/* Feature 4: Spending */}
              <Link href="/spending" className="group">
                <div className="bg-bg-secondary border border-border-subtle rounded-lg p-6 hover:border-accent-red transition-colors">
                  <DollarSign className="h-12 w-12 text-accent-red mb-4" />
                  <h3 className="text-xl font-semibold text-text-primary mb-2 group-hover:text-accent-red transition-colors">
                    {t('features.spending.title')}
                  </h3>
                  <p className="text-text-secondary text-sm">
                    {t('features.spending.description')}
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-20 bg-bg-secondary">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-text-primary text-center mb-12">
              {t('stats.title')}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold text-accent-red mb-2">338</div>
                <div className="text-text-secondary">{t('stats.mps', { count: 338 })}</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-accent-red mb-2">5,000+</div>
                <div className="text-text-secondary">{t('stats.bills', { count: '5,000+' })}</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-accent-red mb-2">20</div>
                <div className="text-text-secondary">{t('stats.votes', { count: '20' })}</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-accent-red mb-2">100</div>
                <div className="text-text-secondary">{t('stats.lobbying', { count: '100' })}</div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-bg-primary">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-text-primary mb-4">
              {t('cta.title')}
            </h2>
            <p className="text-xl text-text-secondary mb-8 max-w-2xl mx-auto">
              {t('cta.description')}
            </p>
            <Link href="/dashboard">
              <Button size="lg">
                {t('cta.button')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
