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
    verified?: boolean;
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
    /** Show verified checkmark next to the ad title */
    verified?: boolean;
    /** Tier slot (1-3): determines which section the ad appears in */
    tierSlot?: number;
}

// ─── Story Types ───

export interface StoryGroup {
    _id: string;
    name: string;
    slug: string;
    image: string;
    videoUrl?: string;
    category: string;
    country: string;
    description: string;
    createdAt?: string;
    memberCount?: number;
}

/** A single channel entry embedded inside a premium-grid story slide */
export interface PremiumGroupItem {
    name: string;
    slug: string;
    image: string;
    memberCount?: number;
    category: string;
}

/** A single media slide (R2 video/image, admin-uploaded, or premium-grid) */
export interface StoryMediaSlide {
    _id: string;
    mediaType: 'image' | 'video' | 'premium-grid';
    mediaUrl: string;
    ctaText?: string;
    ctaUrl?: string;
    clientName?: string;
    caption?: string;
    likes?: number;
    clicks?: number;
    /** Populated only when mediaType === 'premium-grid' */
    premiumGroups?: PremiumGroupItem[];
}

export interface StoryCategory {
    slug: string;
    label: string;
    profileImage: string;
    hasNewContent: boolean;
    /** DB groups (for erogram newest-additions view) */
    groups: StoryGroup[];
    /** R2/admin media slides (for random-girl, AI GF, erogram announcements) */
    mediaSlides?: StoryMediaSlide[];
    ctaText?: string;
    ctaUrl?: string;
    verified?: boolean;
    r2Folder?: string;
    /** 'erogram' | 'random-girl' | 'advert' — passed from config so viewer knows the type */
    storyType?: string;
}

export type StorySlide =
    | { type: 'group'; data: StoryGroup }
    | { type: 'media'; data: StoryMediaSlide };
