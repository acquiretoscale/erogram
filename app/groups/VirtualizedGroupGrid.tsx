import React from 'react';
import { Group, Advert } from './types';
import GroupCard from './GroupCard';
import AdvertCard from './AdvertCard';

interface VirtualizedGroupGridProps {
    groups: Group[];
    advertPlacementsMap: Map<number, Advert>;
    isTelegram: boolean;
    onOpenReviewModal?: (group: Group) => void;
    onOpenReportModal?: (group: Group) => void;
}

const VirtualizedGroupGrid = React.memo(function VirtualizedGroupGrid({
    groups,
    advertPlacementsMap,
    isTelegram,
    onOpenReviewModal,
    onOpenReportModal
}: VirtualizedGroupGridProps) {
    // Create a combined array of items (groups and adverts)
    const items: Array<{ type: 'group' | 'advert'; data: Group | Advert; index: number }> = [];

    groups.forEach((group) => {
        // Check for adverts at this position
        if (!isTelegram) {
            let currentPos = items.length + 1;
            while (advertPlacementsMap.has(currentPos)) {
                const advert = advertPlacementsMap.get(currentPos);
                if (advert) {
                    items.push({ type: 'advert', data: advert, index: items.length });
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
                            key={`advert-${(item.data as Advert)._id}`}
                            advert={item.data as Advert}
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
