import mongoose, { Schema, models, model } from 'mongoose';

// User Schema
export const userSchema = new Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, sparse: true, default: undefined },
    password: { type: String },
    telegramId: { type: Number, unique: true, sparse: true },
    telegramUsername: { type: String, default: null },
    firstName: { type: String, default: null },
    photoUrl: { type: String, default: null },
    ip: { type: String },
    userAgent: { type: String },
    browser: { type: String },
    os: { type: String },
    device: { type: String },
    country: { type: String },
    city: { type: String },
    timezone: { type: String },
    language: { type: String },
    referrer: { type: String },
    lastLogin: { type: Date },
    loginCount: { type: Number, default: 0 },
    joinedGroups: [{ type: Schema.Types.ObjectId, ref: 'Group' }],
    savedGroups: [{ type: Schema.Types.ObjectId, ref: 'Group' }],
    isAdmin: { type: Boolean, default: false },
    isProfileVisible: { type: Boolean, default: true },
    hideTelegramHandle: { type: Boolean, default: false },
    showTelegramHandle: { type: Boolean, default: true },
    showNicknameUnderGroups: { type: Boolean, default: true },
    premium: { type: Boolean, default: false },
    premiumPlan: { type: String, enum: ['monthly', 'quarterly', 'yearly', 'lifetime', null], default: null },
    premiumSince: { type: Date, default: null },
    premiumExpiresAt: { type: Date, default: null },
    paymentMethod: { type: String, enum: ['stars', 'crypto', null], default: null },
    lastPaymentChargeId: { type: String, default: null },
    savedCreators: [{ type: Schema.Types.ObjectId, ref: 'OnlyFansCreator' }],
    interests: { type: [String], default: [] },
    preferredPlatforms: { type: [String], default: [] },
    interestedInAI: { type: Boolean, default: false },
    onboardingCompleted: { type: Boolean, default: false },
    stats: {
      groupsCreated: { type: Number, default: 0 },
      groupsSaved: { type: Number, default: 0 },
      commentsPosted: { type: Number, default: 0 },
      lastActivity: { type: Date, default: Date.now },
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Group Schema
export const groupSchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    category: { type: String, default: '' },
    country: { type: String, default: '' },
    categories: { type: [String], default: [] },
    telegramLink: {
      type: String,
      required: function () {
        return !this.isAdvertisement;
      },
      validate: {
        validator: function (v: string) {
          if (this.isAdvertisement) return true;
          return /^https:\/\/t\.me\/.+$/.test(v);
        },
        message: 'Telegram link must start with https://t.me/',
      },
    },
    description: { type: String, required: true },
    description_de: { type: String, default: '' },
    description_es: { type: String, default: '' },
    image: {
      type: String,
      required: [true, 'Group image is required'],
      default: '/assets/image.jpg',
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdByUsername: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'scheduled', 'deleted'], default: 'pending' },
    deletedAt: { type: Date, default: null },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
    pinned: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },
    featuredOrder: { type: Number, default: 999 },
    featuredAt: { type: Date, default: null },
    boosted: { type: Boolean, default: false },
    boostExpiresAt: { type: Date, default: null },
    boostDuration: { type: String, enum: ['1d', '7d', '14d', '30d', null], default: null },
    paidBoost: { type: Boolean, default: false },
    paidBoostStars: { type: Number, default: null },
    topGroupSlot: { type: Number, default: null },
    // CSV bulk-import scheduling fields
    scheduledPublishAt: { type: Date, default: null },
    importBatchId: { type: String, default: null },
    importSource: { type: String, default: null },
    sourceImageUrl: { type: String, default: null },
    publishedAt: { type: Date, default: null },
    views: { type: Number, default: 0 },
    weeklyViews: { type: Number, default: 0 },
    weeklyClicks: { type: Number, default: 0 },
    /** Daily view counts for last-48h: key = "YYYY-MM-DD" (UTC), value = count */
    viewsByDay: { type: Map, of: Number, default: new Map() },
    isAdvertisement: { type: Boolean, default: false },
    advertisementUrl: { type: String },
    advertiserId: { type: Schema.Types.ObjectId, ref: 'Advertiser', required: false },
    clickCount: { type: Number, default: 0 },
    /** Daily click counts for last-48h: key = "YYYY-MM-DD" (UTC), value = count */
    clickCountByDay: { type: Map, of: Number, default: new Map() },
    lastClickedAt: { type: Date },
    memberCount: { type: Number, default: 0 },
    memberCountUpdatedAt: { type: Date },
    verified: { type: Boolean, default: false },
    premiumOnly: { type: Boolean, default: false },
    showOnVaultTeaser: { type: Boolean, default: false },
    vaultTeaserOrder: { type: Number, default: 999 },
    vaultCategories: { type: [String], default: [] },
    hideFromStories: { type: Boolean, default: false },
    storyViews: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    linkedCreatorSlug: { type: String, default: '' },
  },
  { timestamps: true }
);

groupSchema.index({ status: 1, scheduledPublishAt: 1 });
groupSchema.index({ publishedAt: 1 });
groupSchema.index({ premiumOnly: 1, status: 1 });
groupSchema.index({ showOnVaultTeaser: 1, vaultTeaserOrder: 1 });
groupSchema.index({ categories: 1, status: 1 });
groupSchema.index({ featured: 1, featuredOrder: 1 });
groupSchema.index({ boosted: 1, boostExpiresAt: 1 });
groupSchema.index({ topGroupSlot: 1 });

// Post/Comment Schema
export const postSchema = new Schema(
  {
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User' }, // Optional for anonymous reviews
    authorName: { type: String, default: 'Anonymous' }, // For anonymous reviews
    content: { type: String, required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' }, // For moderation
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    ip: { type: String }, // For rate limiting
    userAgent: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Report Schema
export const reportSchema = new Schema(
  {
    type: { type: String, enum: ['group'], required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User' }, // Optional for anonymous reports
    reason: { type: String, required: true },
    status: { type: String, enum: ['pending', 'resolved'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
    groupDetails: { type: Object },
    createdBy: { type: Object },
  },
  { timestamps: true }
);

// Article Schema
export const articleSchema = new Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    content: { type: String, required: true },
    excerpt: { type: String, required: false }, // No default - will be explicitly set
    featuredImage: { type: String, required: false }, // No default - will be explicitly set
    author: { type: Schema.Types.ObjectId, ref: 'User', required: false }, // No default - will be explicitly set
    status: { type: String, enum: ['draft', 'published'], default: 'draft', required: true },
    publishedAt: { type: Date, required: false },
    views: { type: Number, default: 0 },
    weeklyViews: { type: Number, default: 0 },
    viewsByDay: { type: Map, of: Number, default: new Map() },
    advertiserId: { type: Schema.Types.ObjectId, ref: 'Advertiser', required: false },
    tags: [{ type: String }],
    // SEO Metadata fields
    metaTitle: { type: String, required: false },
    metaDescription: { type: String, required: false },
    metaKeywords: { type: String, required: false },
    ogImage: { type: String, required: false },
    ogTitle: { type: String, required: false },
    ogDescription: { type: String, required: false },
    twitterCard: { type: String, enum: ['summary', 'summary_large_image'], default: 'summary_large_image', required: false },
    twitterImage: { type: String, required: false },
    twitterTitle: { type: String, required: false },
    twitterDescription: { type: String, required: false },
  },
  {
    timestamps: true,
    strictPopulate: false,
    minimize: false // Don't omit empty objects
  }
);

// Create indexes for performance
articleSchema.index({ status: 1, publishedAt: -1, createdAt: -1 });
articleSchema.index({ author: 1 });
// Note: slug index is already created by unique: true constraint, no need to duplicate

// Advert Schema
export const advertSchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    category: { type: String, required: true },
    country: { type: String, required: true },
    url: {
      type: String, required: true, validate: {
        validator: function (v: string) {
          return /^https?:\/\//.test(v);
        },
        message: 'URL must start with http:// or https://'
      }
    },
    description: { type: String, required: true },
    image: { type: String, required: true, default: '/assets/image.jpg' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    pinned: { type: Boolean, default: false },
    clickCount: { type: Number, default: 0 },
    lastClickedAt: { type: Date },
    views: { type: Number, default: 0 },
    // Popup advert fields
    isPopupAdvert: { type: Boolean, default: false },
    buttonText: { type: String, default: 'Visit Site' },
    redirectTimer: { type: Number, default: 7 }, // Countdown in seconds
    // Additional buttons
    button2Enabled: { type: Boolean, default: false },
    button2Text: { type: String, default: '' },
    button2Url: { type: String, default: '' },
    button3Enabled: { type: Boolean, default: false },
    button3Text: { type: String, default: '' },
    button3Url: { type: String, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Bot Schema
export const botSchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    category: { type: String, default: '' },
    country: { type: String, default: '' },
    categories: { type: [String], default: [] },
    telegramLink: {
      type: String,
      required: function () {
        return !this.isAdvertisement;
      },
      validate: {
        validator: function (v: string) {
          if (this.isAdvertisement) return true;
          return /^https:\/\/t\.me\/.+$/.test(v);
        },
        message: 'Telegram link must start with https://t.me/',
      },
    },
    description: { type: String, required: true },
    description_de: { type: String, default: '' },
    description_es: { type: String, default: '' },
    image: {
      type: String,
      required: [true, 'Bot image is required'],
      default: '/assets/image.jpg',
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdByUsername: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
    pinned: { type: Boolean, default: false },
    topBot: { type: Boolean, default: false },
    showVerified: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },
    featuredOrder: { type: Number, default: 999 },
    featuredAt: { type: Date, default: null },
    boosted: { type: Boolean, default: false },
    boostExpiresAt: { type: Date, default: null },
    boostDuration: { type: String, enum: ['1d', '7d', '14d', '30d', null], default: null },
    paidBoost: { type: Boolean, default: false },
    paidBoostStars: { type: Number, default: null },
    publishedAt: { type: Date, default: null },
    views: { type: Number, default: 0 },
    isAdvertisement: { type: Boolean, default: false },
    advertisementUrl: { type: String },
    clickCount: { type: Number, default: 0 },
    clickCountByDay: { type: Map, of: Number, default: new Map() },
    lastClickedAt: { type: Date },
    memberCount: { type: Number, default: 0 },
    memberCountUpdatedAt: { type: Date },
  },
  { timestamps: true }
);

botSchema.index({ categories: 1, status: 1 });

// Category Schema
export const categorySchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Country Schema
export const countrySchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Join Page Button Configuration Schema
export const buttonConfigSchema = new Schema(
  {
    button1: {
      text: { type: String, required: true, default: 'Join Telegram' },
      link: { type: String, required: true, default: '' },
      color: { type: String, required: true, default: 'from-blue-500 to-purple-600' },
    },
    button2: {
      text: { type: String, required: true, default: 'Browse Groups' },
      link: { type: String, required: true, default: '/groups' },
      color: { type: String, required: true, default: 'from-green-500 to-emerald-600' },
    },
    button3: {
      text: { type: String, required: true, default: 'Learn More' },
      link: { type: String, required: true, default: '/' },
      color: { type: String, required: true, default: 'from-orange-500 to-red-600' },
    },
  },
  { timestamps: true }
);


// Site Configuration Schema
export const siteConfigSchema = new Schema(
  {
    navbarButton1: {
      text: { type: String, required: true, default: 'Casual dating' },
      url: { type: String, required: true, default: 'https://go.cm-trk6.com/aff_c?offer_id=11167&aff_id=93961&url_id=19191&source=erogram.pro&aff_sub=feed' },
      enabled: { type: Boolean, default: true },
    },
    navbarButton2: {
      text: { type: String, required: true, default: '' },
      url: { type: String, required: true, default: '' },
      enabled: { type: Boolean, default: false },
    },
    navbarButton3: {
      text: { type: String, required: true, default: '' },
      url: { type: String, required: true, default: '' },
      enabled: { type: Boolean, default: false },
    },
    filterBanner1: {
      enabled: { type: Boolean, default: false },
      title: { type: String, default: '' },
      description: { type: String, default: '' },
      image: { type: String, default: '' },
      url: { type: String, default: '' },
      buttonText: { type: String, default: 'Visit Site' },
    },
    filterBanner2: {
      enabled: { type: Boolean, default: false },
      title: { type: String, default: '' },
      description: { type: String, default: '' },
      image: { type: String, default: '' },
      url: { type: String, default: '' },
      buttonText: { type: String, default: 'Visit Site' },
    },
    filterBanner3: {
      enabled: { type: Boolean, default: false },
      title: { type: String, default: '' },
      description: { type: String, default: '' },
      image: { type: String, default: '' },
      url: { type: String, default: '' },
      buttonText: { type: String, default: 'Visit Site' },
    },
    filterButton: {
      text: { type: String, default: '' },
      url: { type: String, default: '' },
    },
    topBanner: {
      imageUrl: { type: String, default: '' },
      url: { type: String, default: '' },
    },
    generalSettings: {
      type: Schema.Types.Mixed,
      default: () => ({}),
    },
    vaultTeaserCategories: {
      type: [{ name: String, visible: { type: Boolean, default: true }, order: { type: Number, default: 0 } }],
      default: [],
    },
  },
  { timestamps: true }
);

// Tracking/Analytics Event Schema
//
// This is intentionally permissive (strict: false) to avoid breaking any existing
// analytics payloads written by API routes.
export const trackingEventSchema = new Schema(
  {},
  {
    timestamps: true,
    strict: false,
    minimize: false,
  }
);

// Type for a tracking event document (fields are dynamic)
export type TrackingEvent = mongoose.Document & {
  createdAt: Date;
  updatedAt: Date;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

// System Configuration Schema
export const systemConfigSchema = new Schema(
  {
    key: { type: String, required: true, unique: true }, // e.g., 'view_reset'
    value: { type: Schema.Types.Mixed },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Image Schema (stores uploaded images as binary in MongoDB)
export const imageSchema = new Schema(
  {
    data: { type: Buffer, required: true },
    contentType: { type: String, required: true },
    filename: { type: String, required: true },
  },
  { timestamps: true }
);

// Advertiser Schema
export const advertiserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    company: { type: String, default: '' },
    logo: { type: String, default: '' },
    notes: { type: String, default: '' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

// Campaign Schema
export const campaignSchema = new Schema(
  {
    advertiserId: { type: Schema.Types.ObjectId, ref: 'Advertiser', required: true },
    name: { type: String, required: true },
    internalName: { type: String, default: '' },
    slot: {
      type: String,
      enum: ['top-banner', 'homepage-hero', 'feed', 'navbar-cta', 'join-cta', 'filter-cta', 'sidebar-feed', 'article-link', 'ainsfw'],
      required: true,
    },
    creative: { type: String, required: false, default: '' },
    destinationUrl: {
      type: String,
      required: true,
      validate: {
        validator: function (v: string) {
          return /^https?:\/\//.test(v) || /^\//.test(v);
        },
        message: 'URL must start with http://, https://, or /',
      },
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ['active', 'paused', 'ended'], default: 'active' },
    isVisible: { type: Boolean, default: true },
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    // Feed-specific fields
    position: { type: Number, default: null },
    feedTier: { type: Number, default: null }, // 1=top, 2=middle, 3=bottom (only for slot=feed)
    tierSlot: { type: Number, default: null }, // 1-5 within tier (1=Top Groups, 2=after 2 groups, 3=after 7, 4=after 12+loops, 5=Featured Bot)
    description: { type: String, default: '' },
    category: { type: String, default: 'All' },
    country: { type: String, default: 'All' },
    buttonText: { type: String, default: 'Visit Site' },
    // Where to show this feed ad: groups only, bots only, or both
    feedPlacement: { type: String, enum: ['groups', 'bots', 'both'], default: 'both' },
    // Optional video URL for video ad variant (feed slot only)
    videoUrl: { type: String, default: '' },
    // Configurable badge label (e.g. "Trending", "Hot", "New") — shown on the card
    badgeText: { type: String, default: '' },
    // Show a verified checkmark next to the ad title (like Instagram verified)
    verified: { type: Boolean, default: false },
    // Ad type: 'advertiser' (image/video), 'premium' (group mosaic), 'featured-bot' (slot-5 bot spotlight),
    // 'featured-nsfw' (nsfw spotlight), or 'onlyfans-creator' (single OF creator campaign — renders like image ad)
    adType: { type: String, enum: ['advertiser', 'premium', 'featured-bot', 'featured-nsfw', 'onlyfans-creator'], default: 'advertiser' },
    // For onlyfans-creator ads: the creator's username (for display + linkback). destinationUrl stores the OF URL.
    ofUsername: { type: String, default: '' },
    // For premium ads: which category to pull featured groups from
    premiumCategory: { type: String, default: '' },
    // For premium ads: hand-picked group IDs to show (overrides automatic category query)
    premiumGroupIds: { type: [Schema.Types.ObjectId], default: [] },
    // Social proof indicator shown on the card: 'none' | 'visiting' | 'clicks' | 'trending' | 'random'
    socialProof: { type: String, enum: ['none', 'visiting', 'clicks', 'trending', 'random'], default: 'random' },
    // Banner page targeting: which pages this top-banner/homepage-hero appears on (empty = all pages)
    bannerPages: { type: [String], default: [] },
    // Banner device targeting: 'all' | 'mobile' | 'desktop'
    bannerDevice: { type: String, enum: ['all', 'mobile', 'desktop'], default: 'all' },
  },
  { timestamps: true }
);

campaignSchema.index({ slot: 1, status: 1, isVisible: 1, startDate: 1, endDate: 1 });
campaignSchema.index({ slot: 1, feedTier: 1, tierSlot: 1 });

// CampaignClick Schema (for per-day click stats; Campaign.clicks is the all-time total)
export const campaignClickSchema = new Schema(
  {
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true },
    clickedAt: { type: Date, required: true, default: Date.now },
    placement: { type: String, default: '' },
  },
  { timestamps: true }
);
campaignClickSchema.index({ clickedAt: 1 });
campaignClickSchema.index({ campaignId: 1, clickedAt: 1 });

// CampaignImpressionDaily: daily aggregated impression counts for period-specific CTR
export const campaignImpressionDailySchema = new Schema(
  {
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true },
    date: { type: String, required: true }, // "YYYY-MM-DD"
    count: { type: Number, default: 0 },
  },
  { timestamps: false }
);
campaignImpressionDailySchema.index({ campaignId: 1, date: 1 }, { unique: true });
campaignImpressionDailySchema.index({ date: 1 });

// StorySlideContent — admin-managed slides for EROGRAM announcements, AI GF ads, random girl CTAs
export const storySlideContentSchema = new Schema(
  {
    categorySlug: { type: String, required: true, index: true },
    mediaType: { type: String, enum: ['image', 'video', 'premium-grid'], required: true },
    mediaUrl: { type: String, default: '' },
    ctaText: { type: String, default: '' },
    ctaUrl: { type: String, default: '' },
    duration: { type: Number, default: 24 },
    expiresAt: { type: Date, default: null },
    enabled: { type: Boolean, default: true },
    clientName: { type: String, default: '' },
    sortOrder: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    caption: { type: String, default: '' },
    likes: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    ctaPosition: { type: String, enum: ['top', 'middle', 'bottom'], default: 'bottom' },
    ctaColor: { type: String, default: 'blue' },
    premiumGroups: [{
      name: String,
      slug: String,
      image: String,
      memberCount: Number,
      category: String,
    }],
  },
  { timestamps: true }
);
storySlideContentSchema.index({ categorySlug: 1, enabled: 1, expiresAt: 1 });

// Premium Funnel Event Schema
export const premiumEventSchema = new Schema(
  {
    event: {
      type: String,
      required: true,
      enum: [
        'page_view',
        'modal_open',
        'plan_click',
        'crypto_plan_click',
        'invoice_created',
        'invoice_error',
        'crypto_invoice_created',
        'crypto_invoice_error',
        'pre_checkout',
        'payment_success',
        'crypto_payment_success',
        'crypto_partial_payment',
        'crypto_webhook_waiting',
        'crypto_webhook_confirming',
        'crypto_webhook_confirmed',
        'crypto_webhook_sending',
        'crypto_webhook_partially_paid',
        'crypto_webhook_finished',
        'crypto_webhook_failed',
        'crypto_webhook_refunded',
        'crypto_webhook_expired',
        'already_premium',
        'slots_full',
      ],
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    username: { type: String, default: null },
    plan: { type: String, enum: ['monthly', 'quarterly', 'yearly', 'lifetime', null], default: null },
    source: { type: String, enum: ['premium_page', 'upgrade_modal', 'server'], default: null },
    paymentMethod: { type: String, enum: ['stars', 'crypto', null], default: null },
    reason: { type: String, default: null },
    errorMessage: { type: String, default: null },
    chargeId: { type: String, default: null },
    orderId: { type: String, default: null },
    paymentId: { type: String, default: null },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  { timestamps: true }
);
premiumEventSchema.index({ event: 1, createdAt: -1 });
premiumEventSchema.index({ userId: 1, createdAt: -1 });
premiumEventSchema.index({ createdAt: -1 });

// Stars Rate (USD/USDT per Star) — one row per UTC day
export const starsRateSchema = new Schema(
  {
    date: { type: String, required: true, unique: true }, // "YYYY-MM-DD" (UTC)
    usdtPerStar: { type: Number, required: true },
    tonPerStar: { type: Number, required: false, default: null },
    usdtPerTon: { type: Number, required: false, default: null },
    source: { type: String, required: true, default: 'telegram_stars_rates' },
    fetchedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);
starsRateSchema.index({ fetchedAt: -1 });

// Bookmark Schema
export const bookmarkSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    itemType: { type: String, enum: ['group', 'bot'], required: true },
    itemId: { type: Schema.Types.ObjectId, required: true },
    folderId: { type: Schema.Types.ObjectId, ref: 'BookmarkFolder', default: null },
  },
  { timestamps: true }
);
bookmarkSchema.index({ userId: 1, itemType: 1, itemId: 1 }, { unique: true });
bookmarkSchema.index({ userId: 1, folderId: 1 });

// BookmarkFolder Schema
export const bookmarkFolderSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, maxlength: 40 },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Admin Push Subscription Schema — stores admin browser push subscriptions
export const adminPushSubscriptionSchema = new Schema(
  {
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Premium pricing config (singleton — one document with key='default')
const planSubSchema = {
  priceUsd: { type: Number, required: true },
  starsAmount: { type: Number, default: null },
  days: { type: Number, required: true },
  label: { type: String, required: true },
  description: { type: String, default: '' },
};
const premiumConfigSchema = new Schema(
  {
    key: { type: String, default: 'default', unique: true },
    monthly: { ...planSubSchema, starsAmount: { type: Number, default: 865 }, priceUsd: { type: Number, default: 12.97 }, days: { type: Number, default: 30 }, label: { type: String, default: 'Erogram VIP (1 Month)' }, description: { type: String, default: '30-day unlimited access — Secret Vault, bookmarks & more' } },
    quarterly: { ...planSubSchema, starsAmount: { type: Number, default: 1332 }, priceUsd: { type: Number, default: 19.97 }, days: { type: Number, default: 90 }, label: { type: String, default: 'Erogram VIP (3 Months)' }, description: { type: String, default: '3-month unlimited access — Secret Vault, bookmarks & more' } },
    yearly: { ...planSubSchema, starsAmount: { type: Number, default: 1934 }, priceUsd: { type: Number, default: 29 }, days: { type: Number, default: 365 }, label: { type: String, default: 'Erogram VIP (1 Year)' }, description: { type: String, default: '1-year unlimited access — Secret Vault, bookmarks & more' } },
    offerBadge: { type: String, default: '80% OFF' },
    offerText: { type: String, default: 'Launch price ends soon' },
  },
  { timestamps: true }
);

// Vote Schema (like/dislike on vault groups)
const voteSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    vote: { type: String, enum: ['like', 'dislike'], required: true },
  },
  { timestamps: true }
);
voteSchema.index({ userId: 1, groupId: 1 }, { unique: true });
voteSchema.index({ groupId: 1 });

// Manual Revenue (partner deals, affiliate payouts, ad sales logged by admin)
export const manualRevenueSchema = new Schema(
  {
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    description: { type: String, required: true },
    clientName: { type: String, default: '' },
    category: {
      type: String,
      enum: ['monthly_ad', 'one_time_ad', 'affiliate', 'sponsored', 'partnership', 'other'],
      default: 'monthly_ad',
    },
    recurring: { type: Boolean, default: false },
    paidAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
manualRevenueSchema.index({ paidAt: -1 });
manualRevenueSchema.index({ category: 1 });

// Premium Pricing Schema (per-plan documents for Stars-based pricing)
export const premiumPricingSchema = new Schema(
  {
    plan: { type: String, required: true, unique: true },
    starsPrice: { type: Number, required: true },
    starsOriginalPrice: { type: Number, required: true },
    enabled: { type: Boolean, default: true },
    discountLabel: { type: String, default: '' },
    bestseller: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Export models
export const Vote = models.Vote || model('Vote', voteSchema);
export const User = models.User || model('User', userSchema);
export const Group = models.Group || model('Group', groupSchema);
export const Bot = models.Bot || model('Bot', botSchema);
export const Post = models.Post || model('Post', postSchema);
export const Report = models.Report || model('Report', reportSchema);
export const Article = models.Article || model('Article', articleSchema);
export const Advert = models.Advert || model('Advert', advertSchema);
export const Category = models.Category || model('Category', categorySchema);
export const Country = models.Country || model('Country', countrySchema);
export const ButtonConfig = models.ButtonConfig || model('ButtonConfig', buttonConfigSchema);
export const SiteConfig = models.SiteConfig || model('SiteConfig', siteConfigSchema);
export const SystemConfig = models.SystemConfig || model('SystemConfig', systemConfigSchema);
export const TrackingEvent =
  (models.TrackingEvent as mongoose.Model<TrackingEvent>) ||
  model<TrackingEvent>('TrackingEvent', trackingEventSchema);
export const Image = models.Image || model('Image', imageSchema);
export const Advertiser = models.Advertiser || model('Advertiser', advertiserSchema);
export const Campaign = models.Campaign || model('Campaign', campaignSchema);
export const CampaignClick = models.CampaignClick || model('CampaignClick', campaignClickSchema);
export const CampaignImpressionDaily = models.CampaignImpressionDaily || model('CampaignImpressionDaily', campaignImpressionDailySchema);
export const StorySlideContent = models.StorySlideContent || model('StorySlideContent', storySlideContentSchema);
export const PremiumEvent = models.PremiumEvent || model('PremiumEvent', premiumEventSchema);
export const StarsRate = models.StarsRate || model('StarsRate', starsRateSchema);
export const Bookmark = models.Bookmark || model('Bookmark', bookmarkSchema);
export const BookmarkFolder = models.BookmarkFolder || model('BookmarkFolder', bookmarkFolderSchema);
export const AdminPushSubscription = models.AdminPushSubscription || model('AdminPushSubscription', adminPushSubscriptionSchema);
export const PremiumConfig = models.PremiumConfig || model('PremiumConfig', premiumConfigSchema);
export const ManualRevenue = models.ManualRevenue || model('ManualRevenue', manualRevenueSchema);
export const PremiumPricing = models.PremiumPricing || model('PremiumPricing', premiumPricingSchema);

// Best Group Pick Schema – admin-curated picks for "Best Telegram Groups" pages
export const bestGroupPickSchema = new Schema(
  {
    targetType: { type: String, enum: ['category', 'country'], required: true },
    targetValue: { type: String, required: true },
    group: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    position: { type: Number, required: true, min: 1, max: 10 },
  },
  { timestamps: true }
);

bestGroupPickSchema.index({ targetType: 1, targetValue: 1, position: 1 }, { unique: true });
bestGroupPickSchema.index({ targetType: 1, targetValue: 1, group: 1 }, { unique: true });

export const BestGroupPick = models.BestGroupPick || model('BestGroupPick', bestGroupPickSchema);

// OnlyFans Creator Schema — scraped via Apify
export const onlyFansCreatorSchema = new Schema(
  {
    name: { type: String, required: true },
    username: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    categories: { type: [String], default: [] },
    avatar: { type: String, default: '' },
    avatarThumbC50: { type: String, default: '' },
    avatarThumbC144: { type: String, default: '' },
    header: { type: String, default: '' },
    bio: { type: String, default: '' },
    subscriberCount: { type: Number, default: 0 },
    likesCount: { type: Number, default: 0 },
    mediaCount: { type: Number, default: 0 },
    photosCount: { type: Number, default: 0 },
    videosCount: { type: Number, default: 0 },
    audiosCount: { type: Number, default: 0 },
    postsCount: { type: Number, default: 0 },
    price: { type: Number, default: 0 },
    isFree: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    url: { type: String, required: true },
    gender: { type: String, enum: ['female', 'male', 'unknown'], default: 'unknown' },
    clicks: { type: Number, default: 0 },
    clicksPrev: { type: Number, default: 0 },
    rankPrev: { type: Number, default: 0 },
    clicksSnapshotDate: { type: String, default: '' },
    featured: { type: Boolean, default: false },
    featuredAt: { type: Date, default: null },
    featuredExpiresAt: { type: Date, default: null },
    featuredPaymentId: { type: String, default: null },
    scrapedAt: { type: Date, default: Date.now },
    lastSeen: { type: String, default: '' },
    location: { type: String, default: '' },
    website: { type: String, default: '' },
    joinDate: { type: String, default: '' },
    onlyfansId: { type: Number, default: 0 },
    hasStories: { type: Boolean, default: false },
    hasStream: { type: Boolean, default: false },
    hasScheduledStream: { type: Boolean, default: false },
    tipsEnabled: { type: Boolean, default: false },
    tipsTextEnabled: { type: Boolean, default: false },
    tipsMin: { type: Number, default: 0 },
    tipsMinInternal: { type: Number, default: 0 },
    tipsMax: { type: Number, default: 0 },
    finishedStreamsCount: { type: Number, default: 0 },
    showMediaCount: { type: Boolean, default: false },
    isRestricted: { type: Boolean, default: false },
    canEarn: { type: Boolean, default: false },
    canChat: { type: Boolean, default: false },
    privateArchivedPostsCount: { type: Number, default: 0 },
    favoritesCount: { type: Number, default: 0 },
    firstPublishedPostDate: { type: String, default: '' },
    subscriptionBundles: { type: Schema.Types.Mixed, default: null },
    promotions: { type: [Schema.Types.Mixed], default: [] },
    instagramUrl: { type: String, default: '' },
    instagramUsername: { type: String, default: '' },
    twitterUrl: { type: String, default: '' },
    tiktokUrl: { type: String, default: '' },
    fanslyUrl: { type: String, default: '' },
    pornhubUrl: { type: String, default: '' },
    telegramUrl: { type: String, default: '' },
    extraPhotos: { type: [String], default: [] },
    submittedByUser: { type: Boolean, default: false },
    submissionStatus: { type: String, enum: ['approved', 'pending', 'rejected'], default: 'approved' },
    deleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);
onlyFansCreatorSchema.index({ categories: 1, clicks: -1 });
onlyFansCreatorSchema.index({ clicks: -1 });
onlyFansCreatorSchema.index({ featured: 1 });
onlyFansCreatorSchema.index({ subscriberCount: -1 });
onlyFansCreatorSchema.index({ deleted: 1 });

export const OnlyFansCreator = models.OnlyFansCreator || model('OnlyFansCreator', onlyFansCreatorSchema);

// Creator Review Schema — user ratings for OnlyFans creator pages
const creatorReviewSchema = new Schema(
  {
    creatorSlug: { type: String, required: true, index: true },
    author: { type: Schema.Types.ObjectId, ref: 'User' },
    authorName: { type: String, default: 'Anonymous' },
    content: { type: String, default: '' },
    rating: { type: Number, min: 1, max: 5, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
    ip: { type: String },
  },
  { timestamps: true }
);
creatorReviewSchema.index({ creatorSlug: 1, status: 1 });
creatorReviewSchema.index({ creatorSlug: 1, author: 1 }, { unique: true, sparse: true });

export const CreatorReview = models.CreatorReview || model('CreatorReview', creatorReviewSchema);

// Trending on Erogram — admin-curated chart shown on onlyfanssearch
const trendingErogramSchema = new Schema(
  {
    creatorId:  { type: Schema.Types.ObjectId, ref: 'OnlyFansCreator' },
    name:       { type: String, required: true },
    username:   { type: String, required: true },
    slug:       { type: String, required: true },
    avatar:     { type: String, default: '' },
    points:     { type: Number, default: 0 },
    pointsDelta:{ type: Number, default: 0 },
    position:   { type: Number, required: true },
    active:     { type: Boolean, default: true },
  },
  { timestamps: true },
);
trendingErogramSchema.index({ position: 1 });
trendingErogramSchema.index({ active: 1, position: 1 });

export const TrendingErogram = models.TrendingErogram || model('TrendingErogram', trendingErogramSchema);

// Trending OF Creator — paid promoted spots shown on all onlyfans-search pages
const trendingOFCreatorSchema = new Schema(
  {
    name:          { type: String, required: true },
    username:      { type: String, required: true },
    avatar:        { type: String, default: '' },
    url:           { type: String, required: true },
    bio:           { type: String, default: '' },
    categories:    { type: [String], default: [] },
    position:      { type: Number, min: 1, max: 12, required: true },
    active:        { type: Boolean, default: true },
    clicks:        { type: Number, default: 0 },
    note:          { type: String, default: '' },
    dealPrice:     { type: Number, default: 0 },
    clickBudget:   { type: Number, default: 0 },   // 0 = unlimited; > 0 = auto-pause when clicks >= budget
    dailyClickCap: { type: Number, default: 0 },   // 0 = unlimited; > 0 = stop counting after N clicks/day
    isStarPick:    { type: Boolean, default: false }, // true = added by star button (NOT a paid client)
    liveHourStart: { type: Number, default: -1, min: -1, max: 23 }, // -1 = never live; 0–23 = GMT hour start
    liveHourEnd:   { type: Number, default: -1, min: -1, max: 23 }, // -1 = never live; 0–23 = GMT hour end
  },
  { timestamps: true },
);
trendingOFCreatorSchema.index({ position: 1 }, { unique: true });

export const TrendingOFCreator = models.TrendingOFCreator || model('TrendingOFCreator', trendingOFCreatorSchema);

// Daily click log for trending creators — powers the admin chart + daily cap enforcement
const trendingClickDailySchema = new Schema(
  {
    creatorId: { type: Schema.Types.ObjectId, ref: 'TrendingOFCreator', required: true },
    date:      { type: String, required: true }, // "YYYY-MM-DD"
    clicks:    { type: Number, default: 0 },
  },
  { timestamps: false },
);
trendingClickDailySchema.index({ creatorId: 1, date: 1 }, { unique: true });
trendingClickDailySchema.index({ date: 1 });

export const TrendingClickDaily = models.TrendingClickDaily || model('TrendingClickDaily', trendingClickDailySchema);

// OFM Settings — stores Apify API keys for rotation (when one is burned, next is used)
export const ofmSettingsSchema = new Schema(
  {
    key: { type: String, default: 'default', unique: true },
    apifyKeys: [
      {
        label: { type: String, default: '' },
        apiKey: { type: String, required: true },
        active: { type: Boolean, default: true },
        burned: { type: Boolean, default: false },
        usageCount: { type: Number, default: 0 },
        lastUsedAt: { type: Date, default: null },
        addedAt: { type: Date, default: Date.now },
      },
    ],
    apifyActor: { type: String, default: 'igolaizola/onlyfans-scraper' },
  },
  { timestamps: true },
);

export const OFMSettings = models.OFMSettings || model('OFMSettings', ofmSettingsSchema);

// Search Query Schema — logs every user search on /onlyfans-search
export const searchQuerySchema = new Schema(
  {
    query: { type: String, required: true },
    queryNormalized: { type: String, required: true, unique: true },
    searchCount: { type: Number, default: 1 },
    lastSearchedAt: { type: Date, default: Date.now },
    scraped: { type: Boolean, default: false },
    scrapeStatus: { type: String, enum: ['pending', 'scraping', 'done', 'failed'], default: 'pending' },
    scrapedAt: { type: Date, default: null },
    resultsCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);
searchQuerySchema.index({ searchCount: -1 });
searchQuerySchema.index({ scraped: 1 });
searchQuerySchema.index({ createdAt: -1 });

export const SearchQuery = models.SearchQuery || model('SearchQuery', searchQuerySchema);

// Scrape Run Log — persists every Apify scrape run for cost tracking
export const scrapeRunSchema = new Schema(
  {
    source: { type: String, enum: ['bulk', 'search', 'import', 'admin'], required: true },
    query: { type: String, required: true },
    runId: { type: String, default: '' },
    actorId: { type: String, default: '' },
    status: { type: String, enum: ['running', 'succeeded', 'failed', 'aborted', 'timed-out'], default: 'running' },
    maxItems: { type: Number, default: 200 },
    totalItems: { type: Number, default: 0 },
    saved: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    clean: { type: Boolean, default: false },
    error: { type: String, default: '' },
    apiKeyHint: { type: String, default: '' },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
    durationMs: { type: Number, default: 0 },
  },
  { timestamps: true },
);
scrapeRunSchema.index({ createdAt: -1 });
scrapeRunSchema.index({ source: 1 });
scrapeRunSchema.index({ status: 1 });
scrapeRunSchema.index({ query: 1 });

export const ScrapeRun = models.ScrapeRun || model('ScrapeRun', scrapeRunSchema);

// AI NSFW Tool — votes + reviews (per-tool aggregate)
const ainsfwToolStatsSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    upvotes: { type: Number, default: 0 },
    downvotes: { type: Number, default: 0 },
    featured: { type: Boolean, default: false, index: true },
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', default: null },
    reviews: [
      {
        text: { type: String, required: true, maxlength: 1000 },
        rating: { type: Number, required: true, min: 1, max: 5 },
        ip: { type: String, default: '' },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

export const AINsfwToolStats = models.AINsfwToolStats || model('AINsfwToolStats', ainsfwToolStatsSchema);

// AI NSFW Submission — user-submitted AI tools for listing
const ainsfwSubmissionSchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    category: { type: String, required: true },
    categories: { type: [String], default: [] },
    vendor: { type: String, default: '' },
    description: { type: String, required: true },
    image: { type: String, default: '/assets/image.jpg' },
    websiteUrl: { type: String, required: true },
    tags: { type: [String], default: [] },
    subscription: { type: String, default: '' },
    payment: { type: [String], default: [] },
    tryNowUrl: { type: String, default: '' },
    contactEmail: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    submissionTier: { type: String, enum: ['basic', 'boost', 'free', 'instant', 'platinum'], default: 'basic' },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'none'], default: 'none' },
    paymentId: { type: String, default: null },
    boosted: { type: Boolean, default: false },
    boostExpiresAt: { type: Date, default: null },
    featured: { type: Boolean, default: false },
    featuredExpiresAt: { type: Date, default: null },
    views: { type: Number, default: 0 },
    clickCount: { type: Number, default: 0 },
    unlisted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

ainsfwSubmissionSchema.index({ status: 1 });
ainsfwSubmissionSchema.index({ featured: 1 });
ainsfwSubmissionSchema.index({ boosted: 1, boostExpiresAt: 1 });

export const AINsfwSubmission = models.AINsfwSubmission || model('AINsfwSubmission', ainsfwSubmissionSchema);

// OnlygramPost — private creator profile posts (enzogonzo / vickykovaks)
const onlygramPostSchema = new Schema({
  slug: { type: String, required: true, index: true },
  postId: { type: String, required: true },
  type: { type: String, enum: ['photo', 'video'], default: 'photo' },
  thumbnail: { type: String, default: '' },
  videoUrl: { type: String, default: '' },
  media: [{ type: { type: String, enum: ['photo', 'video'] }, url: String, thumb: String }],
  caption: { type: String, default: '' },
  likes: { type: Number, default: 0 },
  comments: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
  locked: { type: Boolean, default: false },
  price: { type: Number, default: 0 },
  postedAt: { type: String, default: '' },
  postedAtIso: { type: String, default: '' },
  pinned: { type: Boolean, default: false },
  tagged: [{ username: String, name: String }],
  commentList: [{ user: String, text: String, ago: String }],
}, { timestamps: true });

onlygramPostSchema.index({ slug: 1, createdAt: -1 });

export const OnlygramPost = models.OnlygramPost || model('OnlygramPost', onlygramPostSchema);

// OnlygramCreator — profile data (avatar, cover, bio etc)
const onlygramCreatorSchema = new Schema({
  slug: { type: String, required: true, unique: true },
  name: String,
  username: String,
  avatar: String,
  cover: String,
  bio: String,
  verified: { type: Boolean, default: true },
  location: String,
  joinedDate: String,
  subscriptionPrice: Schema.Types.Mixed,
  totalFans: Number,
  totalLikes: Number,
  totalPosts: Number,
  totalMedia: Number,
}, { timestamps: true });

export const OnlygramCreator = models.OnlygramCreator || model('OnlygramCreator', onlygramCreatorSchema);

// Bot Stats — votes (per-bot aggregate, mirrors AINsfwToolStats)
const botStatsSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    upvotes: { type: Number, default: 0 },
    downvotes: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const BotStats = models.BotStats || model('BotStats', botStatsSchema);

// FeatureSuggestion — user-submitted feature ideas + upvotes
const featureSuggestionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true },
  title: { type: String, required: true, maxlength: 120 },
  description: { type: String, default: '', maxlength: 500 },
  status: { type: String, enum: ['new', 'reviewed', 'planned', 'done', 'rejected'], default: 'new' },
  upvotes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  upvoteCount: { type: Number, default: 0 },
}, { timestamps: true });

featureSuggestionSchema.index({ upvoteCount: -1, createdAt: -1 });

export const FeatureSuggestion = models.FeatureSuggestion || model('FeatureSuggestion', featureSuggestionSchema);