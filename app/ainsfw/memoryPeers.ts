/** Peer quotes on conversation & memory — multi-tool review sites only (homepage links). */

export interface MemoryPeerQuote {
  text: string;
  peer: string;
  homepage: string;
}

/** Approved: large multi-tool directories/reviewers. No single-product domains or vendor homepages. */
export const AINSFW_MEMORY_PEERS: Record<string, MemoryPeerQuote[]> = {
  'girlfriendgpt-ai-girlfriend': [
    {
      peer: 'CompanionWise',
      homepage: 'https://companionwise.com/',
      text: 'Memory rated 8.5/10. Users report conversations spanning millions of messages with the AI retaining key relationship details across sessions.',
    },
    {
      peer: 'Synthlust',
      homepage: 'https://synthlust.com/',
      text: 'Deluxe tier adds 8K memory tokens and 20,000 messages per month. Free and Premium forget prior sessions entirely.',
    },
    {
      peer: 'CompanionRater',
      homepage: 'https://companionrater.com/',
      text: 'Deluxe and Elite tiers unlock 8K to 16K context memory for multi-session roleplay continuity.',
    },
  ],
  'ourdream-ai-ai-girlfriend': [
    {
      peer: 'Best Girlfriend AI',
      homepage: 'https://bestgirlfriend.ai/',
      text: "Memory is OurDream's structural moat at 9.0/10, the highest in our 9-app test.",
    },
    {
      peer: 'CompanionRank',
      homepage: 'https://companionrank.com/',
      text: 'OurDream ranks among the strongest platforms for long-term memory and relationship continuity in 2026 comparisons.',
    },
    {
      peer: 'Virtual AI Partner',
      homepage: 'https://www.virtualaipartner.com/',
      text: 'OurDream is repeatedly cited for deep context windows and stronger semantic memory on paid tiers than basic chatbots.',
    },
  ],
  'secrets-ai-ai-girlfriend': [
    {
      peer: 'Best Girlfriend AI',
      homepage: 'https://bestgirlfriend.ai/',
      text: 'Cross-session continuity holds at multi-week horizons with manual Moment-pinning and cross-timeline isolation in a 9-app test.',
    },
    {
      peer: 'CompanionRank',
      homepage: 'https://companionrank.com/',
      text: 'Secrets AI is grouped with Tier 1 memory platforms that prioritize persistent recall and editable memory layers.',
    },
    {
      peer: 'Virtual AI Partner',
      homepage: 'https://www.virtualaipartner.com/',
      text: 'Secrets AI is compared alongside other premium companions for long-session memory and continuity features.',
    },
  ],
  'lovescape-ai-girlfriend': [
    {
      peer: 'AI Girlfriend HQ',
      homepage: 'https://aigirlfriendhq.com/',
      text: 'Dynamic Memory 2.0 passed an 11-day recall test on Premium in a 21-day hands-on review.',
    },
    {
      peer: 'Rowmance',
      homepage: 'https://rowmance.net/',
      text: 'Lovescape tracks emotional context across days, checking in on stress or mood without being prompted.',
    },
    {
      peer: 'Pippin Club',
      homepage: 'https://pippinclub.com/',
      text: 'Lovescape invests in long-term memory, persona evolution, and mood adaptation over weeks of use.',
    },
  ],
  'dream-companion-ai-girlfriend': [
    {
      peer: 'CompanionRank',
      homepage: 'https://companionrank.com/',
      text: 'Ultra long-term memory on Ultimate added depth in long-running scenarios during a two-week test.',
    },
    {
      peer: 'AIapps',
      homepage: 'https://www.aiapps.com/',
      text: 'Ultimate subscribers get Ultra Long-Term Chat Memory, which can recall weeks of conversation history.',
    },
    {
      peer: 'NaughtyPicks',
      homepage: 'https://naughtypicks.com/',
      text: 'Night Sky on Ultimate maintains character consistency better during complex, long-running NSFW scenarios.',
    },
  ],
  'crushon-ai-ai-girlfriend': [
    {
      peer: 'AI Tipsters',
      homepage: 'https://aitipsters.com/',
      text: 'Remembers nicknames, running jokes, and established relationship dynamics significantly better than Candy AI across extended sessions.',
    },
    {
      peer: 'CompanionWise',
      homepage: 'https://companionwise.com/',
      text: 'Paid users on Standard get 16K persistent memory, which holds up reasonably well for 20 to 30 messages.',
    },
    {
      peer: 'CompanionRank',
      homepage: 'https://companionrank.com/',
      text: 'CrushOn AI lists long-context memory as a core feature for carrying plot beats and names across hundreds of messages.',
    },
  ],
  'honeybot-ai-girlfriend': [
    {
      peer: 'OhGirlfriend',
      homepage: 'https://ohgirlfriend.com/',
      text: 'The 25-message active memory is supplemented by a broader context system that remembers key relationship details and recurring topics.',
    },
    {
      peer: 'Pippin Club',
      homepage: 'https://pippinclub.com/',
      text: 'Honeybot referenced inside jokes and earlier conversation details naturally after a month of testing.',
    },
    {
      peer: 'Virtual AI Partner',
      homepage: 'https://www.virtualaipartner.com/',
      text: 'Honeybot is reviewed among NSFW companion apps for adaptive memory that keeps relationship highlights across sessions.',
    },
  ],
  'candy-ai-ai-girlfriend': [
    {
      peer: 'AI Tipsters',
      homepage: 'https://aitipsters.com/',
      text: 'Memory Slots lets users manually add up to 10 memory facts injected each session when chats get long.',
    },
    {
      peer: 'CompanionWise',
      homepage: 'https://companionwise.com/',
      text: 'Candy AI includes memory features on paid tiers, with context limits that vary by subscription level.',
    },
    {
      peer: 'CompanionRank',
      homepage: 'https://companionrank.com/',
      text: 'Candy AI and Joi AI both list Memory / Remembers you among core companion features in side-by-side comparisons.',
    },
  ],
  'soulfun-ai-girlfriend': [
    {
      peer: 'CompanionWise',
      homepage: 'https://companionwise.com/',
      text: 'Memory injection lets you manually add specific memories the AI references in future conversations.',
    },
    {
      peer: 'WeavAI',
      homepage: 'https://weavai.app/',
      text: 'SoulFun short-term memory performs well in testing, with continuity across sessions for pet names and shared jokes.',
    },
    {
      peer: 'Pippin Club',
      homepage: 'https://pippinclub.com/',
      text: 'SoulFun is reviewed alongside other AI girlfriend apps for chat quality and session-to-session continuity.',
    },
  ],
  'nastia-ai-ai-girlfriend': [
    {
      peer: 'CompanionRank',
      homepage: 'https://companionrank.com/',
      text: 'Nastia AI scored 9-day recall with emotional calibration in hands-on sexting category tests.',
    },
    {
      peer: 'Pippin Club',
      homepage: 'https://pippinclub.com/',
      text: 'Nastia AI is reviewed among AI girlfriend apps for emotional chat and continuity features.',
    },
    {
      peer: 'AI Girlfriend HQ',
      homepage: 'https://aigirlfriendhq.com/',
      text: 'Nastia AI is compared with Lovescape and Candy AI on memory depth in multi-platform girlfriend reviews.',
    },
  ],
  'joi-ai-nude-generator': [
    {
      peer: 'CompanionRank',
      homepage: 'https://companionrank.com/',
      text: 'JOI AI features memory systems that retain conversation history and personal details for continuous relationships.',
    },
    {
      peer: 'AI Tipsters',
      homepage: 'https://aitipsters.com/',
      text: 'JOI AI is compared with Candy AI and CrushOn AI on conversation depth and memory in multi-app 2026 tests.',
    },
    {
      peer: 'Virtual AI Partner',
      homepage: 'https://www.virtualaipartner.com/',
      text: 'Joi AI is ranked among premium companions for memory, voice, and multi-platform chat in 2026 roundups.',
    },
  ],
  'lovemy-ai-ai-girlfriend': [
    {
      peer: 'Pippin Club',
      homepage: 'https://pippinclub.com/',
      text: 'LoveMy spells out tiered bot memory: free is short, Basic is longer, Pro is the longest.',
    },
    {
      peer: 'AI Companion Guides',
      homepage: 'https://aicompanionguides.com/',
      text: 'LoveMy.ai is reviewed alongside Replika and Character.AI in multi-app AI companion comparisons.',
    },
    {
      peer: 'CompanionRank',
      homepage: 'https://companionrank.com/',
      text: 'LoveMy AI appears in cross-platform girlfriend comparisons with memory listed among standard companion features.',
    },
  ],
  'romantic-ai-ai-girlfriend': [
    {
      peer: 'AI Companion Guides',
      homepage: 'https://aicompanionguides.com/',
      text: 'Romantic AI was tested across free and paid tiers with custom characters in a 10-day multi-app review.',
    },
    {
      peer: 'CompanionRank',
      homepage: 'https://companionrank.com/',
      text: 'Romantic AI is included in 2026 girlfriend comparison tables alongside Joi AI, Nastia AI, and Lovescape.',
    },
    {
      peer: 'CompanionRater',
      homepage: 'https://companionrater.com/',
      text: 'Romantic AI is scored in head-to-head companion comparisons on conversation, memory, and value.',
    },
  ],
  'dreamgf-ai-girlfriend': [
    {
      peer: 'Pippin Club',
      homepage: 'https://pippinclub.com/',
      text: 'DreamGF chat memory holds basic facts and recent context well for single-session roleplay.',
    },
    {
      peer: 'Best Girlfriend AI',
      homepage: 'https://bestgirlfriend.ai/',
      text: 'DreamGF is compared with OurDream and Candy AI on memory horizon in multi-app 2026 tests.',
    },
    {
      peer: 'CompanionRater',
      homepage: 'https://companionrater.com/',
      text: 'DreamGF memory is scored alongside Kupid AI and other companions in verified pricing comparisons.',
    },
  ],
  'fantasygf-ai-girlfriend': [
    {
      peer: 'Companaya',
      homepage: 'https://companaya.com/',
      text: 'FantasyGF memory is good within sessions and holds context across multiple sessions in category testing.',
    },
    {
      peer: 'Intimeros',
      homepage: 'https://www.intimeros.com/',
      text: 'FantasyGF offers short-term memory callbacks within chat, reviewed among NSFW girlfriend platforms.',
    },
    {
      peer: 'Rowmance',
      homepage: 'https://rowmance.net/',
      text: 'FantasyGF is ranked among top roleplay platforms in multi-app girlfriend comparisons for scenario depth.',
    },
  ],
};

export function getMemoryPeers(slug: string): MemoryPeerQuote[] | undefined {
  const peers = AINSFW_MEMORY_PEERS[slug];
  return peers?.length ? peers : undefined;
}
