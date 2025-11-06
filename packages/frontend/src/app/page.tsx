/**
 * Landing page for CanadaGPT
 */

import Link from 'next/link';
import { Button } from '@canadagpt/design-system';
import { ParliamentSilhouette, MapleLeafIcon } from '@canadagpt/design-system';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ArrowRight, Users, FileText, Megaphone, DollarSign } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden py-20 sm:py-32">
          {/* Background Image */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: 'url(/parliament-buildings.jpg)' }}
          >
            {/* Dark overlay for text readability */}
            <div className="absolute inset-0 bg-black/60" />
          </div>

          <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <div className="flex justify-center mb-6">
                <MapleLeafIcon size="lg" className="h-16 w-16 text-accent-red" />
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-text-primary mb-6">
                Government Accountability
                <br />
                <span className="text-accent-red">Made Transparent</span>
              </h1>

              <p className="text-xl text-text-secondary mb-8 max-w-2xl mx-auto">
                Track Canadian MPs, bills, lobbying activity, and government spending. All in one place.
                Powered by open data and graph technology.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/dashboard">
                  <Button size="lg" className="w-full sm:w-auto">
                    Explore Dashboard
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/mps">
                  <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                    Browse MPs
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
              What You Can Track
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Feature 1: MPs */}
              <Link href="/mps" className="group">
                <div className="bg-bg-secondary border border-border-subtle rounded-lg p-6 hover:border-accent-red transition-colors">
                  <Users className="h-12 w-12 text-accent-red mb-4" />
                  <h3 className="text-xl font-semibold text-text-primary mb-2 group-hover:text-accent-red transition-colors">
                    Members of Parliament
                  </h3>
                  <p className="text-text-secondary text-sm">
                    Track 338 MPs, their voting records, sponsored bills, and constituency representation.
                  </p>
                </div>
              </Link>

              {/* Feature 2: Bills */}
              <Link href="/bills" className="group">
                <div className="bg-bg-secondary border border-border-subtle rounded-lg p-6 hover:border-accent-red transition-colors">
                  <FileText className="h-12 w-12 text-accent-red mb-4" />
                  <h3 className="text-xl font-semibold text-text-primary mb-2 group-hover:text-accent-red transition-colors">
                    Bills & Legislation
                  </h3>
                  <p className="text-text-secondary text-sm">
                    Follow 5,000+ bills through Parliament, from introduction to royal assent.
                  </p>
                </div>
              </Link>

              {/* Feature 3: Lobbying */}
              <Link href="/lobbying" className="group">
                <div className="bg-bg-secondary border border-border-subtle rounded-lg p-6 hover:border-accent-red transition-colors">
                  <Megaphone className="h-12 w-12 text-accent-red mb-4" />
                  <h3 className="text-xl font-semibold text-text-primary mb-2 group-hover:text-accent-red transition-colors">
                    Lobbying Activity
                  </h3>
                  <p className="text-text-secondary text-sm">
                    See which organizations lobby on which bills, and who they meet with.
                  </p>
                </div>
              </Link>

              {/* Feature 4: Spending */}
              <Link href="/spending" className="group">
                <div className="bg-bg-secondary border border-border-subtle rounded-lg p-6 hover:border-accent-red transition-colors">
                  <DollarSign className="h-12 w-12 text-accent-red mb-4" />
                  <h3 className="text-xl font-semibold text-text-primary mb-2 group-hover:text-accent-red transition-colors">
                    Government Spending
                  </h3>
                  <p className="text-text-secondary text-sm">
                    Track MP expenses, government contracts, and grants with full transparency.
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-20 bg-bg-secondary">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold text-accent-red mb-2">338</div>
                <div className="text-text-secondary">Current MPs</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-accent-red mb-2">5,000+</div>
                <div className="text-text-secondary">Bills Tracked</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-accent-red mb-2">100K+</div>
                <div className="text-text-secondary">Lobbying Records</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-accent-red mb-2">Real-time</div>
                <div className="text-text-secondary">Data Updates</div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-bg-primary">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-text-primary mb-4">
              Ready to Hold Government Accountable?
            </h2>
            <p className="text-xl text-text-secondary mb-8 max-w-2xl mx-auto">
              Start exploring Canadian government data with powerful search, analytics, and transparency tools.
            </p>
            <Link href="/dashboard">
              <Button size="lg">
                Get Started
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
