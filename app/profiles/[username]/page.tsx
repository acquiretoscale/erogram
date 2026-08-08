import connectDB from '@/lib/db/mongodb';
import { User } from '@/lib/models';
import { getPublicUserContributions } from '@/lib/actions/userProfile';
import SeedProfileAdminPanel from './SeedProfileAdminPanel';
import PrivateSeedProfileGate from './PrivateSeedProfileGate';
import Link from 'next/link';

interface PublicProfilePageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata(props: PublicProfilePageProps) {
  const params = await props.params;
  const username = decodeURIComponent(params.username).replace(/^@/, '');

  await connectDB();
  const user = await User.findOne({ username }).select('isProfileVisible firstName bio').lean() as {
    isProfileVisible?: boolean;
    firstName?: string;
    bio?: string;
  } | null;

  if (!user || user.isProfileVisible !== true) {
    return {
      title: 'Profile Not Found',
      description: 'This user profile does not exist or is not public.',
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `${user.firstName || username} | Erogram`,
    description: user.bio || `Profile of ${username} on Erogram`,
  };
}

function formatWhen(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function snippet(text: string, max = 140) {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trim()}…`;
}

export default async function PublicProfilePage(props: PublicProfilePageProps) {
  const params = await props.params;
  const username = decodeURIComponent(params.username).replace(/^@/, '');

  await connectDB();
  const user = (await User.findOne({ username }).lean()) as Record<string, any> | null;

  if (!user || user.isProfileVisible !== true) {
    // Private (or missing): never ship profile HTML to the public. Admin unlocks client-side.
    return <PrivateSeedProfileGate username={username} />;
  }

  const contributions = await getPublicUserContributions(String(user._id), 10);
  const joinedAt = new Date(user.createdAt).toISOString();

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-white">
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-sm text-slate-400 hover:text-white transition">
            ← Back to Erogram
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-8">
          <SeedProfileAdminPanel
            userId={String(user._id)}
            username={username}
            firstName={user.firstName || null}
            sex={user.sex || null}
            bio={user.bio || null}
            photoUrl={user.photoUrl || null}
            joinedAt={joinedAt}
          />
        </div>

        <div className="mt-8 bg-slate-800 rounded-lg border border-slate-700 p-8">
          <h2 className="text-lg font-bold text-white mb-1">Recent contributions</h2>
          <p className="text-sm text-slate-400 mb-6">Reviews, comments, and activity on Erogram</p>

          {contributions.length === 0 ? (
            <p className="text-sm text-slate-500">No public contributions yet.</p>
          ) : (
            <ul className="space-y-4">
              {contributions.map((item) => (
                <li key={item.id} className="border border-slate-700 rounded-lg p-4 bg-slate-900/40">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <Link href={item.href} className="text-sm font-semibold text-blue-400 hover:text-blue-300">
                      {item.label}
                    </Link>
                    <span className="text-xs text-slate-500 shrink-0">{formatWhen(item.createdAt)}</span>
                  </div>
                  {item.rating ? (
                    <p className="text-xs text-amber-400 mb-2">{item.rating}/5 stars</p>
                  ) : null}
                  {item.content ? (
                    <p className="text-sm text-slate-300 leading-relaxed">{snippet(item.content)}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
