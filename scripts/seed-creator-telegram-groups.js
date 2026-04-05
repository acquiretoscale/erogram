const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) { console.error('MONGODB_URI not set'); process.exit(1); }

const creators = [
  { username: 'amouranth', name: 'Amouranth', telegram: 'https://t.me/Amouranth_Kaitlyn', bio: 'Kaitlyn Siragusa, known online as Amouranth, is a 31-year-old content creator from Texas. She originally built her audience on Twitch streaming cosplay, ASMR, and hot tub content before shifting her main focus to OnlyFans.' },
  { username: 'sharonwinner', name: 'Sharonwinner', telegram: 'https://t.me/sharonwinneronlyfan', bio: 'Sharonwinner is one of the more established creators on OnlyFans, having joined the platform back in May 2020. She charges $25 per month and has steadily built up a following with around 175K likes.' },
  { username: 'milkimind', name: 'Milkimind', telegram: 'https://t.me/milkimind', bio: 'Milkimind has become quite popular in a relatively short time, currently sitting at an impressive 755K likes on her OnlyFans profile with a very accessible $4 monthly subscription.' },
  { username: 'leslyeanuket', name: 'Leslyeanuket', telegram: 'https://t.me/lesly_w1', bio: 'Leslyeanuket is a popular creator with 27K likes on her OnlyFans profile. She charges $50 per month and is active across multiple platforms including Instagram, TikTok, and Telegram.' },
  { username: 'sugeyabrego', name: 'Sugeyabrego', telegram: 'https://t.me/sugeyabrego', bio: 'Sugeyabrego has been on OnlyFans since the early days, joining back in 2020. With 157K likes and an $8 monthly subscription, she has built a loyal audience through steady, reliable content.' },
  { username: 'skylarmaexo', name: 'Skylarmaexo', telegram: 'https://t.me/skylarmaexo_unofficial', bio: 'Skylarmaexo is one of the biggest creators on OnlyFans with over 6.3 million likes. She charges $30 per month and has built an enormous following through high production quality.' },
  { username: 'lilyphillips', name: 'Lily Phillips', telegram: 'https://t.me/lilyphillipsofficial', bio: 'Lily Phillips has 3.6 million likes on her OnlyFans profile and charges $10 per month. She became very popular very quickly and is known for her extreme content and high engagement.' },
  { username: 'angelawhite', name: 'Angela White', telegram: 'https://t.me/AngelaWhite_officialchannel', bio: 'Angela White stands in a league of her own in the adult industry. With over 3.1 million likes on OnlyFans at just $5 per month, she has built one of the most successful creator pages in the world.' },
  { username: 'emmamagnoliaxo', name: 'Emma Magnolia', telegram: 'https://t.me/emmamagnoliaxo', bio: 'Emma Magnolia has 3 million likes on her OnlyFans profile and charges $12 per month. She has grown very quickly and is known for her high quality content and engaging personality.' },
  { username: 'francety', name: 'Francety', telegram: 'https://t.me/francety_oficial', bio: 'Francety has 2.4 million likes on her OnlyFans profile and offers free subscription. She has built one of the largest free creator audiences on the platform.' },
  { username: 'anacheri', name: 'Ana Cheri', telegram: 'https://t.me/anacherio', bio: 'Ana Cheri has 1.9 million likes on her OnlyFans and offers free subscription. Before entering the adult space she was a successful mainstream fitness model and Playboy Playmate.' },
  { username: 'belledelphine', name: 'Belle Delphine', telegram: 'https://t.me/belledelphine', bio: 'Belle Delphine is one of the most recognizable internet personalities to have crossed into adult content. With 1.5 million likes on OnlyFans at $35 per month.' },
  { username: 'ashleyyyreyyy', name: 'Ashleyyyreyyy', telegram: 'https://t.me/Ashley_Reynolds_Ashleyyyreyyy', bio: 'Ashleyyyreyyy (Ashley Reynolds) has grown to 1.4 million likes while offering completely free subscription. Her Telegram has over 15,000 subscribers.' },
  { username: 'sophieraiin', name: 'Sophie Rain', telegram: 'https://t.me/sophieraiinof0', bio: 'Sophie Rain has 1.1 million likes on OnlyFans at $10 per month. She joined in May 2023 and rose to the top faster than almost anyone else in the platform history.' },
  { username: 'bryceadamsfree', name: 'Bryce Adams', telegram: 'https://t.me/fitbryceadams', bio: 'Bryce Adams Free has reached 1 million likes while offering completely free subscription. She stands out for her athletic build and high production quality.' },
  { username: 'sofiiiiagomez', name: 'Sofia Gomez', telegram: 'https://t.me/sofiiagomez_of', bio: 'Sofia Gomez has 986K likes on her OnlyFans profile and charges $20 per month. She has built a substantial following and is known for her engaging content and personality.' },
  { username: 'babydollll', name: 'Ms. Sethi', telegram: 'https://t.me/babymssethii', bio: 'Babydollll, known as Ms. Sethi, has 903K likes on her OnlyFans profile and charges $10 per month. She brands herself as The Baddest Indian.' },
  { username: 'chloekhan', name: 'Chloe Khan', telegram: 'https://t.me/OnlyChloeKhan', bio: 'Chloe Khan has 808K likes on her OnlyFans profile and charges $6 per month. She is a British celebrity and former X Factor contestant who has transitioned to OnlyFans.' },
  { username: 'tanamongeau', name: 'Tana Mongeau', telegram: 'https://t.me/tanamongeau_official', bio: 'Tana Mongeau is one of the most well known YouTubers and internet personalities to have joined OnlyFans. With 714K likes and a free subscription.' },
  { username: 'valenappi', name: 'Valentina Nappi', telegram: 'https://t.me/canalenappi', bio: 'Valentina Nappi has 649K likes on her OnlyFans profile and charges $10 per month. She is a well known Italian adult performer active in the industry for many years.' },
  { username: 'miakhalifa', name: 'Mia Khalifa', telegram: 'https://t.me/miakalifaofficial', bio: 'Mia Khalifa has 480K likes on her OnlyFans profile and charges $10 per month. She is a former adult performer who became one of the most recognizable names in the industry.' },
  { username: 'milamondell', name: 'Milamondell', telegram: 'https://t.me/milamondell', bio: 'Milamondell is one of the biggest creators on OnlyFans with 3.1 million likes on her profile. She offers free subscription which has helped her grow an enormous audience.' },
  { username: 'bhadbhabie', name: 'Bhad Bhabie', telegram: 'https://t.me/bhabiegang', bio: 'Bhad Bhabie (Danielle Bregoli) became famous from her Cash me outside viral moment on Dr. Phil and has successfully turned that internet fame into a massive OnlyFans career with 1.9 million likes.' },
  { username: 'gem101', name: 'Gem101', telegram: 'https://t.me/GemmaMcCourt01', bio: 'Gem101 has 1.2 million likes on her OnlyFans profile and charges $30 per month. She is known as The one and has positioned herself as a premium experience.' },
  { username: 'camillaxaraujo', name: 'Camilla Araujo', telegram: 'https://t.me/+OUJhbSmDo_FhZGU1', bio: 'Camilla Araujo gained initial fame from appearing in a MrBeast YouTube video. She went on to build a massive career on OnlyFans, reportedly earning around $20 million.' },
  { username: 'ericamena', name: 'Erica Mena', telegram: 'https://t.me/s/ericamena', bio: 'Erica Mena is one of the standout success stories on OnlyFans. The reality TV star from Love & Hip Hop has earned over $28 million from the platform.' },
  { username: 'yerimua', name: 'Yeri Mua', telegram: 'https://t.me/YeriMua', bio: 'Yerimua (Yeri Mua) is a very popular Mexican creator with 37K likes on OnlyFans. She has a massive following across social media with millions of streams on Spotify.' },
  { username: 'miamalkova', name: 'Mia Malkova', telegram: 'https://t.me/Miamalkovaisme', bio: 'Mia Malkova is a legendary name in the adult industry who has successfully adapted her career to the creator economy. She started performing in 2012 and quickly became one of the most recognized faces.' },
  { username: 'violetmyers', name: 'Violet Myers', telegram: 'https://t.me/VioletMyers', bio: 'Violet Myers is one of the most recognized names in adult content, with over 2.7 million likes on OnlyFans. Born in Los Angeles with Mexican and Turkish heritage.' },
];

async function main() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  const groupsCol = db.collection('groups');
  const creatorsCol = db.collection('onlyfanscreators');

  let inserted = 0;
  let skipped = 0;

  for (const c of creators) {
    // NEVER change this slug pattern. Owner's explicit order: {username}-onlyfans-telegram. Period.
    const slug = `${c.username}-onlyfans-telegram`;

    const exists = await groupsCol.findOne({ slug });
    if (exists) {
      console.log(`SKIP  ${slug} (already exists)`);
      skipped++;
      continue;
    }

    const ofCreator = await creatorsCol.findOne(
      { username: c.username },
      { projection: { avatar: 1 } }
    );
    const image = ofCreator?.avatar && ofCreator.avatar.startsWith('https://') ? ofCreator.avatar : '/assets/image.jpg';

    const now = new Date();
    const doc = {
      name: `${c.name} OnlyFans`,
      slug,
      category: 'Onlyfans',
      categories: ['Onlyfans'],
      country: 'All',
      telegramLink: c.telegram,
      description: c.bio,
      image,
      status: 'approved',
      createdAt: now,
      updatedAt: now,
      publishedAt: now,
      verified: true,
      linkedCreatorSlug: c.username,
      views: 0,
      weeklyViews: 0,
      weeklyClicks: 0,
      clickCount: 0,
      memberCount: 0,
      pinned: false,
      featured: false,
      featuredOrder: 999,
      boosted: false,
      isAdvertisement: false,
      premiumOnly: false,
      likes: 0,
      dislikes: 0,
    };

    await groupsCol.insertOne(doc);
    console.log(`ADD   ${slug} — ${c.name} (image: ${image.slice(0, 60)}...)`);
    inserted++;
  }

  console.log(`\nDone. Inserted: ${inserted}, Skipped: ${skipped}`);
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
