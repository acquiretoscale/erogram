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
    bookmarkedMap?: Record<string, string>;
}

type Item = { type: 'group' | 'campaign'; data: Group | FeedCampaign | null; index: number };

// In-feed ad slot layout (by group count, 0-indexed):
//   Slot 2 → after 2 groups  (gc=2)   — one-time fixed
//   Slot 3 → after 7 groups  (gc=7)   — one-time fixed
//   Slot 4 → after 12 groups (gc=12)  — first occurrence, then loops every 5
const SLOT2_GC = 2;
const SLOT3_GC = 7;
const SLOT4_GC = 12;
const LOOP_GAP = 5;

function buildFeedItems(groups: Group[], campaigns: FeedCampaign[]): Item[] {
    const items: Item[] = [];
    if (campaigns.length === 0) {
        return groups.map((g, i) => ({ type: 'group' as const, data: g, index: i }));
    }

    const slot2 = campaigns.filter(c => c.tierSlot === 2);
    const slot3 = campaigns.filter(c => c.tierSlot === 3);
    const slot4 = campaigns.filter(c => c.tierSlot === 4);
    const allCampaigns = campaigns;

    let groupIdx = 0;
    let groupCount = 0;
    let slot4Idx = 0;

    while (groupIdx < groups.length) {
        if (groupCount === SLOT2_GC && slot2.length > 0) {
            items.push({ type: 'campaign', data: slot2[0], index: items.length });
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
}: VirtualizedGroupGridProps) {
    const [items, setItems] = useState<Item[]>(() => buildFeedItems(groups, feedCampaigns));

    useEffect(() => {
        setItems(buildFeedItems(groups, feedCampaigns));
    }, [groups, feedCampaigns]);

    return (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {items.map((item, idx) => {
                if (item.type === 'group') {
                    const groupData = item.data as Group;
                    const bmId = bookmarkedMap[groupData._id] || null;
                    return (
                        <GroupCard
                            key={`group-${groupData._id}`}
                            group={groupData}
                            isIndex={Math.floor(item.index)}
                            isFeatured={groupData.pinned}
                            onOpenReviewModal={onOpenReviewModal}
                            onOpenReportModal={onOpenReportModal}
                            isBookmarked={!!bmId}
                            bookmarkId={bmId}
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
