'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface SectionNavigatorProps {
  sections: string[];
  locale: string;
}

export function SectionNavigator({ sections, locale }: SectionNavigatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  // Smooth scroll to section
  const scrollToSection = (sectionName: string) => {
    // Find the first statement with this h1 value
    const elements = document.querySelectorAll('[data-section]');
    for (const element of elements) {
      if (element.getAttribute('data-section') === sectionName) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setActiveSection(sectionName);
        setIsExpanded(false);
        break;
      }
    }
  };

  // Track which section is currently visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const section = entry.target.getAttribute('data-section');
            if (section) {
              setActiveSection(section);
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    const elements = document.querySelectorAll('[data-section]');
    elements.forEach((element) => observer.observe(element));

    return () => {
      elements.forEach((element) => observer.unobserve(element));
    };
  }, [sections]);

  if (!sections || sections.length === 0) {
    return null;
  }

  return (
    <div
      ref={navRef}
      className="sticky top-0 z-10 bg-bg-elevated border-b border-border-subtle shadow-sm"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Mobile: Dropdown */}
        <div className="lg:hidden">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between py-3 text-sm font-medium text-text-primary"
          >
            <span>
              {locale === 'fr' ? 'Aller à la section' : 'Jump to Section'}
              {activeSection && (
                <span className="text-text-tertiary ml-2">
                  • {activeSection}
                </span>
              )}
            </span>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-text-tertiary" />
            ) : (
              <ChevronDown className="h-4 w-4 text-text-tertiary" />
            )}
          </button>

          {isExpanded && (
            <div className="pb-3 space-y-1">
              {sections.map((section) => (
                <button
                  key={section}
                  onClick={() => scrollToSection(section)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeSection === section
                      ? 'bg-accent-red text-white font-medium'
                      : 'text-text-secondary hover:bg-bg-overlay'
                  }`}
                >
                  {section}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Desktop: Horizontal tabs */}
        <div className="hidden lg:flex items-center gap-2 py-3 overflow-x-auto">
          <span className="text-sm font-medium text-text-tertiary whitespace-nowrap mr-2">
            {locale === 'fr' ? 'Aller à :' : 'Jump to:'}
          </span>
          {sections.map((section) => (
            <button
              key={section}
              onClick={() => scrollToSection(section)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeSection === section
                  ? 'bg-accent-red text-white'
                  : 'bg-bg-overlay text-text-secondary hover:bg-bg-base'
              }`}
            >
              {section}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
