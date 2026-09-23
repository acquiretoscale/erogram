'use client';

import { useEffect, useState } from 'react';

interface Log {
  _id: string;
  groupName: string;
  mediaKey: string;
  status: string;
  error: string;
  postedAt: string;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/logs').then(r => r.json()).then(data => {
      setLogs(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <p className="text-[#888]">Loading...</p>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Post Logs</h2>

      {logs.length === 0 ? (
        <div className="text-center py-16 text-[#888]">
          <p>No posts yet. Use "Post Now" from the dashboard to send your first batch.</p>
        </div>
      ) : (
        <div className="bg-[#111] border border-white/10 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[#888]">
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Group</th>
                <th className="text-left p-3 font-medium">Media</th>
                <th className="text-left p-3 font-medium">Time</th>
                <th className="text-left p-3 font-medium">Error</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log._id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${log.status === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="p-3 text-white">{log.groupName || '—'}</td>
                  <td className="p-3 text-[#888] truncate max-w-[200px]">{log.mediaKey ? log.mediaKey.split('/').pop() : '—'}</td>
                  <td className="p-3 text-[#888]">{new Date(log.postedAt).toLocaleString()}</td>
                  <td className="p-3 text-red-400 text-xs truncate max-w-[250px]">{log.error || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
