import React, { useState, useEffect } from 'react';
import { Flame } from 'lucide-react';
import { Group, FeedCampaign } from './types';
import GroupCard from './GroupCard';
import AdvertCard from './AdvertCard';
import VaultTeaserFeed, { type VaultTeaserItem } from './VaultTeaserFeed';

export interface TrendingOFCreator {
    _id: string;
    name: string;
    username: string;
    avatar: string;
    url: string;
    bio: string;
}

interface VirtualizedGroupGridProps {
    groups: Group[];
    feedCampaigns: FeedCampaign[];
    isTelegram: boolean;
    onOpenReviewModal?: (group: Group) => void;
    onOpenReportModal?: (group: Group) => void;
    bookmarkedMap?: Record<string, string>;
    vaultTeaserGroups?: VaultTeaserItem[];
    trendingOFCreator?: TrendingOFCreator | null;
}

type Item = { type: 'group' | 'campaign' | 'vault-teaser' | 'trending-of'; data: Group | FeedCampaign | TrendingOFCreator | null; index: number };

// In-feed ad slot layout (by group count, 0-indexed):
//   Slot 2 → after 2 groups  (gc=2)   — one-time fixed
//   Slot 5 → after 4 groups  (gc=4)   — Featured Bot, one-time fixed (groups feed only)
//   Slot 3 → after 7 groups  (gc=7)   — one-time fixed
//   Slot 4 → after 12 groups (gc=12)  — first occurrence, then loops every 5
const SLOT2_GC = 2;
const SLOT5_GC = 4;
const SLOT3_GC = 7;
const SLOT4_GC = 12;
const LOOP_GAP = 5;

const VAULT_TEASER_GC = 6;
const VAULT_TEASER_REPEAT = 20;

const TRENDING_OF_GC = 2;

function buildFeedItems(groups: Group[], campaigns: FeedCampaign[], hasVaultTeaser: boolean, trendingOF?: TrendingOFCreator | null): Item[] {
    const items: Item[] = [];
    if (campaigns.length === 0 && !hasVaultTeaser && !trendingOF) {
        const plain: Item[] = [];
        let gc = 0;
        for (const g of groups) {
            if (trendingOF && gc === TRENDING_OF_GC) {
                plain.push({ type: 'trending-of', data: trendingOF, index: plain.length });
            }
            plain.push({ type: 'group', data: g, index: plain.length });
            gc++;
        }
        return plain;
    }

    const slot2 = campaigns.filter(c => c.tierSlot === 2);
    const slot3 = campaigns.filter(c => c.tierSlot === 3);
    const slot4 = campaigns.filter(c => c.tierSlot === 4);
    const slot5 = campaigns.filter(c => c.tierSlot === 5);
    const allCampaigns = campaigns;

    let groupIdx = 0;
    let groupCount = 0;
    let slot4Idx = 0;
    let vaultInserted = false;
    let trendingInserted = false;

    while (groupIdx < groups.length) {
        if (trendingOF && !trendingInserted && groupCount === TRENDING_OF_GC) {
            items.push({ type: 'trending-of', data: trendingOF, index: items.length });
            trendingInserted = true;
        }

        if (hasVaultTeaser && groupCount === VAULT_TEASER_GC && !vaultInserted) {
            items.push({ type: 'vault-teaser', data: null, index: items.length });
            vaultInserted = true;
        }

        if (hasVaultTeaser && vaultInserted && groupCount > VAULT_TEASER_GC && (groupCount - VAULT_TEASER_GC) % VAULT_TEASER_REPEAT === 0) {
            items.push({ type: 'vault-teaser', data: null, index: items.length });
        }

        if (groupCount === SLOT2_GC && slot2.length > 0) {
            items.push({ type: 'campaign', data: slot2[0], index: items.length });
        } else if (groupCount === SLOT5_GC && slot5.length > 0) {
            items.push({ type: 'campaign', data: slot5[0], index: items.length });
        } else if (groupCount === SLOT3_GC && slot3.length > 0) {
            items.push({ type: 'campaign', data: slot3[0], index: items.length });
        } else if (groupCount === SLOT4_GC && slot4.length > 0) {
            items.push({ type: 'campaign', data: slot4[slot4Idx % slot4.length], index: items.length });
            slot4Idx++;
        } else if (groupCount > SLOT4_GC && (groupCount - SLOT4_GC) % LOOP_GAP === 0) {
            if (slot4.length > 0) {
                items.push({ type: 'campaign', data: slot4[slot4Idx % slot4.length], index: items.length });
                slot4Idx++;
            } else if (allCampaigns.length > 0) {
                items.push({ type: 'campaign', data: allCampaigns[slot4Idx % allCampaigns.length], index: items.length });
                slot4Idx++;
            }
        }

        items.push({ type: 'group', data: groups[groupIdx], index: items.length });
        groupIdx++;
        groupCount++;
    }
    return items;
}

function TrendingOFCard({ creator }: { creator: TrendingOFCreator }) {
    return (
        <button
            type="button"
            onClick={() => {
                fetch(`/api/onlyfans/trending/${creator._id}/click`, { method: 'POST' }).catch(() => {});
                window.open(creator.url, '_blank', 'noopener,noreferrer');
            }}
            className="group relative w-full text-left rounded-2xl overflow-hidden border-2 border-orange-400/70 bg-gradient-to-br from-orange-500 via-orange-600 to-rose-600 p-0.5 shadow-[0_0_30px_-5px_rgba(249,115,22,0.65)] hover:shadow-[0_0_40px_-5px_rgba(249,115,22,0.85)] hover:-translate-y-1 transition-all duration-300 cursor-pointer focus:outline-none"
        >
            <div className="rounded-[14px] bg-gradient-to-br from-orange-500/30 via-orange-600/20 to-rose-600/20 overflow-hidden">
                <div className="absolute top-3 left-3 z-20">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 text-white text-[9px] font-black uppercase tracking-wider shadow-lg shadow-orange-500/40">
                        <Flame size={9} fill="currentColor" />
                        Creator Spotlight 🔞
                    </span>
                </div>
                <div className="relative aspect-[3/4] bg-gray-100">
                    {creator.avatar ? (
                        <img
                            src={creator.avatar}
                            alt={`${creator.name} OnlyFans`}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-gray-300 bg-gradient-to-br from-gray-100 to-gray-200">
                            {creator.name.charAt(0)}
                        </div>
                    )}
                </div>
                <div className="px-3 pt-2.5 pb-3 bg-white">
                    <h3 className="font-bold text-[13px] text-gray-900 truncate leading-tight group-hover:text-orange-500 transition-colors">
                        {creator.name}
                    </h3>
                    <p className="text-[11px] text-[#00AFF0] mt-0.5">@{creator.username}</p>
                    {creator.bio && (
                        <p className="mt-1 text-[11px] text-gray-500 line-clamp-2 leading-relaxed">{creator.bio}</p>
                    )}
                    <div className="w-full mt-2 py-2 rounded-lg bg-gradient-to-r from-[#00AFF0] to-[#00D4FF] text-white text-xs font-bold text-center group-hover:from-[#009ADB] group-hover:to-[#00BFE8] transition-all">
                        View profile
                    </div>
                </div>
            </div>
        </button>
    );
}

const VirtualizedGroupGrid = React.memo(function VirtualizedGroupGrid({
    groups,
    feedCampaigns,
    isTelegram,
    onOpenReviewModal,
    onOpenReportModal,
    bookmarkedMap = {},
    vaultTeaserGroups = [],
    trendingOFCreator,
}: VirtualizedGroupGridProps) {
    const hasVault = vaultTeaserGroups.length > 0;
    const [items, setItems] = useState<Item[]>(() => buildFeedItems(groups, feedCampaigns, hasVault, trendingOFCreator));

    useEffect(() => {
        setItems(buildFeedItems(groups, feedCampaigns, hasVault, trendingOFCreator));
    }, [groups, feedCampaigns, hasVault, trendingOFCreator]);

    return (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {items.map((item, idx) => {
                if (item.type === 'trending-of') {
                    const tc = item.data as TrendingOFCreator;
                    return <TrendingOFCard key={`trending-of-${tc._id}`} creator={tc} />;
                }
                if (item.type === 'vault-teaser') {
                    return (
                        <VaultTeaserFeed
                            key={`vault-teaser-${idx}`}
                            items={vaultTeaserGroups}
                        />
                    );
                }
                if (item.type === 'group') {
                    const groupData = item.data as Group;
                    const bmId = bookmarkedMap[groupData._id] || null;
                    const resolvedItemType = groupData.itemType || 'group';
                    return (
                        <GroupCard
                            key={`group-${groupData._id}`}
                            group={groupData}
                            isIndex={Math.floor(item.index)}
                            isFeatured={groupData.pinned && resolvedItemType !== 'bot'}
                            onOpenReviewModal={resolvedItemType !== 'bot' ? onOpenReviewModal : undefined}
                            onOpenReportModal={resolvedItemType !== 'bot' ? onOpenReportModal : undefined}
                            isBookmarked={!!bmId}
                            bookmarkId={bmId}
                            itemType={resolvedItemType}
                        />
                    );
                }
                return (
                    <AdvertCard
                        key={`campaign-${(item.data as FeedCampaign)._id}-${idx}`}
                        campaign={item.data as FeedCampaign}
                        isIndex={Math.floor(item.index)}
                        shouldPreload={false}
                        onVisible={undefined}
                    />
                );
            })}
        </div>
    );
});

export default VirtualizedGroupGrid;
