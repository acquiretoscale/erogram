import { redirect } from 'next/navigation';
import { AI_NSFW_TOOLS, getToolBySlug } from '../data';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return AI_NSFW_TOOLS.map((tool) => ({ slug: tool.slug }));
}

export default async function AINsfwToolRedirect({ params }: PageProps) {
  const { slug } = await params;
  const tool = getToolBySlug(slug);
  if (tool) {
    redirect(`/${tool.slug}`);
  }
  redirect('/ainsfw');
}
