import React, { useState, useEffect } from 'react';
import { Group, FeedCampaign } from './types';
import GroupCard from './GroupCard';
import AdvertCard from './AdvertCard';

interface VaultItem { _id: string; name: string; image: string; category: string; country: string; memberCount: number; vaultCategories?: string[]; }

interface VirtualizedGroupGridProps {
    groups: Group[];
    feedCampaigns: FeedCampaign[];
    isTelegram: boolean;
    onOpenReviewModal?: (group: Group) => void;
    onOpenReportModal?: (group: Group) => void;
    vaultItems?: VaultItem[];
    vaultPositions?: number[];
    isLoggedIn?: boolean;
    VaultCard?: React.ComponentType<{ items: VaultItem[]; isLoggedIn?: boolean }>;
}

type Item = { type: 'group' | 'campaign' | 'vault'; data: Group | FeedCampaign | null; index: number };

// Static ad positions in the grid (1-indexed group count):
// Tier 2 → after 2 groups (position 3 in the grid)
// Tier 3 → after 7 groups (position 8 in the grid)
// Then loop every 5 groups, cycling through tiers 1→2→3
const FIRST_AD_POSITION = 2;  // after 2 groups
const SECOND_AD_POSITION = 7; // after 7 groups (5 more after first ad)
const LOOP_GAP = 5;           // subsequent ads every 5 groups

function buildFeedItems(groups: Group[], campaigns: FeedCampaign[]): Item[] {
    const items: Item[] = [];
    if (campaigns.length === 0) {
        return groups.map((g, i) => ({ type: 'group' as const, data: g, index: i }));
    }

    // Build set of group-count positions where ads should appear
    const adPositions: number[] = [FIRST_AD_POSITION, SECOND_AD_POSITION];
    let pos = SECOND_AD_POSITION + LOOP_GAP;
    while (pos < groups.length + campaigns.length) {
        adPositions.push(pos);
        pos += LOOP_GAP;
    }

    let groupIdx = 0;
    let campaignIdx = 0;
    let groupCount = 0;

    for (let i = 0; groupIdx < groups.length; i++) {
        if (adPositions.includes(groupCount) && campaignIdx < campaigns.length) {
            items.push({ type: 'campaign', data: campaigns[campaignIdx % campaigns.length], index: items.length });
            campaignIdx++;
        }
        items.push({ type: 'group', data: groups[groupIdx], index: items.length });
        groupIdx++;
        groupCount++;
    }
    return items;
}

const VAULT_EVERY = 8;

const VirtualizedGroupGrid = React.memo(function VirtualizedGroupGrid({
    groups,
    feedCampaigns,
    isTelegram,
    onOpenReviewModal,
    onOpenReportModal,
    vaultItems,
    isLoggedIn,
    VaultCard,
}: VirtualizedGroupGridProps) {
    const [items, setItems] = useState<Item[]>(() => buildFeedItems(groups, feedCampaigns));

    useEffect(() => {
        setItems(buildFeedItems(groups, feedCampaigns));
    }, [groups, feedCampaigns]);

    const hasVault = VaultCard && vaultItems && vaultItems.length > 0;

    const finalItems: (Item | 'vault')[] = [];
    let groupsSinceLastVault = 0;
    for (let i = 0; i < items.length; i++) {
        if (hasVault && groupsSinceLastVault >= VAULT_EVERY) {
            finalItems.push('vault');
            groupsSinceLastVault = 0;
        }
        finalItems.push(items[i]);
        groupsSinceLastVault++;
    }

    return (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {finalItems.map((item, idx) => {
                if (item === 'vault') {
                    return VaultCard ? <VaultCard key={`vault-${idx}`} items={vaultItems!} isLoggedIn={isLoggedIn} /> : null;
                }
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
