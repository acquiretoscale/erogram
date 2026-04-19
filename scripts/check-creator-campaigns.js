/* eslint-disable */
// Fix existing onlyfans-creator campaigns: use R2 avatar from creator DB if available.
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) { console.error('MONGODB_URI not set'); process.exit(1); }

async function main() {
  await mongoose.connect(MONGO_URI);
  const campaigns = mongoose.connection.db.collection('campaigns');
  const creators = mongoose.connection.db.collection('onlyfanscreators');

  const ofCamps = await campaigns.find({ adType: 'onlyfans-creator' }).toArray();
  console.log(`\n${ofCamps.length} onlyfans-creator campaign(s)\n`);

  for (const camp of ofCamps) {
    const creative = camp.creative || '';
    const isR2 = creative.includes('r2.dev');
    const username = (camp.ofUsername || '').toLowerCase();

    const creator = await creators.findOne(
      { username: { $regex: new RegExp(`^${username}$`, 'i') } },
      { projection: { avatar: 1, slug: 1, username: 1 } }
    );

    const dbAvatar = creator?.avatar || '';
    const dbIsR2 = dbAvatar.includes('r2.dev');

    console.log(`  @${username}:`);
    console.log(`    campaign creative: ${isR2 ? '✓ R2' : '✗ NOT R2'} — ${creative.slice(0, 80)}`);
    console.log(`    DB avatar:         ${dbIsR2 ? '✓ R2' : '✗ NOT R2'} — ${dbAvatar.slice(0, 80)}`);

    if (!isR2 && dbIsR2) {
      console.log(`    → Fixing: updating campaign creative to R2 avatar`);
      await campaigns.updateOne({ _id: camp._id }, { $set: { creative: dbAvatar } });
    } else if (!isR2 && !dbIsR2) {
      console.log(`    ⚠ Both non-R2. Needs R2 processing in production.`);
    }
    console.log('');
  }

  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
