import dotenv from 'dotenv';
dotenv.config({ path: '.env.local', quiet: true });

const LIVE_RAW = `
4K & HD (8)
Adult (38)
Ahegao (626)
AI NSFW (13)
Alt (427)
Amateur (197)
American (38)
Anal (203)
Anime (331)
Arab (53)
Argentinian (56)
Arizona (12)
Asian (406)
ASMR (46)
Australian (100)
BBW (194)
BDSM (138)
Big Ass (1015)
Big Boobs (893)
Big Booty (141)
Big Tits (6)
Bikini (169)
Bisexual (104)
Blonde (668)
Blowjob (15)
Bondage (110)
Brazil (19)
Brazilian (153)
British (344)
Brunette (386)
Bunny Girl (51)
Busty (366)
California (75)
Canadian (79)
Catgirl (54)
Celebrity (219)
Chilean (12)
China (7)
Chinese (42)
Chubby (196)
College (165)
College Girl (26)
Colombia (6)
Colombian (157)
Colorado (18)
Cosplay (822)
Couple (225)
Custom (388)
Czech (10)
Dancer (159)
Dick Rating (71)
Dominatrix (326)
Dutch (17)
E-girl (674)
Ebony (127)
Exotic (42)
Feet (388)
Femdom (151)
Fetish (705)
Filipina (19)
Findom (266)
Finnish (10)
Fitness (291)
Florida (77)
French (70)
Gamer (352)
Georgia (73)
German (122)
GFE (76)
Girl Next Door (127)
Goth (378)
Goth Girl (75)
Greek (84)
Hairy (59)
Hardcore (12)
Heels (79)
Hotwife (134)
Illinois (16)
Influencer (170)
Irish (17)
Italian (68)
Japanese (60)
JOI (202)
Latex (67)
Latina (798)
Lesbian (470)
Lingerie (333)
Live Show (34)
Maid (36)
Massachusetts (22)
Masturbation (8)
Mexican (50)
Michigan (29)
MILF (735)
Model (821)
Mommy (270)
Moroccan (71)
Natural (141)
Neighbor (153)
Nevada (79)
New York (33)
New Zealand (21)
No PPV (200)
North Carolina (8)
Norwegian (13)
NSFW-Telegram (20)
Nude (798)
Nurse (65)
Onlyfans (49)
OnlyFans Free (379)
Onlyfans Leaks (8)
Oral (178)
PAWG (170)
Persian (17)
Peruvian (18)
Petite (727)
Piercing (51)
Polish (25)
Pornstar (145)
POV (92)
Pregnant (44)
Public (7)
Puerto Rican (8)
Redhead (297)
Roleplay (128)
Romanian (12)
Russian (40)
Scottish (23)
Sexting (378)
Shaved (70)
Solo (470)
South Korean (16)
Spanish (70)
Squirt (278)
Stockings (67)
Streamer (674)
Submissive (267)
Swedish (17)
Taiwanese (85)
Tattoo (275)
Teen (436)
Telegram-Porn (19)
Texas (51)
Thai (51)
Thick (497)
Threesome (79)
TikTok (6)
Topless (68)
Turkish (246)
Twerk (56)
Ukrainian (28)
Uncensored AV (7)
USA (32)
Video Call (97)
Yoga (122)
`;

function parseLive(raw: string): Map<string, number> {
  const map = new Map<string, number>();
  for (const line of raw.trim().split('\n')) {
    const m = line.trim().match(/^(.+?)\s+\((\d+)\)$/);
    if (!m) continue;
    map.set(m[1].trim(), Number(m[2]));
  }
  return map;
}

function norm(s: string): string {
  return s.trim().toLowerCase();
}

async function main() {
  const { getTagIndex } = await import('../lib/actions/tags');
  const localTags = await getTagIndex('en');
  const localMap = new Map(localTags.map((t) => [norm(t.label), { label: t.label, total: t.total, slug: t.slug }]));
  const liveMap = parseLive(LIVE_RAW);

  const allLabels = new Set([...localMap.keys(), ...[...liveMap.keys()].map(norm)]);

  const rows: {
    tag: string;
    live: number | null;
    local: number | null;
    diff: number | null;
    status: string;
  }[] = [];

  const liveOnly: string[] = [];
  const localOnly: string[] = [];

  for (const key of [...allLabels].sort()) {
    const liveEntry = [...liveMap.entries()].find(([l]) => norm(l) === key);
    const localEntry = localMap.get(key);
    const liveTotal = liveEntry ? liveEntry[1] : null;
    const localTotal = localEntry ? localEntry.total : null;
    const tag = liveEntry?.[0] || localEntry?.label || key;

    if (liveTotal != null && localTotal == null) {
      liveOnly.push(tag);
      rows.push({ tag, live: liveTotal, local: null, diff: null, status: 'LIVE ONLY' });
    } else if (liveTotal == null && localTotal != null) {
      localOnly.push(localEntry!.label);
      rows.push({ tag: localEntry!.label, live: null, local: localTotal, diff: null, status: 'LOCAL ONLY' });
    } else if (liveTotal != null && localTotal != null) {
      rows.push({
        tag,
        live: liveTotal,
        local: localTotal,
        diff: localTotal - liveTotal,
        status: liveTotal === localTotal ? 'MATCH' : 'DIFF',
      });
    }
  }

  const diffs = rows.filter((r) => r.status === 'DIFF');
  const matches = rows.filter((r) => r.status === 'MATCH');

  console.log('=== SUMMARY ===');
  console.log('Live tags:', liveMap.size);
  console.log('Local tags:', localTags.length);
  console.log('In both:', matches.length + diffs.length);
  console.log('Live only (not on local):', liveOnly.length);
  console.log('Local only (not on live):', localOnly.length);
  console.log('Count mismatches:', diffs.length);
  console.log('');

  if (liveOnly.length) {
    console.log('=== LIVE ONLY ===');
    for (const t of liveOnly.sort()) console.log(`  ${t} (${liveMap.get(t)})`);
    console.log('');
  }

  if (localOnly.length) {
    console.log('=== LOCAL ONLY ===');
    for (const t of localOnly.sort()) console.log(`  ${t}`);
    console.log('');
  }

  if (diffs.length) {
    console.log('=== COUNT DIFFERENCES (local - live) ===');
    for (const r of diffs.sort((a, b) => Math.abs(b.diff!) - Math.abs(a.diff!))) {
      console.log(`  ${r.tag}: live=${r.live} local=${r.local} diff=${r.diff! >= 0 ? '+' : ''}${r.diff}`);
    }
    console.log('');
  }

  console.log('=== FULL TABLE ===');
  console.log('Tag\tLive\tLocal\tDiff\tStatus');
  const sorted = rows.sort((a, b) => a.tag.localeCompare(b.tag));
  for (const r of sorted) {
    const diffStr = r.diff == null ? '' : String(r.diff);
    console.log(`${r.tag}\t${r.live ?? ''}\t${r.local ?? ''}\t${diffStr}\t${r.status}`);
  }

  const fs = await import('fs');
  const csvLines = ['Tag,Live,Local,Diff,Status', ...sorted.map((r) => {
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    return [esc(r.tag), r.live ?? '', r.local ?? '', r.diff ?? '', r.status].join(',');
  })];
  fs.writeFileSync('tmp/LIVE-VS-LOCAL-TAGS.csv', csvLines.join('\n'));
  console.log('\nWrote tmp/LIVE-VS-LOCAL-TAGS.csv');
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
