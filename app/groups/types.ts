export interface Group {
    _id: string;
    name: string;
    slug: string;
    category: string;
    country: string;
    description: string;
    image: string;
    telegramLink?: string;
    isAdvertisement?: boolean;
    advertisementUrl?: string;
    pinned?: boolean;
    clickCount?: number;
    views?: number;
    createdBy?: {
        username?: string;
        showNicknameUnderGroups?: boolean;
    } | null;
    averageRating?: number;
    reviewCount?: number;
    memberCount?: number;
}


export interface Advert {
    _id: string;
    name: string;
    slug: string;
    category: string;
    country: string;
    url: string;
    description: string;
    image: string;
    status: string;
    pinned?: boolean;
    clickCount: number;
    buttonText?: string;
}

export interface FeedCampaign {
    _id: string;
    name: string;
    creative: string;
    destinationUrl: string;
    slot: string;
    position: number;
    description: string;
    category: string;
    country: string;
    buttonText: string;
    /** Optional video URL — when set, renders a video ad card instead of an image card */
    videoUrl?: string;
    /** Configurable badge label (e.g. "Trending", "Hot", "New") */
    badgeText?: string;
}
