import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { TgPostLog } from '@/lib/models';
import { listFolders, listFiles } from '@/lib/r2';

export async function GET() {
  await connectDB();

  const folderNames = await listFolders();

  // Batch: get all posted keys in one aggregation instead of N queries
  const postedByFolder = await TgPostLog.aggregate([
    { $match: { status: 'success', mediaKey: { $ne: '', $exists: true } } },
    { $group: { _id: '$mediaFolder', keys: { $addToSet: '$mediaKey' } } },
  ]);
  const postedMap = new Map<string, Set<string>>();
  for (const p of postedByFolder) {
    if (p._id) postedMap.set(p._id, new Set(p.keys));
  }

  // For legacy logs without mediaFolder, batch them separately
  const legacyLogs = await TgPostLog.find({
    status: 'success',
    mediaKey: { $ne: '', $exists: true },
    $or: [{ mediaFolder: null }, { mediaFolder: '' }],
  }).select('mediaKey').lean();
  const legacyKeys = (legacyLogs as { mediaKey: string }[]).map(l => l.mediaKey);

  const stats = await Promise.all(
    folderNames.map(async (folder) => {
      const files = await listFiles(folder);
      const totalFiles = files.length;
      if (totalFiles === 0) return { folder, total: 0, queued: 0, archived: 0 };

      const folderPosted = postedMap.get(folder) || new Set<string>();
      // Also check legacy keys by pattern matching
      for (const k of legacyKeys) {
        if (k.includes(`/${folder}/`)) folderPosted.add(k);
      }

      const queued = files.filter(f => !folderPosted.has(f.key)).length;
      return { folder, total: totalFiles, queued, archived: totalFiles - queued };
    })
  );

  return NextResponse.json({ stats });
}
