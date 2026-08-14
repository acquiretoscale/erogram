import connectDB from '@/lib/db/mongodb';
import { User } from '@/lib/models';
import { getPublicUserContributions } from '@/lib/actions/userProfile';
import SeedProfileAdminPanel from './SeedProfileAdminPanel';
import PrivateSeedProfileGate from './PrivateSeedProfileGate';
import ProfileLoginGate from './ProfileLoginGate';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

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

  if (!user || user.isProfileVisible === false) {
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

const CREAM = '#F7F4EC';
const PLUM = '#2B1B28';
const MUTED = '#6B6568';
const BORDER = 'rgba(43,27,40,0.12)';

export default async function PublicProfilePage(props: PublicProfilePageProps) {
  const params = await props.params;
  const username = decodeURIComponent(params.username).replace(/^@/, '');

  await connectDB();
  const user = (await User.findOne({ username }).lean()) as Record<string, any> | null;

  const profilePath = `/profiles/${encodeURIComponent(username)}`;

  if (!user || user.isProfileVisible === false) {
    return <PrivateSeedProfileGate username={username} redirectPath={profilePath} />;
  }

  const contributions = await getPublicUserContributions(String(user._id), 10);
  const joinedAt = new Date(user.createdAt).toISOString();
  const displayName = user.firstName || username;

  return (
    <ProfileLoginGate redirectPath={profilePath}>
      <Navbar />
      <main
        className="min-h-screen font-[family-name:var(--font-baloo)]"
        style={{ backgroundColor: CREAM, color: PLUM }}
      >
        <div className="pt-24 pb-12">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <nav aria-label="Breadcrumb" className="mb-6">
              <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 list-none p-0 m-0 text-[11px] font-semibold" style={{ color: MUTED }}>
                <li>
                  <Link href="/" className="hover:opacity-70 transition-opacity" style={{ color: MUTED }}>
                    Home
                  </Link>
                </li>
                <li aria-hidden className="select-none" style={{ color: 'rgba(43,27,40,0.28)' }}>/</li>
                <li>
                  <Link href="/community" className="hover:opacity-70 transition-opacity" style={{ color: MUTED }}>
                    Community
                  </Link>
                </li>
                <li aria-hidden className="select-none" style={{ color: 'rgba(43,27,40,0.28)' }}>/</li>
                <li className="font-bold truncate max-w-[200px]" style={{ color: PLUM }} aria-current="page">
                  {displayName}
                </li>
              </ol>
            </nav>

            <div
              className="rounded-2xl border overflow-hidden mb-6"
              style={{
                backgroundColor: CREAM,
                borderColor: BORDER,
                boxShadow: '0 30px 80px -30px rgba(43,27,40,0.2)',
              }}
            >
              <div
                className="relative h-28 sm:h-36"
                style={{ background: 'linear-gradient(135deg, #3a0f1e 0%, #240a14 50%, #0c0508 100%)' }}
              />
              <div className="px-5 sm:px-8 pb-7 -mt-12 relative">
                <SeedProfileAdminPanel
                  userId={String(user._id)}
                  username={username}
                  firstName={user.firstName || null}
                  sex={user.sex || null}
                  country={user.country || null}
                  bio={user.bio || null}
                  photoUrl={user.photoUrl || null}
                  joinedAt={joinedAt}
                />
              </div>
            </div>

            <div
              className="rounded-2xl border p-5 sm:p-8"
              style={{
                backgroundColor: CREAM,
                borderColor: BORDER,
                boxShadow: '0 18px 40px -28px rgba(43,27,40,0.28)',
              }}
            >
              <div className="text-[10px] font-bold tracking-[0.28em] uppercase mb-2" style={{ color: PLUM }}>
                Activity
              </div>
              <h2 className="text-xl font-extrabold mb-1" style={{ color: PLUM }}>
                Recent contributions
              </h2>
              <p className="text-sm mb-6" style={{ color: MUTED }}>
                Reviews, comments, and activity on Erogram
              </p>

              {contributions.length === 0 ? (
                <p className="text-sm" style={{ color: MUTED }}>No public contributions yet.</p>
              ) : (
                <ul className="space-y-3">
                  {contributions.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-xl border p-4"
                      style={{ backgroundColor: 'rgba(43,27,40,0.03)', borderColor: BORDER }}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <Link href={item.href} className="text-sm font-bold hover:opacity-70 transition-opacity" style={{ color: PLUM }}>
                          {item.label}
                        </Link>
                        <span className="text-xs shrink-0 tabular-nums" style={{ color: MUTED }}>{formatWhen(item.createdAt)}</span>
                      </div>
                      {item.rating ? (
                        <p className="text-xs mb-2" style={{ color: PLUM }}>{item.rating}/5 stars</p>
                      ) : null}
                      {item.content ? (
                        <p className="text-sm leading-relaxed" style={{ color: MUTED }}>{snippet(item.content)}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </main>
      <div style={{ background: 'linear-gradient(to bottom, #3d2538 0%, #2B1B28 100%)' }}>
        <Footer />
      </div>
    </ProfileLoginGate>
  );
}
