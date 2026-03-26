import { Metadata } from 'next';
import { AI_NSFW_TOOLS } from './data';
import AINsfwClient from './AINsfwClient';
import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n';
import { getAllToolStats } from '@/lib/actions/ainsfw';

const BASE_URL = 'https://erogram.pro';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dict = await getDictionary(locale);

  return {
    title: dict.meta.ainsfwTitle,
    description: dict.meta.ainsfwDesc,
    keywords:
      'ai girlfriend, undress ai, ai chat nsfw, ai companion, ai nsfw tools, best ai girlfriend 2026, ai undress, ai chatbot nsfw, erogram',
    other: { rating: 'adult' },
    alternates: {
      canonical: `${BASE_URL}/ainsfw`,
    },
    openGraph: {
      title: dict.meta.ainsfwTitle,
      description: dict.meta.ainsfwDesc,
      type: 'website',
      url: `${BASE_URL}/ainsfw`,
      siteName: 'Erogram',
      images: [
        {
          url: `${BASE_URL}/assets/og-default.png`,
          width: 512,
          height: 512,
          alt: 'Erogram — AI NSFW Tools',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: dict.meta.ainsfwTitle,
      description: dict.meta.ainsfwDesc,
      images: [`${BASE_URL}/assets/og-default.png`],
    },
  };
}

export default async function AINsfwPage() {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const a = dict.ainsfw ?? {};
  const allStats = await getAllToolStats(AI_NSFW_TOOLS.map(t => t.slug));

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: a.heroTitle || 'Best AI NSFW Tools 2026',
    description: a.guideSubtitle || 'Curated list of the best AI NSFW tools.',
    url: `${BASE_URL}/ainsfw`,
    numberOfItems: AI_NSFW_TOOLS.length,
    itemListElement: AI_NSFW_TOOLS.map((tool, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: tool.name,
      url: `${BASE_URL}/${tool.slug}`,
    })),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'AI NSFW Tools', item: `${BASE_URL}/ainsfw` },
    ],
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: a.faqQ1 || 'What are AI Girlfriend apps?',
        acceptedAnswer: { '@type': 'Answer', text: a.faqA1 || '' },
      },
      {
        '@type': 'Question',
        name: a.faqQ2 || 'What is Undress AI?',
        acceptedAnswer: { '@type': 'Answer', text: a.faqA2 || '' },
      },
      {
        '@type': 'Question',
        name: a.faqQ3 || 'Are AI NSFW chatbots free?',
        acceptedAnswer: { '@type': 'Answer', text: a.faqA3 || '' },
      },
      {
        '@type': 'Question',
        name: a.faqQ4 || 'What AI tools accept crypto payments?',
        acceptedAnswer: { '@type': 'Answer', text: a.faqA4 || '' },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <AINsfwClient tools={AI_NSFW_TOOLS} allStats={allStats} />
    </>
  );
}
