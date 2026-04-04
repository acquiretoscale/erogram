import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator } from '@/lib/models';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function Top100Page() {
  await connectDB();

  const creators = await OnlyFansCreator.find({
    avatar: { $ne: '' },
    gender: 'female',
    deleted: { $ne: true },
    likesCount: { $gt: 0 },
  })
    .sort({ scrapedAt: -1, likesCount: -1 })
    .limit(100)
    .select('name username slug avatar likesCount isFree price scrapedAt')
    .lean() as any[];

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: 900, margin: '0 auto', padding: '32px 16px', background: '#fff', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>Top 100 Female OnlyFans Creators</h1>
      <p style={{ color: '#888', fontSize: 14, marginBottom: 32 }}>
        {creators.length} creators — sorted by recently added · click name to open profile
      </p>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
            <th style={{ padding: '8px 4px', width: 40 }}>#</th>
            <th style={{ padding: '8px 4px', width: 52 }}></th>
            <th style={{ padding: '8px 4px' }}>Name</th>
            <th style={{ padding: '8px 4px' }}>Username</th>
            <th style={{ padding: '8px 4px', textAlign: 'right' }}>Likes</th>
            <th style={{ padding: '8px 4px', textAlign: 'center' }}>Price</th>
            <th style={{ padding: '8px 4px' }}>Erogram Link</th>
          </tr>
        </thead>
        <tbody>
          {creators.map((c, i) => (
            <tr key={c._id.toString()} style={{ borderBottom: '1px solid #f0f0f0', verticalAlign: 'middle' }}>
              <td style={{ padding: '8px 4px', color: '#bbb', fontWeight: 700 }}>{i + 1}</td>
              <td style={{ padding: '4px' }}>
                {c.avatar && (
                  <img
                    src={c.avatar}
                    alt={c.name}
                    width={40}
                    height={40}
                    style={{ borderRadius: 8, objectFit: 'cover', display: 'block' }}
                    referrerPolicy="no-referrer"
                  />
                )}
              </td>
              <td style={{ padding: '8px 4px', fontWeight: 700 }}>
                <Link href={`/${c.slug}`} style={{ color: '#0077cc', textDecoration: 'none' }}>
                  {c.name}
                </Link>
              </td>
              <td style={{ padding: '8px 4px', color: '#666' }}>@{c.username}</td>
              <td style={{ padding: '8px 4px', textAlign: 'right', color: '#333' }}>
                {c.likesCount >= 1_000_000
                  ? `${(c.likesCount / 1_000_000).toFixed(1)}M`
                  : c.likesCount >= 1_000
                  ? `${(c.likesCount / 1_000).toFixed(0)}K`
                  : c.likesCount}
              </td>
              <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 700, background: c.isFree ? '#e6f9ee' : '#e8f4ff', color: c.isFree ? '#16a34a' : '#0077cc' }}>
                  {c.isFree ? 'Free' : `$${(c.price ?? 0).toFixed(0)}`}
                </span>
              </td>
              <td style={{ padding: '8px 4px' }}>
                <a
                  href={`https://erogram.pro/${c.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#0077cc', fontSize: 12 }}
                >
                  erogram.pro/{c.slug}
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
