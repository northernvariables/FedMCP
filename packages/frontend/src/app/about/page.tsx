/**
 * About page
 */

import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card } from '@canadagpt/design-system';
import { MapleLeafIcon } from '@canadagpt/design-system';
import { Database, Github, ExternalLink, Shield, Zap, Users } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 page-container max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <MapleLeafIcon size="lg" className="h-16 w-16 text-accent-red mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-text-primary mb-4">About CanadaGPT</h1>
          <p className="text-xl text-text-secondary max-w-2xl mx-auto">
            Making Canadian government data accessible, transparent, and accountable through modern technology.
          </p>
        </div>

        {/* Mission */}
        <Card className="mb-8">
          <h2 className="text-2xl font-bold text-text-primary mb-4">Our Mission</h2>
          <div className="text-text-secondary space-y-4">
            <p>
              CanadaGPT is an open-source platform that aggregates Canadian government data into a single,
              searchable interface. We believe that government accountability starts with transparency,
              and transparency starts with accessible data.
            </p>
            <p>
              By connecting data from OpenParliament, the Lobbying Registry, MP expenses, and government
              contracts, we reveal patterns and connections that would otherwise remain hidden across
              dozens of separate databases.
            </p>
            <p>
              Our platform is built for journalists, researchers, activists, and engaged citizens who want
              to hold their government accountable.
            </p>
          </div>
        </Card>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card elevated>
            <Database className="h-10 w-10 text-accent-red mb-3" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">Unified Data</h3>
            <p className="text-sm text-text-secondary">
              Access 1.6M+ data points from multiple government sources in one place.
            </p>
          </Card>

          <Card elevated>
            <Zap className="h-10 w-10 text-accent-red mb-3" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">Real-time Updates</h3>
            <p className="text-sm text-text-secondary">
              Nightly data sync keeps information current with government sources.
            </p>
          </Card>

          <Card elevated>
            <Shield className="h-10 w-10 text-accent-red mb-3" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">Open Source</h3>
            <p className="text-sm text-text-secondary">
              Fully transparent code and methodology. Verify our work on GitHub.
            </p>
          </Card>
        </div>

        {/* Data Sources */}
        <Card className="mb-8">
          <h2 className="text-2xl font-bold text-text-primary mb-4">Data Sources</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <ExternalLink className="h-5 w-5 text-accent-red mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-text-primary mb-1">OpenParliament</h3>
                <p className="text-sm text-text-secondary mb-2">
                  API for MPs, bills, votes, debates, and committees. Updated daily from official
                  House of Commons data.
                </p>
                <a
                  href="https://openparliament.ca"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-accent-red hover:text-accent-red-hover"
                >
                  openparliament.ca →
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <ExternalLink className="h-5 w-5 text-accent-red mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-text-primary mb-1">LEGISinfo</h3>
                <p className="text-sm text-text-secondary mb-2">
                  Official bill status, sponsors, and legislative history from Parliament's
                  legislative database.
                </p>
                <a
                  href="https://www.parl.ca/LegisInfo/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-accent-red hover:text-accent-red-hover"
                >
                  parl.ca/LegisInfo →
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <ExternalLink className="h-5 w-5 text-accent-red mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-text-primary mb-1">Lobbying Registry</h3>
                <p className="text-sm text-text-secondary mb-2">
                  100,000+ lobbying registrations and 350,000+ communication reports from the
                  Office of the Commissioner of Lobbying.
                </p>
                <a
                  href="https://lobbycanada.gc.ca"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-accent-red hover:text-accent-red-hover"
                >
                  lobbycanada.gc.ca →
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <ExternalLink className="h-5 w-5 text-accent-red mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-text-primary mb-1">MP Proactive Disclosure</h3>
                <p className="text-sm text-text-secondary mb-2">
                  Quarterly expense reports for all MPs, including travel, office, hospitality,
                  and contract spending.
                </p>
                <a
                  href="https://www.ourcommons.ca/proactivedisclosure/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-accent-red hover:text-accent-red-hover"
                >
                  ourcommons.ca/proactivedisclosure →
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <ExternalLink className="h-5 w-5 text-accent-red mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-text-primary mb-1">CanLII</h3>
                <p className="text-sm text-text-secondary mb-2">
                  Canadian case law and legislation, including Supreme Court decisions and federal
                  statutes (optional, requires API key).
                </p>
                <a
                  href="https://www.canlii.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-accent-red hover:text-accent-red-hover"
                >
                  canlii.org →
                </a>
              </div>
            </div>
          </div>
        </Card>

        {/* Technology */}
        <Card className="mb-8">
          <h2 className="text-2xl font-bold text-text-primary mb-4">Technology</h2>
          <div className="text-text-secondary space-y-4">
            <p>
              CanadaGPT is built on modern, open-source technology:
            </p>
            <ul className="space-y-2 ml-6 list-disc">
              <li>
                <strong className="text-text-primary">Neo4j Graph Database:</strong> Stores 1.6M nodes
                and 10M relationships, enabling complex queries like "show me all organizations that
                lobbied on Bill C-11 AND donated to the Conservative Party."
              </li>
              <li>
                <strong className="text-text-primary">GraphQL API:</strong> Auto-generated from our
                Neo4j schema, providing a flexible query interface for all government data.
              </li>
              <li>
                <strong className="text-text-primary">Next.js Frontend:</strong> Server-rendered React
                application with instant page loads and seamless navigation.
              </li>
              <li>
                <strong className="text-text-primary">Google Cloud Platform:</strong> Scalable cloud
                infrastructure with automated data sync and 99.9% uptime.
              </li>
            </ul>
          </div>
        </Card>

        {/* Open Source */}
        <Card className="mb-8 bg-bg-overlay border-border-emphasis">
          <div className="flex items-start gap-4">
            <Github className="h-10 w-10 text-accent-red flex-shrink-0" />
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-text-primary mb-3">Open Source & Transparent</h2>
              <div className="text-text-secondary space-y-3">
                <p>
                  All our code is open source and available on GitHub. You can review our data
                  collection methodology, verify our analysis, and even contribute improvements.
                </p>
                <p>
                  We believe accountability platforms must themselves be accountable. That's why
                  every query, every calculation, and every data transformation is documented and
                  auditable.
                </p>
                <a
                  href="https://github.com/yourusername/FedMCP"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-accent-red hover:text-accent-red-hover font-semibold"
                >
                  View on GitHub <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </Card>

        {/* Contact */}
        <Card className="text-center">
          <Users className="h-10 w-10 text-accent-red mx-auto mb-3" />
          <h2 className="text-2xl font-bold text-text-primary mb-3">Get Involved</h2>
          <p className="text-text-secondary mb-4">
            CanadaGPT is built for the community. Have feedback? Found an issue? Want to contribute?
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="https://github.com/yourusername/FedMCP/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-accent-red text-white rounded-lg hover:bg-accent-red-hover transition-colors font-semibold"
            >
              Report an Issue
            </a>
            <a
              href="mailto:contact@canadagpt.ca"
              className="px-4 py-2 border border-border-emphasis text-text-primary rounded-lg hover:border-accent-red transition-colors font-semibold"
            >
              Email Us
            </a>
          </div>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
