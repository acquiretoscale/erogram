import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator } from '@/lib/models';
import { getCreatorBio } from '@/app/onlyfanssearch/creatorBios';

export const revalidate = 0;

export default async function Top100CleanPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { filter } = await searchParams;
  await connectDB();
  const docs = await OnlyFansCreator.find({ adminImported: true, deleted: { $ne: true } })
    .sort({ likesCount: -1 })
    .limit(500)
    .select('name username slug avatar likesCount price isFree bio telegramUrl')
    .lean() as any[];

  const enriched = docs.map((d: any) => {
    const bioData = getCreatorBio(d.username);
    return { ...d, _id: d._id.toString(), hasCustomBio: !!bioData, hasTelegram: !!(d.telegramUrl || bioData?.telegram) };
  });

  const filtered = filter === 'done' ? enriched.filter((d: any) => d.hasCustomBio)
    : filter === 'missing' ? enriched.filter((d: any) => !d.hasCustomBio)
    : enriched;

  const done = enriched.filter((d: any) => d.hasCustomBio).length;
  const missing = enriched.filter((d: any) => !d.hasCustomBio).length;

  return (
    <div style={{ background: '#111', color: '#eee', padding: 20, fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>YOUR CLEAN LIST ({enriched.length} creators)</h1>
      <p style={{ color: '#00ff88', marginBottom: 4 }}>DONE: {done} | <span style={{ color: '#ff4444' }}>MISSING: {missing}</span></p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <a href="/OF/top100clean" style={{ padding: '6px 14px', borderRadius: 8, background: !filter ? '#00AFF0' : '#222', color: !filter ? '#000' : '#aaa', textDecoration: 'none', fontWeight: 700, fontSize: 13 }}>ALL ({enriched.length})</a>
        <a href="/OF/top100clean?filter=done" style={{ padding: '6px 14px', borderRadius: 8, background: filter === 'done' ? '#00ff88' : '#222', color: filter === 'done' ? '#000' : '#aaa', textDecoration: 'none', fontWeight: 700, fontSize: 13 }}>DONE ({done})</a>
        <a href="/OF/top100clean?filter=missing" style={{ padding: '6px 14px', borderRadius: 8, background: filter === 'missing' ? '#ff4444' : '#222', color: filter === 'missing' ? '#000' : '#aaa', textDecoration: 'none', fontWeight: 700, fontSize: 13 }}>MISSING ({missing})</a>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #333', textAlign: 'left' }}>
            <th style={{ padding: '8px 4px', width: 30 }}>#</th>
            <th style={{ padding: '8px 4px', width: 40 }}>Pic</th>
            <th style={{ padding: '8px 4px' }}>Username</th>
            <th style={{ padding: '8px 4px' }}>Likes</th>
            <th style={{ padding: '8px 4px' }}>Bio</th>
            <th style={{ padding: '8px 4px' }}>TG</th>
            <th style={{ padding: '8px 4px' }}>Link</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((d: any, i: number) => {
            const likes = d.likesCount >= 1000000 ? `${(d.likesCount / 1000000).toFixed(1)}M` : d.likesCount >= 1000 ? `${Math.round(d.likesCount / 1000)}K` : String(d.likesCount || 0);
            return (
              <tr key={d.slug} style={{ borderBottom: '1px solid #1a1a1a', background: d.hasCustomBio ? 'transparent' : '#1a0000' }}>
                <td style={{ padding: '6px 4px', color: '#555' }}>{i + 1}</td>
                <td style={{ padding: '6px 4px' }}>
                  {d.avatar ? <img src={d.avatar} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover' }} referrerPolicy="no-referrer" /> : <div style={{ width: 32, height: 32, borderRadius: 6, background: '#333' }} />}
                </td>
                <td style={{ padding: '6px 4px', fontWeight: 700 }}>@{d.username}</td>
                <td style={{ padding: '6px 4px' }}>{likes}</td>
                <td style={{ padding: '6px 4px' }}>{d.hasCustomBio ? <span style={{ color: '#00ff88', fontWeight: 700 }}>DONE</span> : <span style={{ color: '#ff4444' }}>MISSING</span>}</td>
                <td style={{ padding: '6px 4px' }}>{d.hasTelegram ? <span style={{ color: '#00ff88', fontWeight: 700 }}>YES</span> : <span style={{ color: '#555' }}>N/A</span>}</td>
                <td style={{ padding: '6px 4px' }}><a href={`/${d.slug}`} target="_blank" rel="noreferrer" style={{ color: '#00AFF0', textDecoration: 'none' }}>/{d.slug}</a></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
