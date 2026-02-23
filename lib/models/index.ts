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
    category: { type: String, required: true },
    country: { type: String, required: true },
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
    image: {
      type: String,
      required: [true, 'Group image is required'],
      default: '/assets/placeholder-no-image.png',
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdByUsername: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
    pinned: { type: Boolean, default: false },
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
    showVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

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
    image: { type: String, required: true, default: '/assets/placeholder-no-image.png' },
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
    category: { type: String, required: true },
    country: { type: String, required: true },
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
    image: {
      type: String,
      required: [true, 'Bot image is required'],
      default: '/assets/placeholder-no-image.png',
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdByUsername: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
    pinned: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
    isAdvertisement: { type: Boolean, default: false },
    advertisementUrl: { type: String },
    clickCount: { type: Number, default: 0 },
    lastClickedAt: { type: Date },
    memberCount: { type: Number, default: 0 },
    memberCountUpdatedAt: { type: Date },
    showVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

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
    slot: {
      type: String,
      enum: ['top-banner', 'homepage-hero', 'feed', 'navbar-cta', 'join-cta', 'filter-cta'],
      required: true,
    },
    creative: { type: String, required: false, default: '' },
    destinationUrl: {
      type: String,
      required: true,
      validate: {
        validator: function (v: string) {
          return /^https?:\/\//.test(v);
        },
        message: 'URL must start with http:// or https://',
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
    tierSlot: { type: Number, default: null }, // 1-4 within tier
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
    // Show verified checkmark next to campaign name (feed ads)
    showVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

campaignSchema.index({ slot: 1, status: 1, isVisible: 1, startDate: 1, endDate: 1 });
campaignSchema.index(
  { slot: 1, feedTier: 1, tierSlot: 1 },
  { unique: true, partialFilterExpression: { slot: 'feed', feedTier: { $gte: 1 }, tierSlot: { $gte: 1 } } }
);

// CampaignClick Schema (for per-day click stats; Campaign.clicks is the all-time total)
export const campaignClickSchema = new Schema(
  {
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true },
    clickedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);
campaignClickSchema.index({ clickedAt: 1 });

// Export models
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