import { Metadata } from 'next';
import HomeClient from './HomeClient';
import connectDB from '@/lib/db/mongodb';
import ErrorBoundary from '@/components/ErrorBoundary';
import { getActiveCampaigns } from '@/lib/actions/campaigns';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://erogram.pro';

async function getFeaturedArticles(limit: number = 6) {
  try {
    await connectDB();

    // Use native MongoDB for performance
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('MongoDB connection not available');
    }
    const articlesCollection = db.collection('articles');
    const usersCollection = db.collection('users');

    // Get featured articles (published, sorted by publishedAt desc)
    const articlesRaw = await articlesCollection
      .find({ status: 'published' })
      .sort({ publishedAt: -1, createdAt: -1 })
      .project({
        content: 0, // Exclude content for performance
        metaTitle: 0,
        metaDescription: 0,
        metaKeywords: 0,
        ogImage: 0,
        ogTitle: 0,
        ogDescription: 0,
        twitterCard: 0,
        twitterImage: 0,
        twitterTitle: 0,
        twitterDescription: 0
      })
      .limit(limit)
      .toArray();

    // Get author IDs
    const authorIds = new Set<string>();
    articlesRaw.forEach((article: any) => {
      if (article.author) {
        const authorId = article.author instanceof mongoose.Types.ObjectId
          ? article.author.toString()
          : String(article.author);
        authorIds.add(authorId);
      }
    });

    // Batch fetch authors
    const authorsMap = new Map<string, { _id: string; username: string }>();
    if (authorIds.size > 0) {
      const ObjectId = mongoose.Types.ObjectId;
      const authorObjectIds = Array.from(authorIds)
        .filter(id => ObjectId.isValid(id))
        .map(id => new ObjectId(id));

      if (authorObjectIds.length > 0) {
        const authorDocs = await usersCollection
          .find({ _id: { $in: authorObjectIds } })
          .project({ username: 1, _id: 1 })
          .toArray();

        authorDocs.forEach((author: any) => {
          const authorId = author._id.toString();
          authorsMap.set(authorId, {
            _id: authorId,
            username: author.username || 'erogram'
          });
        });
      }
    }

    // Build result objects
    const articles = articlesRaw.map((article: any) => {
      const result: any = {
        _id: article._id.toString(),
        title: article.title || '',
        slug: article.slug || '',
        excerpt: article.excerpt || '',
        featuredImage: article.featuredImage || '',
        tags: article.tags || [],
        publishedAt: article.publishedAt || null,
        views: article.views || 0,
        author: { _id: '', username: 'erogram' },
      };

      // Get author from map
      if (article.author) {
        const authorId = article.author instanceof mongoose.Types.ObjectId
          ? article.author.toString()
          : String(article.author);
        const author = authorsMap.get(authorId);
        result.author = author || { _id: '', username: 'erogram' };
      }

      return result;
    });

    return articles;
  } catch (error) {
    console.error('Error fetching featured articles:', error);
    return [];
  }
}

export const metadata: Metadata = {
  title: 'erogram.pro – Telegram Groups & Channels Directory',
  description: 'Explore thousands of NSFW Telegram groups, channels, and AI companion bots. Connect with like-minded adults in curated communities for dating, chat, gaming, and more. Safe, verified, and updated daily.',
  keywords: 'NSFW telegram groups, adult telegram communities, NSFW channels, adult chat groups, telegram dating groups, erotic telegram groups, adult messaging, NSFW telegram bots, AI companion bots, adult chat bots',
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title: 'erogram.pro – Telegram Groups & Channels Directory',
    description: 'Explore thousands of NSFW Telegram groups, channels, and AI companion bots. Connect with like-minded adults in curated communities for dating, chat, gaming, and more.',
    type: 'website',
    siteName: 'Erogram',
    url: siteUrl,
    images: [
      {
        url: `${siteUrl}/assets/image.jpg`,
        width: 1200,
        height: 630,
        alt: 'Erogram - NSFW Telegram Groups, Channels & Bots Directory',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'erogram.pro – Telegram Groups & Channels Directory',
    description: 'Explore thousands of NSFW Telegram groups, channels, and AI companion bots. Connect with like-minded adults in curated communities.',
    images: [`${siteUrl}/assets/image.jpg`],
  },
};

export default async function Home() {
  const featuredArticles = await getFeaturedArticles(6);
  const heroCampaigns = await getActiveCampaigns('homepage-hero');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Erogram',
    description: 'Directory of NSFW Telegram groups, channels, and AI companion bots for adults',
    url: siteUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteUrl}/groups?search={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Erogram',
      url: siteUrl,
    },
    mainEntity: {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is Erogram?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Erogram is the ultimate directory for discovering NSFW Telegram groups, channels, and AI companion bots. We curate and verify adult-oriented communities and bots to help you find like-minded people and engaging AI companions that match your interests.',
          },
        },
        {
          '@type': 'Question',
          name: "What's the difference between groups and bots?",
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Groups are community spaces where multiple people chat and interact, while bots are AI-powered companions that provide personalized conversations, entertainment, and interactive experiences. Both are fully integrated into our platform.',
          },
        },
        {
          '@type': 'Question',
          name: 'Are all communities and bots safe?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes, we take safety seriously. All groups and bots listed on Erogram are verified and moderated to ensure they meet our community standards. We regularly review content to maintain a safe environment for all users.',
          },
        },
        {
          '@type': 'Question',
          name: 'How do I join a Telegram group or use a bot?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: "Simply click on any group or bot card and follow the Telegram link. You'll be redirected to Telegram where you can join the group or start chatting with the bot instantly. Make sure you have the Telegram app installed for the best experience.",
          },
        },
        {
          '@type': 'Question',
          name: 'Is Erogram free to use?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: "Yes, Erogram is completely free to use. We don't charge for browsing groups, using bots, joining communities, or accessing our content. Our service is supported through partnerships and donations.",
          },
        },
        {
          '@type': 'Question',
          name: 'How often are new groups and bots added?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'We add fresh groups and bots daily from our community submissions. Our team reviews and approves new content regularly to ensure quality and relevance. Check back often for the latest additions!',
          },
        },
        {
          '@type': 'Question',
          name: 'Can I submit my own group or bot?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: "Yes! You can submit your own group or bot using the 'Add' button in the navigation bar. Fill out the form with your details, and our team will review and approve it. Once approved, your content will be visible to all users on our platform.",
          },
        },
      ],
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd),
        }}
      />
      <ErrorBoundary>
        <HomeClient featuredArticles={featuredArticles} heroCampaigns={heroCampaigns} />
      </ErrorBoundary>
    </>
  );
}
