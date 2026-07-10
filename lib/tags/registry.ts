import { OF_CATEGORIES } from '@/app/onlyfanssearch/constants';
import { BEST_OF_PAGES, type BestOfPage } from '@/app/best-onlyfans-accounts/bestOfPages';
import { visibleCategories } from '@/app/groups/constants';

export interface TagDefinition {
  slug: string;
  label: string;
  /** Group.category / categories values to match (case-insensitive exact). */
  groupLabels: string[];
  bestOfPage?: BestOfPage;
  creatorCategorySlug?: string;
}

/** Extra group category names that map to a tag slug. */
const GROUP_LABEL_ALIASES: Record<string, string[]> = {
  'big-boobs': ['Big Tits'],
  'big-ass': ['Big Ass'],
  teen: ['Teen 18+'],
  goth: ['Goth & Alt'],
  milf: ['MILF'],
  latina: ['Latina'],
  asian: ['Asian'],
  blonde: ['Blonde'],
  brunette: ['Brunette'],
  amateur: ['Amateur'],
  cosplay: ['Cosplay'],
  feet: ['Feet'],
  lesbian: ['Lesbian'],
  ebony: ['Ebony', 'Black'],
  petite: ['Petite'],
  fitness: ['Fitness'],
  onlyfans: ['Onlyfans'],
  'ai-nsfw': ['AI NSFW'],
  usa: ['USA'],
  uk: ['UK'],
  germany: ['Germany'],
  france: ['France'],
  spain: ['Spain'],
  brazil: ['Brazil'],
  japan: ['Japan'],
  india: ['India'],
  italy: ['Italy'],
  colombia: ['Colombia'],
  ukraine: ['Ukraine'],
};

function slugifyLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function mergeTag(existing: TagDefinition | undefined, next: TagDefinition): TagDefinition {
  if (!existing) return next;
  const groupLabels = [...new Set([...existing.groupLabels, ...next.groupLabels])];
  return {
    slug: existing.slug,
    label: existing.label,
    groupLabels,
    bestOfPage: existing.bestOfPage || next.bestOfPage,
    creatorCategorySlug: existing.creatorCategorySlug || next.creatorCategorySlug,
  };
}

function buildRegistry(): Map<string, TagDefinition> {
  const map = new Map<string, TagDefinition>();

  for (const page of BEST_OF_PAGES) {
    const aliases = GROUP_LABEL_ALIASES[page.slug] || [];
    const def: TagDefinition = {
      slug: page.slug,
      label: page.label,
      groupLabels: [page.label, ...aliases],
      bestOfPage: page,
      creatorCategorySlug: page.match === 'category' ? page.categorySlug : undefined,
    };
    map.set(page.slug, mergeTag(map.get(page.slug), def));
  }

  for (const cat of OF_CATEGORIES) {
    const aliases = GROUP_LABEL_ALIASES[cat.slug] || [];
    map.set(
      cat.slug,
      mergeTag(map.get(cat.slug), {
        slug: cat.slug,
        label: cat.name,
        groupLabels: [cat.name, ...aliases],
        creatorCategorySlug: cat.slug,
      }),
    );
  }

  for (const name of visibleCategories) {
    if (name === 'All') continue;
    const slug = slugifyLabel(name);
    if (map.has(slug)) {
      const cur = map.get(slug)!;
      if (!cur.groupLabels.some((l) => l.toLowerCase() === name.toLowerCase())) {
        cur.groupLabels.push(name);
      }
      continue;
    }
    map.set(slug, {
      slug,
      label: name,
      groupLabels: [name, ...(GROUP_LABEL_ALIASES[slug] || [])],
    });
  }

  return map;
}

const REGISTRY = buildRegistry();

export function getAllTagDefinitions(): TagDefinition[] {
  return [...REGISTRY.values()].sort((a, b) => a.label.localeCompare(b.label));
}

export function getTagDefinition(slug: string): TagDefinition | undefined {
  return REGISTRY.get(slug);
}

export function tagSortLetter(label: string): string {
  const first = label.trim().charAt(0).toUpperCase();
  if (/[A-Z]/.test(first)) return first;
  return '#';
}
