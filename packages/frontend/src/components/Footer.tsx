/**
 * Global footer component
 */

import Link from 'next/link';
import { MapleLeafIcon } from '@canadagpt/design-system';

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border-subtle bg-bg-secondary">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <MapleLeafIcon className="h-6 w-6 text-accent-red" />
              <span className="text-lg font-bold text-text-primary">CanadaGPT</span>
            </div>
            <p className="text-sm text-text-secondary max-w-md">
              Tracking Canadian government accountability through transparency. Open data on MPs, bills,
              lobbying, and spending.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-4">Navigate</h3>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li>
                <Link href="/dashboard" className="hover:text-text-primary transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/mps" className="hover:text-text-primary transition-colors">
                  Members of Parliament
                </Link>
              </li>
              <li>
                <Link href="/bills" className="hover:text-text-primary transition-colors">
                  Bills & Legislation
                </Link>
              </li>
              <li>
                <Link href="/lobbying" className="hover:text-text-primary transition-colors">
                  Lobbying Registry
                </Link>
              </li>
            </ul>
          </div>

          {/* About */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-4">About</h3>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li>
                <Link href="/about" className="hover:text-text-primary transition-colors">
                  About CanadaGPT
                </Link>
              </li>
              <li>
                <Link href="/data-sources" className="hover:text-text-primary transition-colors">
                  Data Sources
                </Link>
              </li>
              <li>
                <Link href="/methodology" className="hover:text-text-primary transition-colors">
                  Methodology
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/yourusername/FedMCP"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-text-primary transition-colors"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-border-subtle">
          <p className="text-xs text-text-tertiary text-center">
            © {new Date().getFullYear()} CanadaGPT. Built with open data from OpenParliament,
            LEGISinfo, and the Lobbying Registry.
          </p>
        </div>
      </div>
    </footer>
  );
}
