/**
 * Sub-niche combo pills + landing pages.
 * Every pill has an explicit comboSlug — no inferred URLs.
 * Combo landing URLs were agent-invented under onlyfanssearch/best — disabled; rankings use /best-onlyfans-accounts/{slug}.
 */
import type { BestOfPage } from '@/app/best-onlyfans-accounts/bestOfPages';
import { BEST_OF_PAGE_MAP } from '@/app/best-onlyfans-accounts/bestOfPages';
import { OF_CATEGORY_MAP } from '@/app/ofsearch/constants';
import { buildComboCreatorMatch } from '@/lib/tags/creatorMatch';

export const MIN_COMBO_CREATORS = 30;
export const MIN_COMBO_PILL_BAR = 2;

export interface ComboPillDef {
  label: string;
  query: string;
  modifierSlug: string;
  comboSlug: string;
}

export interface ComboPillItem {
  label: string;
  href: string;
}

export const ONLYFANS_HUB_PILL: ComboPillItem = { label: 'OFsearch', href: '/ofsearch' };

/** Legacy broken slugs from old inferComboSlug — never serve these. */
export const BANNED_COMBO_SLUGS = new Set([
  'latina-latina',
  'asian-asian',
  'goth-goth',
  'chubby-chubby',
  'ebony-ebony',
  'blonde-blonde',
  'petite-petite',
  'thick-thick',
  'sexy-sexy',
  'big-boobs-busty',
  'bigboobs-busty',
  'blonde-big-boobs',
  'blond-big-boobs',
  'big-tits-big-boobs',
]);

/** US states ↔ Australia / UK / Canada combo intersections */
const US_STATE_GEO = [
  { slug: 'california', label: 'California' },
  { slug: 'florida', label: 'Florida' },
  { slug: 'texas', label: 'Texas' },
  { slug: 'nevada', label: 'Nevada' },
  { slug: 'new-york', label: 'New York' },
  { slug: 'georgia', label: 'Georgia' },
  { slug: 'michigan', label: 'Michigan' },
  { slug: 'colorado', label: 'Colorado' },
  { slug: 'illinois', label: 'Illinois' },
  { slug: 'north-carolina', label: 'North Carolina' },
  { slug: 'arizona', label: 'Arizona' },
] as const;

const ANGLO_GEO = [
  { slug: 'canadian', label: 'Canadian', query: 'canadian' },
  { slug: 'australian', label: 'Australian', query: 'australian' },
  { slug: 'british', label: 'British', query: 'british' },
] as const;

function usStateAngloCombos(stateSlug: string, stateLabel: string): ComboPillDef[] {
  return ANGLO_GEO.map((g) => ({
    label: `${stateLabel} ${g.label}`,
    query: `${stateLabel.toLowerCase()} ${g.query}`,
    modifierSlug: g.slug,
    comboSlug: `${stateSlug}-${g.slug}`,
  }));
}

function angloUsStateCombos(geoSlug: string, geoLabel: string, geoQuery: string): ComboPillDef[] {
  return US_STATE_GEO.map((s) => ({
    label: `${geoLabel} ${s.label}`,
    query: `${geoQuery} ${s.label.toLowerCase()}`,
    modifierSlug: s.slug,
    comboSlug: `${s.slug}-${geoSlug}`,
  }));
}

const US_STATE_COMBO_ENTRIES: Record<string, ComboPillDef[]> = Object.fromEntries(
  US_STATE_GEO.map((s) => [s.slug, usStateAngloCombos(s.slug, s.label)]),
);

/** No big-ass / big-boobs combos on couple / lesbian-style niches. */
const BODY_COMBO_EXCLUDE = new Set([
  'couple',
  'couple-lesbian',
  'couple-straight',
  'lesbian',
  'bisexual',
  'threesome',
  'hotwife',
  'girlfriend',
]);

function nicheComboLabel(slug: string): string {
  return (
    BEST_OF_PAGE_MAP.get(slug)?.label ||
    OF_CATEGORY_MAP.get(slug)?.name ||
    slug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  );
}

function resolveSharedComboSlug(
  map: Record<string, ComboPillDef[]>,
  nicheSlug: string,
  bodySlug: 'big-ass' | 'big-boobs',
  fallback: string,
): string {
  for (const d of map[nicheSlug] || []) {
    if (d.modifierSlug === bodySlug) return d.comboSlug;
  }
  for (const d of map[bodySlug] || []) {
    if (d.modifierSlug === nicheSlug) return d.comboSlug;
  }
  return fallback;
}

/** Big Ass + Big Boobs on every niche except couple / lesbian family. */
function withUniversalBodyCombos(base: Record<string, ComboPillDef[]>): Record<string, ComboPillDef[]> {
  const out: Record<string, ComboPillDef[]> = {};
  for (const [k, v] of Object.entries(base)) out[k] = [...v];

  const nicheSlugs = new Set<string>();
  for (const s of BEST_OF_PAGE_MAP.keys()) nicheSlugs.add(s);
  for (const s of OF_CATEGORY_MAP.keys()) nicheSlugs.add(s);
  for (const s of Object.keys(out)) nicheSlugs.add(s);

  const eligible = [...nicheSlugs]
    .filter((s) => !BODY_COMBO_EXCLUDE.has(s))
    .filter((s) => OF_CATEGORY_MAP.has(s) || BEST_OF_PAGE_MAP.has(s))
    .sort();

  if (!out['big-ass']) out['big-ass'] = [];
  if (!out['big-boobs']) out['big-boobs'] = [];

  for (const slug of eligible) {
    if (!out[slug]) out[slug] = [];
    const label = nicheComboLabel(slug);

    if (slug !== 'big-ass') {
      const comboSlug = resolveSharedComboSlug(
        out,
        slug,
        'big-ass',
        slug === 'korean' ? 'korean-big-ass' : `big-ass-${slug}`,
      );
      if (!out[slug].some((d) => d.modifierSlug === 'big-ass')) {
        out[slug].push({
          label: slug === 'ebony' ? 'Big Ass Black' : `Big Ass ${label}`,
          query: `big ass ${slug === 'ebony' ? 'ebony' : label.toLowerCase()}`,
          modifierSlug: 'big-ass',
          comboSlug,
        });
      }
      if (!out['big-ass'].some((d) => d.modifierSlug === slug)) {
        out['big-ass'].push({
          label:
            slug === 'ebony'
              ? 'Big Ass Black'
              : slug === 'korean'
                ? 'Korean Big Ass'
                : `Big Ass ${label}`,
          query: `big ass ${slug === 'korean' || slug === 'ebony' ? slug : label.toLowerCase()}`,
          modifierSlug: slug,
          comboSlug,
        });
      }
    }

    if (slug !== 'big-boobs') {
      const comboSlug = resolveSharedComboSlug(out, slug, 'big-boobs', `big-tits-${slug}`);
      if (!out[slug].some((d) => d.modifierSlug === 'big-boobs')) {
        out[slug].push({
          label: `Big Tits ${label}`,
          query: `big boobs ${label.toLowerCase()}`,
          modifierSlug: 'big-boobs',
          comboSlug,
        });
      }
      if (!out['big-boobs'].some((d) => d.modifierSlug === slug)) {
        out['big-boobs'].push({
          label: `Big Tits ${label}`,
          query: `big boobs ${label.toLowerCase()}`,
          modifierSlug: slug,
          comboSlug,
        });
      }
    }
  }

  return out;
}

const CATEGORY_COMBO_PILLS_BASE: Record<string, ComboPillDef[]> = {
  ...US_STATE_COMBO_ENTRIES,
  'big-ass': [
    { label: 'Big Ass Latina', query: 'big ass latina', modifierSlug: 'latina', comboSlug: 'big-ass-latina' },
    { label: 'Big Ass Black', query: 'big ass ebony', modifierSlug: 'ebony', comboSlug: 'big-ass-ebony' },
    { label: 'Big Ass MILF', query: 'big ass milf', modifierSlug: 'milf', comboSlug: 'big-ass-milf' },
    { label: 'Big Ass Teen', query: 'big ass teen', modifierSlug: 'teen', comboSlug: 'big-ass-teen' },
    { label: 'Big Ass Asian', query: 'big ass asian', modifierSlug: 'asian', comboSlug: 'big-ass-asian' },
    { label: 'Korean Big Ass', query: 'big ass korean', modifierSlug: 'korean', comboSlug: 'korean-big-ass' },
    { label: 'Big Ass Arab', query: 'big ass arab', modifierSlug: 'arab', comboSlug: 'big-ass-arab' },
    { label: 'Big Ass Goth', query: 'big ass goth', modifierSlug: 'goth', comboSlug: 'big-ass-goth' },
    { label: 'Big Ass Mature', query: 'big ass mature', modifierSlug: 'mature', comboSlug: 'big-ass-mature' },
    { label: 'Big Ass Redhead', query: 'big ass redhead', modifierSlug: 'redhead', comboSlug: 'big-ass-redhead' },
    { label: 'Big Ass BBW', query: 'big ass bbw', modifierSlug: 'bbw', comboSlug: 'big-ass-bbw' },
    { label: 'Big Ass Russian', query: 'big ass russian', modifierSlug: 'russian', comboSlug: 'big-ass-russian' },
  ],
  'big-boobs': [
    { label: 'Big Tits MILF', query: 'big boobs milf', modifierSlug: 'milf', comboSlug: 'big-tits-milf' },
    { label: 'Big Tits Asian', query: 'big boobs asian', modifierSlug: 'asian', comboSlug: 'big-tits-asian' },
    { label: 'Big Tits Latina', query: 'big boobs latina', modifierSlug: 'latina', comboSlug: 'big-tits-latina' },
    { label: 'Big Tits Teen', query: 'big boobs teen', modifierSlug: 'teen', comboSlug: 'big-tits-teen' },
    { label: 'Big Tits Goth', query: 'big boobs goth', modifierSlug: 'goth', comboSlug: 'big-tits-goth' },
    { label: 'Big Tits Ebony', query: 'big boobs ebony', modifierSlug: 'ebony', comboSlug: 'big-tits-ebony' },
    { label: 'Big Tits Blonde', query: 'big boobs blonde', modifierSlug: 'blonde', comboSlug: 'big-tits-blonde' },
    { label: 'Big Tits Redhead', query: 'big boobs redhead', modifierSlug: 'redhead', comboSlug: 'big-tits-redhead' },
    { label: 'Big Tits BBW', query: 'big boobs bbw', modifierSlug: 'bbw', comboSlug: 'big-tits-bbw' },
    { label: 'Big Tits Amateur', query: 'big boobs amateur', modifierSlug: 'amateur', comboSlug: 'big-tits-amateur' },
    { label: 'Big Tits Arab', query: 'big boobs arab', modifierSlug: 'arab', comboSlug: 'big-tits-arab' },
  ],
  'big-booty': [
    { label: 'Big Booty Arab', query: 'big booty arab', modifierSlug: 'arab', comboSlug: 'big-booty-arab' },
  ],
  pawg: [
    { label: 'Arab PAWG', query: 'arab pawg', modifierSlug: 'arab', comboSlug: 'arab-pawg' },
  ],
  arab: [
    { label: 'Big Ass Arab', query: 'big ass arab', modifierSlug: 'big-ass', comboSlug: 'big-ass-arab' },
    { label: 'Big Booty Arab', query: 'big booty arab', modifierSlug: 'big-booty', comboSlug: 'big-booty-arab' },
    { label: 'Arab PAWG', query: 'arab pawg', modifierSlug: 'pawg', comboSlug: 'arab-pawg' },
    { label: 'Curvy Arab', query: 'curvy arab', modifierSlug: 'curvy', comboSlug: 'curvy-arab' },
    { label: 'Big Tits Arab', query: 'big boobs arab', modifierSlug: 'big-boobs', comboSlug: 'big-tits-arab' },
    { label: 'Arab Pornstar', query: 'arab pornstar', modifierSlug: 'pornstar', comboSlug: 'arab-pornstar' },
  ],
  canadian: angloUsStateCombos('canadian', 'Canadian', 'canadian'),
  australian: angloUsStateCombos('australian', 'Australian', 'australian'),
  british: angloUsStateCombos('british', 'British', 'british'),
  goth: [
    { label: 'Big Tits Goth', query: 'big boobs goth', modifierSlug: 'big-boobs', comboSlug: 'big-tits-goth' },
    { label: 'Goth PAWG', query: 'goth thick curvy', modifierSlug: 'thick', comboSlug: 'goth-pawg' },
    { label: 'Big Ass Goth', query: 'big ass goth', modifierSlug: 'big-ass', comboSlug: 'big-ass-goth' },
    { label: 'Chubby Goth', query: 'chubby goth', modifierSlug: 'chubby', comboSlug: 'chubby-goth' },
    { label: 'Goth Latina', query: 'goth latina', modifierSlug: 'latina', comboSlug: 'goth-latina' },
    { label: 'Goth Lesbian', query: 'goth lesbian', modifierSlug: 'lesbian', comboSlug: 'goth-lesbian' },
  ],
  milf: [
    { label: 'Big Tits MILF', query: 'big boobs milf', modifierSlug: 'big-boobs', comboSlug: 'big-tits-milf' },
    { label: 'Latina MILF', query: 'latina milf', modifierSlug: 'latina', comboSlug: 'latina-milf' },
    { label: 'Asian MILF', query: 'asian milf', modifierSlug: 'asian', comboSlug: 'asian-milf' },
    { label: 'Blonde MILF', query: 'blonde milf', modifierSlug: 'blonde', comboSlug: 'blonde-milf' },
    { label: 'Big Ass MILF', query: 'big ass milf', modifierSlug: 'big-ass', comboSlug: 'big-ass-milf' },
    { label: 'BBW MILF', query: 'bbw milf', modifierSlug: 'bbw', comboSlug: 'bbw-milf' },
    { label: 'Redhead MILF', query: 'redhead milf', modifierSlug: 'redhead', comboSlug: 'redhead-milf' },
    { label: 'Brunette MILF', query: 'brunette milf', modifierSlug: 'brunette', comboSlug: 'brunette-milf' },
    { label: 'Black MILF', query: 'ebony milf', modifierSlug: 'ebony', comboSlug: 'ebony-milf' },
    { label: 'British MILF', query: 'british milf', modifierSlug: 'british', comboSlug: 'british-milf' },
    { label: 'Amateur MILF', query: 'amateur milf', modifierSlug: 'amateur', comboSlug: 'amateur-milf' },
    { label: 'Colombian MILF', query: 'colombian milf', modifierSlug: 'colombian', comboSlug: 'colombian-milf' },
  ],
  latina: [
    { label: 'Big Ass Latina', query: 'big ass latina', modifierSlug: 'big-ass', comboSlug: 'big-ass-latina' },
    { label: 'Latina MILF', query: 'latina milf', modifierSlug: 'milf', comboSlug: 'latina-milf' },
    { label: 'Big Tits Latina', query: 'big boobs latina', modifierSlug: 'big-boobs', comboSlug: 'big-tits-latina' },
    { label: 'BBW Latina', query: 'bbw latina', modifierSlug: 'bbw', comboSlug: 'bbw-latina' },
    { label: 'Thick Latina', query: 'thick latina', modifierSlug: 'thick', comboSlug: 'thick-latina' },
    { label: 'Latina Teen', query: 'latina teen', modifierSlug: 'teen', comboSlug: 'latina-teen' },
    { label: 'Goth Latina', query: 'goth latina', modifierSlug: 'goth', comboSlug: 'goth-latina' },
    { label: 'Amateur Latina', query: 'amateur latina', modifierSlug: 'amateur', comboSlug: 'amateur-latina' },
  ],
  asian: [
    { label: 'Big Tits Asian', query: 'big boobs asian', modifierSlug: 'big-boobs', comboSlug: 'big-tits-asian' },
    { label: 'Asian MILF', query: 'asian milf', modifierSlug: 'milf', comboSlug: 'asian-milf' },
    { label: 'Asian BBW', query: 'asian bbw', modifierSlug: 'bbw', comboSlug: 'asian-bbw' },
    { label: 'Thick Asian', query: 'thick asian', modifierSlug: 'thick', comboSlug: 'thick-asian' },
    { label: 'Big Ass Asian', query: 'big ass asian', modifierSlug: 'big-ass', comboSlug: 'big-ass-asian' },
    { label: 'Petite Asian', query: 'petite asian', modifierSlug: 'petite', comboSlug: 'petite-asian' },
    { label: 'Blonde Asian', query: 'blonde asian', modifierSlug: 'blonde', comboSlug: 'blonde-asian' },
    { label: 'Asian Cosplay', query: 'asian cosplay', modifierSlug: 'cosplay', comboSlug: 'asian-cosplay' },
  ],
  teen: [
    { label: 'Big Tits Teen', query: 'big boobs teen', modifierSlug: 'big-boobs', comboSlug: 'big-tits-teen' },
    { label: 'Amateur Teen', query: 'amateur teen', modifierSlug: 'amateur', comboSlug: 'amateur-teen' },
    { label: 'Big Ass Teen', query: 'big ass teen', modifierSlug: 'big-ass', comboSlug: 'big-ass-teen' },
    { label: 'Ebony Teen', query: 'ebony teen', modifierSlug: 'ebony', comboSlug: 'ebony-teen' },
    { label: 'Latina Teen', query: 'latina teen', modifierSlug: 'latina', comboSlug: 'latina-teen' },
    { label: 'Blonde Teen', query: 'blonde teen', modifierSlug: 'blonde', comboSlug: 'blonde-teen' },
  ],
  bbw: [
    { label: 'Ebony BBW', query: 'ebony bbw', modifierSlug: 'ebony', comboSlug: 'ebony-bbw' },
    { label: 'Asian BBW', query: 'asian bbw', modifierSlug: 'asian', comboSlug: 'asian-bbw' },
    { label: 'BBW Latina', query: 'bbw latina', modifierSlug: 'latina', comboSlug: 'bbw-latina' },
    { label: 'BBW MILF', query: 'bbw milf', modifierSlug: 'milf', comboSlug: 'bbw-milf' },
    { label: 'Big Tits BBW', query: 'big boobs bbw', modifierSlug: 'big-boobs', comboSlug: 'big-tits-bbw' },
    { label: 'Big Ass BBW', query: 'big ass bbw', modifierSlug: 'big-ass', comboSlug: 'big-ass-bbw' },
    { label: 'Chubby BBW', query: 'chubby bbw', modifierSlug: 'chubby', comboSlug: 'chubby-bbw' },
  ],
  blonde: [
    { label: 'Big Tits Blonde', query: 'big boobs blonde', modifierSlug: 'big-boobs', comboSlug: 'big-tits-blonde' },
    { label: 'Blonde MILF', query: 'blonde milf', modifierSlug: 'milf', comboSlug: 'blonde-milf' },
    { label: 'Australian Blonde', query: 'australian blonde', modifierSlug: 'australian', comboSlug: 'australian-blonde' },
    { label: 'Blonde PAWG', query: 'blonde thick curvy', modifierSlug: 'thick', comboSlug: 'blonde-pawg' },
    { label: 'Blonde Trans', query: 'blonde trans', modifierSlug: 'trans', comboSlug: 'blonde-trans' },
    { label: 'Blonde Teen', query: 'blonde teen', modifierSlug: 'teen', comboSlug: 'blonde-teen' },
    { label: 'British Blonde', query: 'british blonde', modifierSlug: 'british', comboSlug: 'british-blonde' },
    { label: 'Tattooed Blonde', query: 'tattooed blonde', modifierSlug: 'tattoo', comboSlug: 'tattooed-blonde' },
    { label: 'Blonde Asian', query: 'blonde asian', modifierSlug: 'asian', comboSlug: 'blonde-asian' },
  ],
  ebony: [
    { label: 'Ebony MILF', query: 'ebony milf', modifierSlug: 'milf', comboSlug: 'ebony-milf' },
    { label: 'Ebony BBW', query: 'ebony bbw', modifierSlug: 'bbw', comboSlug: 'ebony-bbw' },
    { label: 'Big Ass Ebony', query: 'big ass ebony', modifierSlug: 'big-ass', comboSlug: 'big-ass-ebony' },
    { label: 'Ebony Teen', query: 'ebony teen', modifierSlug: 'teen', comboSlug: 'ebony-teen' },
    { label: 'Chubby Ebony', query: 'chubby ebony', modifierSlug: 'chubby', comboSlug: 'chubby-ebony' },
  ],
  amateur: [
    { label: 'Amateur MILF', query: 'amateur milf', modifierSlug: 'milf', comboSlug: 'amateur-milf' },
    { label: 'Amateur Latina', query: 'amateur latina', modifierSlug: 'latina', comboSlug: 'amateur-latina' },
    { label: 'Amateur Teen', query: 'amateur teen', modifierSlug: 'teen', comboSlug: 'amateur-teen' },
    { label: 'Amateur Asian', query: 'amateur asian', modifierSlug: 'asian', comboSlug: 'amateur-asian' },
  ],
  cosplay: [
    { label: 'Asian Cosplay', query: 'asian cosplay', modifierSlug: 'asian', comboSlug: 'asian-cosplay' },
    { label: 'Goth Cosplay', query: 'goth cosplay', modifierSlug: 'goth', comboSlug: 'goth-cosplay' },
    { label: 'Cosplay MILF', query: 'cosplay milf', modifierSlug: 'milf', comboSlug: 'cosplay-milf' },
  ],
  fitness: [
    { label: 'Fit MILF', query: 'fitness milf', modifierSlug: 'milf', comboSlug: 'fitness-milf' },
    { label: 'Fitness Latina', query: 'fitness latina', modifierSlug: 'latina', comboSlug: 'fitness-latina' },
    { label: 'Fitness Asian', query: 'fitness asian', modifierSlug: 'asian', comboSlug: 'fitness-asian' },
  ],
  thick: [
    { label: 'Thick Latina', query: 'thick latina', modifierSlug: 'latina', comboSlug: 'thick-latina' },
    { label: 'Thick Asian', query: 'thick asian', modifierSlug: 'asian', comboSlug: 'thick-asian' },
    { label: 'Thick MILF', query: 'thick milf', modifierSlug: 'milf', comboSlug: 'thick-milf' },
    { label: 'Big Ass Thick', query: 'big ass thick', modifierSlug: 'big-ass', comboSlug: 'big-ass-thick' },
  ],
  curvy: [
    { label: 'Curvy Latina', query: 'curvy latina', modifierSlug: 'latina', comboSlug: 'curvy-latina' },
    { label: 'Curvy MILF', query: 'curvy milf', modifierSlug: 'milf', comboSlug: 'curvy-milf' },
    { label: 'Curvy Ebony', query: 'curvy ebony', modifierSlug: 'ebony', comboSlug: 'curvy-ebony' },
    { label: 'Curvy Arab', query: 'curvy arab', modifierSlug: 'arab', comboSlug: 'curvy-arab' },
  ],
  chubby: [
    { label: 'Chubby Goth', query: 'chubby goth', modifierSlug: 'goth', comboSlug: 'chubby-goth' },
    { label: 'Chubby Latina', query: 'chubby latina', modifierSlug: 'latina', comboSlug: 'chubby-latina' },
    { label: 'Chubby MILF', query: 'chubby milf', modifierSlug: 'milf', comboSlug: 'chubby-milf' },
    { label: 'Chubby BBW', query: 'chubby bbw', modifierSlug: 'bbw', comboSlug: 'chubby-bbw' },
    { label: 'Chubby Ebony', query: 'chubby ebony', modifierSlug: 'ebony', comboSlug: 'chubby-ebony' },
  ],
  petite: [
    { label: 'Petite Asian', query: 'petite asian', modifierSlug: 'asian', comboSlug: 'petite-asian' },
    { label: 'Petite Latina', query: 'petite latina', modifierSlug: 'latina', comboSlug: 'petite-latina' },
    { label: 'Petite Teen', query: 'petite teen', modifierSlug: 'teen', comboSlug: 'petite-teen' },
    { label: 'Petite Big Ass', query: 'petite big ass', modifierSlug: 'big-ass', comboSlug: 'petite-big-ass' },
    { label: 'Petite Blonde', query: 'petite blonde', modifierSlug: 'blonde', comboSlug: 'petite-blonde' },
    { label: 'Petite Ahegao', query: 'petite ahegao', modifierSlug: 'ahegao', comboSlug: 'petite-ahegao' },
  ],
  lesbian: [
    { label: 'Goth Lesbian', query: 'goth lesbian', modifierSlug: 'goth', comboSlug: 'goth-lesbian' },
    { label: 'Latina Lesbian', query: 'latina lesbian', modifierSlug: 'latina', comboSlug: 'latina-lesbian' },
    { label: 'Asian Lesbian', query: 'asian lesbian', modifierSlug: 'asian', comboSlug: 'asian-lesbian' },
  ],
  tattoo: [
    { label: 'Tattoo MILF', query: 'tattoo milf', modifierSlug: 'milf', comboSlug: 'tattoo-milf' },
    { label: 'Tattoo Latina', query: 'tattoo latina', modifierSlug: 'latina', comboSlug: 'tattoo-latina' },
    { label: 'Goth Tattoo', query: 'goth tattoo', modifierSlug: 'goth', comboSlug: 'goth-tattoo' },
  ],
  pornstar: [
    { label: 'Latina Pornstar', query: 'latina pornstar', modifierSlug: 'latina', comboSlug: 'latina-pornstar' },
    { label: 'Asian Pornstar', query: 'asian pornstar', modifierSlug: 'asian', comboSlug: 'asian-pornstar' },
    { label: 'MILF Pornstar', query: 'milf pornstar', modifierSlug: 'milf', comboSlug: 'milf-pornstar' },
    { label: 'Arab Pornstar', query: 'arab pornstar', modifierSlug: 'arab', comboSlug: 'arab-pornstar' },
  ],
};

export const CATEGORY_COMBO_PILLS: Record<string, ComboPillDef[]> =
  withUniversalBodyCombos(CATEGORY_COMBO_PILLS_BASE);

function buildComboBestOfPages(): Map<string, BestOfPage> {
  const map = new Map<string, BestOfPage>();
  for (const [parentSlug, defs] of Object.entries(CATEGORY_COMBO_PILLS)) {
    for (const d of defs) {
      if (BANNED_COMBO_SLUGS.has(d.comboSlug)) continue;
      const parts = d.comboSlug.split('-');
      if (parts.length >= 2 && parts[0] === parts[parts.length - 1]) continue;
      if (map.has(d.comboSlug)) continue;
      map.set(d.comboSlug, {
        slug: d.comboSlug,
        label: d.label,
        type: 'niche',
        match: 'combo',
        categorySlugs: [parentSlug, d.modifierSlug],
        count: 0,
      });
    }
  }
  return map;
}

export const COMBO_BEST_OF_MAP = buildComboBestOfPages();

export function isComboLandingSlug(slug: string): boolean {
  return COMBO_BEST_OF_MAP.has(slug) && !CATEGORY_COMBO_PILLS[slug];
}

export function onlyfansComboUrl(comboSlug: string): string {
  return `/ofsearch/best/${comboSlug}`;
}

export function resolveBestOfPage(slug: string): BestOfPage | undefined {
  return BEST_OF_PAGE_MAP.get(slug) ?? COMBO_BEST_OF_MAP.get(slug);
}

export function resolveComboRootSlugs(pageSlug: string): string[] {
  if (CATEGORY_COMBO_PILLS[pageSlug]) return [pageSlug];
  const combo = COMBO_BEST_OF_MAP.get(pageSlug);
  if (combo?.categorySlugs?.length) return [...new Set(combo.categorySlugs)];
  return [];
}

function modifierKnown(slug: string): boolean {
  return OF_CATEGORY_MAP.has(slug) || BEST_OF_PAGE_MAP.has(slug);
}

async function countComboCreators(parentSlug: string, modifierSlug: string): Promise<number> {
  const connectDB = (await import('@/lib/db/mongodb')).default;
  const { OnlyFansCreator } = await import('@/lib/models');
  await connectDB();
  return OnlyFansCreator.countDocuments(buildComboCreatorMatch(parentSlug, modifierSlug));
}

async function buildSiblingComboPills(rootSlugs: string[], excludeSlug?: string): Promise<ComboPillItem[]> {
  const seen = new Set<string>();
  const tasks: { d: ComboPillDef; parentSlug: string }[] = [];

  for (const parentSlug of rootSlugs) {
    for (const d of CATEGORY_COMBO_PILLS[parentSlug] ?? []) {
      if (d.modifierSlug === parentSlug || !modifierKnown(d.modifierSlug)) continue;
      if (d.comboSlug === excludeSlug || seen.has(d.comboSlug)) continue;
      seen.add(d.comboSlug);
      tasks.push({ d, parentSlug });
    }
  }

  if (!tasks.length) return [];

  const counted = await Promise.all(
    tasks.map(async ({ d, parentSlug }) => {
      const count = await countComboCreators(parentSlug, d.modifierSlug);
      return { d, count };
    }),
  );

  let selected = counted.filter(({ count }) => count > MIN_COMBO_CREATORS);
  if (selected.length < MIN_COMBO_PILL_BAR) {
    const backfill = counted
      .filter((row) => row.count > 0 && !selected.includes(row))
      .sort((a, b) => b.count - a.count);
    selected = [...selected, ...backfill];
  }

  selected.sort((a, b) => b.count - a.count);

  return selected
    .slice(0, 12)
    .filter(({ d }) => !BANNED_COMBO_SLUGS.has(d.comboSlug))
    .map(({ d }) => ({ label: d.label, href: onlyfansComboUrl(d.comboSlug) }));
}

function mergePills(...groups: ComboPillItem[][]): ComboPillItem[] {
  const seen = new Set<string>();
  const out: ComboPillItem[] = [];
  for (const group of groups) {
    for (const pill of group) {
      if (seen.has(pill.href)) continue;
      seen.add(pill.href);
      out.push(pill);
    }
  }
  return out;
}

export async function getCategoryComboPills(pageSlug: string): Promise<ComboPillItem[]> {
  const rootSlugs = resolveComboRootSlugs(pageSlug);
  if (!rootSlugs.length) return [];

  // Combo pages (e.g. petite-teen): show sibling micro-niches sorted by creator count, not "Petite" + "Teen".
  const siblingPills = await buildSiblingComboPills(rootSlugs, pageSlug);

  if (isComboLandingSlug(pageSlug)) {
    return mergePills([ONLYFANS_HUB_PILL], siblingPills);
  }

  return siblingPills;
}
