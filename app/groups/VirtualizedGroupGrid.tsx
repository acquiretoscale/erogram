import React from 'react';
import { Group, FeedCampaign } from './types';
import GroupCard from './GroupCard';
import AdvertCard from './AdvertCard';

interface VirtualizedGroupGridProps {
    groups: Group[];
    feedPlacementsMap: Map<number, FeedCampaign>;
    isTelegram: boolean;
    onOpenReviewModal?: (group: Group) => void;
    onOpenReportModal?: (group: Group) => void;
}

const VirtualizedGroupGrid = React.memo(function VirtualizedGroupGrid({
    groups,
    feedPlacementsMap,
    isTelegram,
    onOpenReviewModal,
    onOpenReportModal
}: VirtualizedGroupGridProps) {
    const items: Array<{ type: 'group' | 'campaign'; data: Group | FeedCampaign; index: number }> = [];

    groups.forEach((group) => {
        if (!isTelegram) {
            let currentPos = items.length + 1;
            while (feedPlacementsMap.has(currentPos)) {
                const campaign = feedPlacementsMap.get(currentPos);
                if (campaign) {
                    items.push({ type: 'campaign', data: campaign, index: items.length });
                }
                currentPos = items.length + 1;
            }
        }

        items.push({ type: 'group', data: group, index: items.length });
    });

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
                } else {
                    return (
                        <AdvertCard
                            key={`campaign-${(item.data as FeedCampaign)._id}`}
                            campaign={item.data as FeedCampaign}
                            isIndex={Math.floor(item.index)}
                            shouldPreload={false}
                            onVisible={undefined}
                        />
                    );
                }
            })}
        </div>
    );
});

export default VirtualizedGroupGrid;
