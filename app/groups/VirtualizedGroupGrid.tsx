import React, { useState, useEffect } from 'react';
import { Group, FeedCampaign } from './types';
import GroupCard from './GroupCard';
import AdvertCard from './AdvertCard';
import VaultTeaserFeed, { type VaultTeaserItem } from './VaultTeaserFeed';

interface VirtualizedGroupGridProps {
    groups: Group[];
    feedCampaigns: FeedCampaign[];
    isTelegram: boolean;
    onOpenReviewModal?: (group: Group) => void;
    onOpenReportModal?: (group: Group) => void;
    bookmarkedMap?: Record<string, string>;
    vaultTeaserGroups?: VaultTeaserItem[];
}

type Item = { type: 'group' | 'campaign' | 'vault-teaser' | 'vault-group'; data: Group | FeedCampaign | null; index: number };

// In-feed ad slot layout (by group count, 0-indexed):
//   Slot 2 → after 2 groups  (gc=2)   — one-time fixed
//   Slot 5 → after 4 groups  (gc=4)   — Featured Bot, one-time fixed (groups feed only)
//   Slot 3 → after 8 groups  (gc=8)   — one-time fixed
//   Slot 4 → after 12 groups (gc=12)  — first occurrence, then loops every 5
const SLOT2_GC = 2;
const SLOT5_GC = 4;
const SLOT3_GC = 8;
const SLOT4_GC = 12;
const LOOP_GAP = 5;

const VAULT_TEASER_GC = 7;
const VAULT_TEASER_REPEAT = 20;
const VAULT_GROUP_EVERY = 7;

function buildFeedItems(groups: Group[], campaigns: FeedCampaign[], hasVaultTeaser: boolean, vaultGroups: VaultTeaserItem[] = []): Item[] {
    const items: Item[] = [];
    if (campaigns.length === 0 && !hasVaultTeaser) {
        return groups.map((g, i) => ({ type: 'group' as const, data: g, index: i }));
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
    let vaultGroupIdx = 0;

    while (groupIdx < groups.length) {
        if (hasVaultTeaser && groupCount === VAULT_TEASER_GC && !vaultInserted) {
            items.push({ type: 'vault-teaser', data: null, index: items.length });
            vaultInserted = true;
        }

        if (hasVaultTeaser && vaultInserted && groupCount > VAULT_TEASER_GC && (groupCount - VAULT_TEASER_GC) % VAULT_TEASER_REPEAT === 0) {
            items.push({ type: 'vault-teaser', data: null, index: items.length });
        }

        if (vaultGroups.length > 0 && groupCount > 0 && groupCount % VAULT_GROUP_EVERY === 0) {
            const vg = vaultGroups[vaultGroupIdx % vaultGroups.length];
            const asGroup: Group = { _id: vg._id, name: vg.name, slug: '', category: vg.category, country: vg.country || '', description: '', image: vg.image, memberCount: vg.memberCount };
            items.push({ type: 'vault-group', data: asGroup, index: items.length });
            vaultGroupIdx++;
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

const VirtualizedGroupGrid = React.memo(function VirtualizedGroupGrid({
    groups,
    feedCampaigns,
    isTelegram,
    onOpenReviewModal,
    onOpenReportModal,
    bookmarkedMap = {},
    vaultTeaserGroups = [],
}: VirtualizedGroupGridProps) {
    const hasVault = vaultTeaserGroups.length > 0;
    const [items, setItems] = useState<Item[]>(() => buildFeedItems(groups, feedCampaigns, hasVault, vaultTeaserGroups));

    useEffect(() => {
        setItems(buildFeedItems(groups, feedCampaigns, hasVault, vaultTeaserGroups));
    }, [groups, feedCampaigns, hasVault, vaultTeaserGroups]);

    return (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {items.map((item, idx) => {
                if (item.type === 'vault-teaser') {
                    return (
                        <VaultTeaserFeed
                            key={`vault-teaser-${idx}`}
                            items={vaultTeaserGroups}
                        />
                    );
                }
                if (item.type === 'vault-group') {
                    const groupData = item.data as Group;
                    return (
                        <GroupCard
                            key={`vault-group-${groupData._id}-${idx}`}
                            group={groupData}
                            isIndex={Math.floor(item.index)}
                            lockedPremium
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
