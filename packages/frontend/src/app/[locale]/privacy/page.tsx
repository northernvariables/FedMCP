// Privacy Policy Page
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'Privacy' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default function PrivacyPage() {
  const t = useTranslations('Privacy');

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">{t('title')}</h1>

      <div className="prose prose-lg dark:prose-invert max-w-none">
        <p className="text-muted-foreground mb-6">
          <strong>{t('lastUpdated')}</strong> November 8, 2025
        </p>

        {/* Introduction */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">{t('introduction.title')}</h2>
          <p className="mb-4">{t('introduction.content')}</p>
        </section>

        {/* Information We Collect */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">{t('collect.title')}</h2>

          <h3 className="text-xl font-semibold mb-3">{t('collect.account.title')}</h3>
          <p className="mb-2">{t('collect.account.content')}</p>
          <ul className="list-disc pl-6 mb-4 space-y-1">
            <li>{t('collect.account.items.name')}</li>
            <li>{t('collect.account.items.email')}</li>
            <li>{t('collect.account.items.profile')}</li>
            <li>{t('collect.account.items.provider')}</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">{t('collect.userContent.title')}</h3>
          <ul className="list-disc pl-6 mb-4 space-y-1">
            <li>{t('collect.userContent.items.posts')}</li>
            <li>{t('collect.userContent.items.comments')}</li>
            <li>{t('collect.userContent.items.votes')}</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">{t('collect.usage.title')}</h3>
          <ul className="list-disc pl-6 mb-4 space-y-1">
            <li>{t('collect.usage.items.pages')}</li>
            <li>{t('collect.usage.items.searches')}</li>
            <li>{t('collect.usage.items.browser')}</li>
            <li>{t('collect.usage.items.ip')}</li>
          </ul>
        </section>

        {/* How We Use Information */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">{t('use.title')}</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>{t('use.items.authentication')}</li>
            <li>{t('use.items.forum')}</li>
            <li>{t('use.items.personalization')}</li>
            <li>{t('use.items.analytics')}</li>
            <li>{t('use.items.communication')}</li>
            <li>{t('use.items.security')}</li>
          </ul>
        </section>

        {/* Public Parliamentary Data */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">{t('publicData.title')}</h2>
          <p className="mb-4">{t('publicData.content')}</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>{t('publicData.sources.parliament')}</li>
            <li>{t('publicData.sources.legisinfo')}</li>
            <li>{t('publicData.sources.lobbying')}</li>
            <li>{t('publicData.sources.canlii')}</li>
          </ul>
        </section>

        {/* Data Storage and Security */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">{t('security.title')}</h2>
          <p className="mb-4">{t('security.content')}</p>

          <h3 className="text-xl font-semibold mb-3">{t('security.infrastructure.title')}</h3>
          <ul className="list-disc pl-6 mb-4 space-y-1">
            <li>{t('security.infrastructure.items.auth')}</li>
            <li>{t('security.infrastructure.items.hosting')}</li>
            <li>{t('security.infrastructure.items.database')}</li>
            <li>{t('security.infrastructure.items.encryption')}</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">{t('security.measures.title')}</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>{t('security.measures.items.https')}</li>
            <li>{t('security.measures.items.oauth')}</li>
            <li>{t('security.measures.items.isolation')}</li>
            <li>{t('security.measures.items.monitoring')}</li>
          </ul>
        </section>

        {/* Third-Party Services */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">{t('thirdParty.title')}</h2>
          <p className="mb-4">{t('thirdParty.content')}</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>{t('thirdParty.services.supabase.name')}</strong> – {t('thirdParty.services.supabase.description')} (
              <a
                href="https://supabase.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {t('thirdParty.privacyPolicy')}
              </a>)
            </li>
            <li>
              <strong>{t('thirdParty.services.google.name')}</strong> – {t('thirdParty.services.google.description')} (
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {t('thirdParty.privacyPolicy')}
              </a>)
            </li>
            <li>
              <strong>{t('thirdParty.services.oauth.name')}</strong> – {t('thirdParty.services.oauth.description')}
            </li>
          </ul>
        </section>

        {/* User Rights */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">{t('rights.title')}</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>{t('rights.items.access.title')}</strong> – {t('rights.items.access.description')}</li>
            <li><strong>{t('rights.items.correction.title')}</strong> – {t('rights.items.correction.description')}</li>
            <li><strong>{t('rights.items.deletion.title')}</strong> – {t('rights.items.deletion.description')}</li>
            <li><strong>{t('rights.items.export.title')}</strong> – {t('rights.items.export.description')}</li>
            <li><strong>{t('rights.items.optOut.title')}</strong> – {t('rights.items.optOut.description')}</li>
          </ul>
          <p className="mt-4">{t('rights.contact')}</p>
        </section>

        {/* Cookies and Tracking */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">{t('cookies.title')}</h2>
          <p className="mb-4">{t('cookies.content')}</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>{t('cookies.types.essential.title')}</strong> – {t('cookies.types.essential.description')}</li>
            <li><strong>{t('cookies.types.preferences.title')}</strong> – {t('cookies.types.preferences.description')}</li>
            <li><strong>{t('cookies.types.analytics.title')}</strong> – {t('cookies.types.analytics.description')}</li>
          </ul>
        </section>

        {/* Data Retention */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">{t('retention.title')}</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>{t('retention.items.accounts.title')}</strong> – {t('retention.items.accounts.description')}</li>
            <li><strong>{t('retention.items.forumPosts.title')}</strong> – {t('retention.items.forumPosts.description')}</li>
            <li><strong>{t('retention.items.logs.title')}</strong> – {t('retention.items.logs.description')}</li>
          </ul>
        </section>

        {/* Data Deletion Requests */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">{t('deletion.title')}</h2>
          <p className="mb-4">{t('deletion.intro')}</p>

          <h3 className="text-xl font-semibold mb-3">{t('deletion.howToRequest.title')}</h3>
          <p className="mb-2">{t('deletion.howToRequest.content')}</p>
          <ul className="list-disc pl-6 mb-4 space-y-1">
            <li>{t('deletion.howToRequest.items.email')}</li>
            <li>{t('deletion.howToRequest.items.confirmation')}</li>
            <li>{t('deletion.howToRequest.items.reason')}</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">{t('deletion.timeline.title')}</h3>
          <ul className="list-disc pl-6 mb-4 space-y-1">
            <li>{t('deletion.timeline.acknowledgment')}</li>
            <li>{t('deletion.timeline.completion')}</li>
            <li>{t('deletion.timeline.confirmation')}</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">{t('deletion.whatGetsDeleted.title')}</h3>
          <ul className="list-disc pl-6 mb-4 space-y-1">
            <li>{t('deletion.whatGetsDeleted.items.account')}</li>
            <li>{t('deletion.whatGetsDeleted.items.profile')}</li>
            <li>{t('deletion.whatGetsDeleted.items.preferences')}</li>
            <li>{t('deletion.whatGetsDeleted.items.analytics')}</li>
            <li>{t('deletion.whatGetsDeleted.items.cookies')}</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">{t('deletion.whatGetsAnonymized.title')}</h3>
          <p className="mb-2">{t('deletion.whatGetsAnonymized.content')}</p>
          <ul className="list-disc pl-6 mb-2 space-y-1">
            <li>{t('deletion.whatGetsAnonymized.items.posts')}</li>
            <li>{t('deletion.whatGetsAnonymized.items.comments')}</li>
            <li>{t('deletion.whatGetsAnonymized.items.votes')}</li>
          </ul>
          <p className="mb-4 italic text-sm">{t('deletion.whatGetsAnonymized.note')}</p>

          <h3 className="text-xl font-semibold mb-3">{t('deletion.exceptions.title')}</h3>
          <p className="mb-2">{t('deletion.exceptions.content')}</p>
          <ul className="list-disc pl-6 mb-4 space-y-1">
            <li>{t('deletion.exceptions.items.legal')}</li>
            <li>{t('deletion.exceptions.items.fraud')}</li>
            <li>{t('deletion.exceptions.items.backups')}</li>
          </ul>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-4 mb-4">
            <h3 className="text-xl font-semibold mb-2">{t('deletion.noRecovery.title')}</h3>
            <p>{t('deletion.noRecovery.content')}</p>
          </div>
        </section>

        {/* Children's Privacy */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">{t('children.title')}</h2>
          <p>{t('children.content')}</p>
        </section>

        {/* International Users */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">{t('international.title')}</h2>
          <p>{t('international.content')}</p>
        </section>

        {/* Changes to Privacy Policy */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">{t('changes.title')}</h2>
          <p>{t('changes.content')}</p>
        </section>

        {/* Contact */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">{t('contact.title')}</h2>
          <p className="mb-4">{t('contact.content')}</p>
          <div className="bg-muted p-4 rounded-lg">
            <p className="font-mono text-sm">
              CanadaGPT<br />
              Email: privacy@canadagpt.ca<br />
              Website: https://canadagpt.ca
            </p>
          </div>
        </section>

        {/* Compliance */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">{t('compliance.title')}</h2>
          <p className="mb-2">{t('compliance.content')}</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>{t('compliance.laws.pipeda')}</li>
            <li>{t('compliance.laws.gdpr')}</li>
            <li>{t('compliance.laws.ccpa')}</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
