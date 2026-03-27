'use client';

import { useEffect, useState } from 'react';
import { getTopClickedCreators, type TopCreator } from '@/lib/actions/ofmCreators';

export default function TopClicksPage() {
  const [creators, setCreators] = useState<TopCreator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTopClickedCreators(100).then((data) => {
      setCreators(data);
      setLoading(false);
    });
  }, []);

  const maxClicks = creators[0]?.clicks || 1;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Top 100 Most Clicked Creators</h1>
        <p className="text-white/40 text-sm mt-1">Ranked by total clicks on their profile page</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#00AFF0]" />
        </div>
      ) : creators.length === 0 ? (
        <div className="text-center py-20 text-white/30">No click data yet.</div>
      ) : (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-white/40 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left w-10">#</th>
                <th className="px-4 py-3 text-left">Creator</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Categories</th>
                <th className="px-4 py-3 text-right">Clicks</th>
                <th className="px-4 py-3 text-left w-40 hidden lg:table-cell">Bar</th>
              </tr>
            </thead>
            <tbody>
              {creators.map((c, i) => (
                <tr
                  key={c._id}
                  className="border-b border-white/[0.04] hover:bg-white/[0.03] transition"
                >
                  <td className="px-4 py-3 text-white/30 font-mono text-xs">{i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {c.avatar ? (
                        <img src={c.avatar} alt={c.name} className="w-8 h-8 rounded-full object-cover shrink-0 bg-white/5" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#00AFF0]/10 border border-[#00AFF0]/20 flex items-center justify-center shrink-0">
                          <span className="text-[#00AFF0] text-[10px] font-bold">{c.name?.[0]?.toUpperCase() || '?'}</span>
                        </div>
                      )}
                      <div>
                        <div className="text-white font-medium leading-tight">{c.name}</div>
                        <a
                          href={`/onlyfanssearch/${c.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white/30 text-xs hover:text-[#00AFF0] transition"
                        >
                          @{c.username}
                        </a>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {c.categories.slice(0, 3).map((cat) => (
                        <span key={cat} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/40">{cat}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-[#00AFF0] tabular-nums">
                    {c.clicks.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden w-36">
                      <div
                        className="h-full bg-[#00AFF0] rounded-full"
                        style={{ width: `${(c.clicks / maxClicks) * 100}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
