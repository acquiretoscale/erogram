/**
 * Read articles from mongo_full/articles.bson (same file the restore script uses).
 * Used when the DB returns no articles so /articles always shows the backup content.
 */
import path from 'path';
import fs from 'fs';

const BACKUP_PATH = path.join(process.cwd(), '..', 'mongo_full', 'articles.bson');

function parseBsonFile(filePath: string): any[] {
  const buf = fs.readFileSync(filePath);
  const docs: any[] = [];
  let offset = 0;
  while (offset + 4 <= buf.length) {
    const size = buf.readInt32LE(offset);
    if (size < 5 || size > 10 * 1024 * 1024) break;
    if (offset + size > buf.length) break;
    const docBuf = buf.slice(offset, offset + size);
    const BSON = require('bson').BSON;
    docs.push(BSON.deserialize(docBuf));
    offset += size;
  }
  return docs;
}

export function getArticlesFromBackup(): any[] {
  if (!fs.existsSync(BACKUP_PATH)) return [];
  try {
    const docs = parseBsonFile(BACKUP_PATH);
    return docs
      .sort((a, b) => {
        const da = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const db = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return db - da;
      })
      .slice(0, 500)
      .map((article: any) => ({
        _id: article._id?.toString?.() ?? String(article._id),
        title: article.title || '',
        slug: article.slug || '',
        excerpt: article.excerpt || '',
        featuredImage: article.featuredImage || '',
        status: article.status || 'published',
        tags: article.tags || [],
        publishedAt: article.publishedAt || null,
        views: article.views || 0,
        createdAt: article.createdAt,
        updatedAt: article.updatedAt,
        author: { _id: '', username: 'erogram' },
      }));
  } catch (e) {
    console.error('[articles-from-backup]', e);
    return [];
  }
}
