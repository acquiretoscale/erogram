/**
 * Fix cover + 3-image gallery for XMODE / AI Peep (coverManaged without imageOverride bug).
 * Run: node --env-file=.env.local scripts/fix-xmode-aipeep-gallery.mjs
 */
import mongoose from 'mongoose';

const XMODE_SLUG = 'xmode-ai-nsfw-image-generator';
const AIPEEP_SLUG = 'ai-peep-ai-nsfw-chat';
const R2 = 'https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev';

const xmodeCover = `${R2}/ainsfw/${XMODE_SLUG}.webp`;
const xmodeGallery = [
  xmodeCover,
  `${R2}/ainsfw/gallery/${XMODE_SLUG}-1.webp`,
  `${R2}/ainsfw/gallery/${XMODE_SLUG}-2.webp`,
];
const aipeepCover = `${R2}/ainsfw/${AIPEEP_SLUG}.webp`;

await mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection.db;
const statsCol = db.collection('ainsfwtoolstats');
const subCol = db.collection('ainsfwsubmissions');

await statsCol.updateOne(
  { slug: XMODE_SLUG },
  {
    $set: {
      imageOverride: xmodeCover,
      coverManaged: true,
      customGallery: xmodeGallery,
      galleryManaged: true,
    },
  },
);
await subCol.updateOne(
  { slug: XMODE_SLUG },
  { $set: { screenshots: xmodeGallery } },
);

await statsCol.updateOne(
  { slug: AIPEEP_SLUG },
  {
    $set: {
      imageOverride: aipeepCover,
      coverManaged: true,
      customGallery: [aipeepCover],
      galleryManaged: true,
    },
  },
);
await subCol.updateOne(
  { slug: AIPEEP_SLUG },
  { $set: { screenshots: [aipeepCover] } },
);

console.log('Fixed', XMODE_SLUG, 'gallery count', xmodeGallery.length);
console.log('Fixed', AIPEEP_SLUG);
await mongoose.disconnect();
