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

const MIN_GAP = 4;
const MAX_GAP = 6;
const FIRST_AD_AFTER = 3; // first ad appears after 3 real groups

function randBetween(min: number, max: number): number {
    return min + Math.floor(Math.random() * (max - min + 1));
}

function buildFeedItems(groups: Group[], campaigns: FeedCampaign[]): Item[] {
    const items: Item[] = [];
    let groupIdx = 0;
    let campaignIdx = 0;
    let groupsSinceLastAd = 0;
    let nextAdAt = FIRST_AD_AFTER;

    while (groupIdx < groups.length) {
        items.push({ type: 'group', data: groups[groupIdx], index: items.length });
        groupIdx++;
        groupsSinceLastAd++;

        if (groupsSinceLastAd >= nextAdAt && campaigns.length > 0) {
            items.push({ type: 'campaign', data: campaigns[campaignIdx % campaigns.length], index: items.length });
            campaignIdx++;
            groupsSinceLastAd = 0;
            nextAdAt = randBetween(MIN_GAP, MAX_GAP);
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
    const [items, setItems] = useState<Item[]>(() => groupsOnly(groups));

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
