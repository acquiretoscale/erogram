import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import BlogHubClient from '../../BlogHubClient';
import { getBlogArticlesByCategory } from '@/lib/actions/blog';
import { getBlogCategory, BLOG_CATEGORY_SLUGS } from '@/lib/blog/categories';

export const revalidate = 60;

const BASE_URL = 'https://erogram.pro';

interface PageProps {
  params: Promise<{ category: string }>;
}

export function generateStaticParams() {
  return BLOG_CATEGORY_SLUGS.map((category) => ({ category }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category } = await params;
  const cat = getBlogCategory(category);
  if (!cat) return { title: 'Not Found', robots: { index: false, follow: false } };
  return {
    title: cat.metaTitle,
    description: cat.metaDescription,
    alternates: { canonical: `${BASE_URL}/blog/category/${cat.slug}` },
    openGraph: {
      title: cat.metaTitle,
      description: cat.metaDescription,
      type: 'website',
      siteName: 'Erogram',
      url: `${BASE_URL}/blog/category/${cat.slug}`,
    },
    twitter: { card: 'summary_large_image', title: cat.metaTitle, description: cat.metaDescription },
  };
}

export default async function BlogCategoryPage({ params }: PageProps) {
  const { category } = await params;
  const cat = getBlogCategory(category);
  if (!cat) notFound();

  const articles = await getBlogArticlesByCategory(cat.slug, 60);

  return (
    <BlogHubClient
      articles={articles}
      activeCategory={cat.slug}
      heading={cat.name}
      eyebrow="The Features"
      tagline={cat.tagline}
    />
  );
}
