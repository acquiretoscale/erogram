import { NextRequest, NextResponse } from 'next/server';
import { listFolders, listFiles, deleteFile } from '@/lib/r2';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const folder = searchParams.get('folder');
  const withCounts = searchParams.get('withCounts') === '1';

  if (!folder) {
    const folderNames = await listFolders();
    if (withCounts) {
      const foldersWithCount = await Promise.all(
        folderNames.map(async (name) => {
          const files = await listFiles(name);
          return { name, count: files.length };
        })
      );
      return NextResponse.json({ folders: foldersWithCount });
    }
    return NextResponse.json({ folders: folderNames });
  }

  const files = await listFiles(folder);
  return NextResponse.json({ files });
}

export async function DELETE(req: NextRequest) {
  const { keys } = await req.json() as { keys: string[] };
  if (!Array.isArray(keys) || keys.length === 0) {
    return NextResponse.json({ error: 'keys[] required' }, { status: 400 });
  }
  let deleted = 0;
  for (const key of keys) {
    try { await deleteFile(key); deleted++; } catch { /* skip */ }
  }
  return NextResponse.json({ deleted });
}
