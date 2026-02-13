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
