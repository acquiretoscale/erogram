import React, { useState, useEffect } from 'react';
import { Group, FeedCampaign } from './types';
import GroupCard from './GroupCard';
import AdvertCard from './AdvertCard';

interface VirtualizedGroupGridProps {
    groups: Group[];
    feedCampaigns: FeedCampaign[];
    isTelegram: boolean;
    onOpenReviewModal?: (group: Group) => void;
    onOpenReportModal?: (group: Group) => void;
}

type Item = { type: 'group' | 'campaign'; data: Group | FeedCampaign; index: number };

const BLOCK = 6;
const ADS_PER_BLOCK = 2;
const GROUPS_PER_BLOCK = BLOCK - ADS_PER_BLOCK; // 4

function randomNonAdjacentPair(): Set<number> {
    const pairs: [number, number][] = [];
    for (let i = 0; i < BLOCK - 2; i++) {
        for (let j = i + 2; j < BLOCK; j++) {
            pairs.push([i, j]);
        }
    }
    const [p1, p2] = pairs[Math.floor(Math.random() * pairs.length)];
    return new Set([p1, p2]);
}

function buildFeedItems(groups: Group[], campaigns: FeedCampaign[]): Item[] {
    const items: Item[] = [];
    let groupIdx = 0;
    let campaignIdx = 0;

    while (groupIdx < groups.length) {
        const groupsLeft = groups.length - groupIdx;

        if (groupsLeft >= GROUPS_PER_BLOCK && campaigns.length > 0) {
            const adSlots = randomNonAdjacentPair();
            let adsPlaced = 0;
            for (let slot = 0; slot < BLOCK; slot++) {
                if (adSlots.has(slot) && adsPlaced < ADS_PER_BLOCK) {
                    items.push({ type: 'campaign', data: campaigns[campaignIdx % campaigns.length], index: items.length });
                    campaignIdx++;
                    adsPlaced++;
                } else if (groupIdx < groups.length) {
                    items.push({ type: 'group', data: groups[groupIdx], index: items.length });
                    groupIdx++;
                }
            }
        } else {
            items.push({ type: 'group', data: groups[groupIdx], index: items.length });
            groupIdx++;
        }
    }
    return items;
}

function groupsOnly(groups: Group[]): Item[] {
    return groups.map((g, i) => ({ type: 'group' as const, data: g, index: i }));
}

const VirtualizedGroupGrid = React.memo(function VirtualizedGroupGrid({
    groups,
    feedCampaigns,
    isTelegram,
    onOpenReviewModal,
    onOpenReportModal,
}: VirtualizedGroupGridProps) {
    // Server renders groups only (no Math.random) → no hydration mismatch.
    // After mount, useEffect inserts ads with random placement client-side.
    const [items, setItems] = useState<Item[]>(() => groupsOnly(groups));

    // Always insert feed ad slots when we have campaigns (mobile + desktop). isTelegram only
    // affects whether AdvertCard renders content or a placeholder, so the grid layout stays correct.
    useEffect(() => {
        if (feedCampaigns.length > 0) {
            setItems(buildFeedItems(groups, feedCampaigns));
        } else {
            setItems(groupsOnly(groups));
        }
    }, [groups, feedCampaigns]);

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => {
                if (item.type === 'group') {
                    return (
                        <GroupCard
                            key={`group-${(item.data as Group)._id}`}
                            group={item.data as Group}
                            isIndex={Math.floor(item.index)}
                            isFeatured={(item.data as Group).pinned}
                            onOpenReviewModal={onOpenReviewModal}
                            onOpenReportModal={onOpenReportModal}
                        />
                    );
                }
                return (
                    <AdvertCard
                        key={`campaign-${(item.data as FeedCampaign)._id}-${item.index}`}
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
