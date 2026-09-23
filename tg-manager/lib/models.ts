import mongoose, { Schema, model, models } from 'mongoose';

const ButtonSchema = new Schema({ text: String, url: String }, { _id: false });

// ── SaaS: Workspace ──────────────────────────────────────────
const WorkspaceSchema = new Schema({
  name: { type: String, required: true },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  plan: { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
  starsBalance: { type: Number, default: 0 },
  starsEarned: { type: Number, default: 0 },
}, { timestamps: true });

// ── Users ─────────────────────────────────────────────────────
const UserSchema = new Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['owner', 'admin', 'viewer'], default: 'viewer' },
  workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', default: null },
  lastLoginAt: { type: Date, default: null },
}, { timestamps: true });

// ── TgGroup ───────────────────────────────────────────────────
const TgGroupSchema = new Schema({
  name: { type: String, required: true },
  channelId: { type: String, required: true },
  mediaFolder: { type: String, default: '' },
  defaultTemplate: { type: Schema.Types.ObjectId, ref: 'TgTemplate', default: null },
  enabled: { type: Boolean, default: true },
  botToken: { type: String, default: '' },
  tag: { type: String, default: '' },
  /** Erogram category slug for creator posts, e.g. asian, milf, latina */
  creatorNiche: { type: String, default: '' },
  notes: { type: String, default: '' },
  workspaceId: { type: String, default: 'default' },
}, { timestamps: true });

// ── TgTemplate ────────────────────────────────────────────────
const TgTemplateSchema = new Schema({
  name: { type: String, required: true },
  text: { type: String, default: '' },
  buttons: { type: [[ButtonSchema]], default: [] },
  parseMode: { type: String, default: 'HTML' },
  mediaUrl: { type: String, default: '' },
  mediaType: { type: String, enum: ['', 'photo', 'video'], default: '' },
  mediaFolder: { type: String, default: '' },
  workspaceId: { type: String, default: 'default' },
}, { timestamps: true });

// ── TgPostLog ─────────────────────────────────────────────────
const TgPostLogSchema = new Schema({
  groupId: { type: Schema.Types.ObjectId, ref: 'TgGroup' },
  groupName: String,
  templateId: { type: Schema.Types.ObjectId, ref: 'TgTemplate' },
  mediaKey: String,
  mediaUrl: String,
  mediaFolder: { type: String, default: '' },
  ctaVariant: { type: String, default: '' },
  creatorUsername: { type: String, default: '' },
  postType: { type: String, default: '' },
  status: { type: String, enum: ['success', 'error'], default: 'success' },
  error: { type: String, default: '' },
  postedAt: { type: Date, default: Date.now },
  workspaceId: { type: String, default: 'default' },
});

TgPostLogSchema.index({ postedAt: -1 });
TgPostLogSchema.index({ groupId: 1, status: 1, postedAt: -1 });
TgPostLogSchema.index({ mediaFolder: 1, status: 1 });
TgPostLogSchema.index({ groupId: 1, mediaKey: 1 });

// ── TgSettings ────────────────────────────────────────────────
const TgSettingsSchema = new Schema({
  key: { type: String, unique: true },
  enabled: { type: Boolean, default: true },
  data: { type: Schema.Types.Mixed, default: {} },
  workspaceId: { type: String, default: 'default' },
});

// ── TgSchedule ────────────────────────────────────────────────
const TgScheduleSchema = new Schema({
  name: { type: String, required: true },
  postType: { type: String, enum: ['promo', 'media', 'creator'], default: 'promo' },
  templateId: { type: Schema.Types.ObjectId, ref: 'TgTemplate', default: null },
  groupIds: [{ type: Schema.Types.ObjectId, ref: 'TgGroup' }],
  time: { type: String, required: true },
  times: [{ type: String }],
  timezone: { type: String, default: 'America/Sao_Paulo' },
  frequency: { type: String, enum: ['daily', 'every_48h', 'every_72h', 'weekly', 'every_n_hours'], default: 'daily' },
  intervalHours: { type: Number, default: 4, min: 1, max: 24 },
  weekDay: { type: Number, default: 0, min: 0, max: 6 },
  enabled: { type: Boolean, default: true },
  lastFiredAt: { type: Date, default: null },
  workspaceId: { type: String, default: 'default' },
}, { timestamps: true });

// ── TgCreatorQueue — curated OF creators per niche (ordered) ──
const TgCreatorQueueItemSchema = new Schema({
  username: { type: String, required: true },
  name: { type: String, default: '' },
}, { _id: false });

const TgCreatorQueueSchema = new Schema({
  niche: { type: String, required: true, unique: true, lowercase: true, trim: true },
  items: { type: [TgCreatorQueueItemSchema], default: [] },
  cursor: { type: Number, default: 0, min: 0 },
  workspaceId: { type: String, default: 'default' },
}, { timestamps: true });

// ── TgStat ────────────────────────────────────────────────────
const TgStatSchema = new Schema({
  groupId: { type: Schema.Types.ObjectId, ref: 'TgGroup', required: true },
  groupName: { type: String, required: true },
  channelId: { type: String, required: true },
  memberCount: { type: Number, required: true },
  isAdminOk: { type: Boolean, default: null },
  snapshotDate: { type: Date, required: true },
  workspaceId: { type: String, default: 'default' },
});

TgStatSchema.index({ groupId: 1, snapshotDate: -1 });
TgStatSchema.index({ snapshotDate: -1 });

// ── TgMediaOrder ─────────────────────────────────────────────
const TgMediaOrderSchema = new Schema({
  folder: { type: String, required: true, unique: true },
  keys: [{ type: String }],
  workspaceId: { type: String, default: 'default' },
}, { timestamps: true });

// ── TgNicheLink ──────────────────────────────────────────────
const TgNicheLinkSchema = new Schema({
  folder: { type: String, required: true },
  url: { type: String, required: true },
  label: { type: String, default: '' },
  workspaceId: { type: String, default: 'default' },
}, { timestamps: true });

TgNicheLinkSchema.index({ folder: 1 });

export const Workspace = models.Workspace || model('Workspace', WorkspaceSchema);
export const User = models.User || model('User', UserSchema);
export const TgMediaOrder = models.TgMediaOrder || model('TgMediaOrder', TgMediaOrderSchema);
export const TgNicheLink = models.TgNicheLink || model('TgNicheLink', TgNicheLinkSchema);
export const TgGroup = models.TgGroup || model('TgGroup', TgGroupSchema);
export const TgTemplate = models.TgTemplate || model('TgTemplate', TgTemplateSchema);
export const TgPostLog = models.TgPostLog || model('TgPostLog', TgPostLogSchema);
export const TgSettings = models.TgSettings || model('TgSettings', TgSettingsSchema);
export const TgSchedule = models.TgSchedule || model('TgSchedule', TgScheduleSchema);
export const TgCreatorQueue = models.TgCreatorQueue || model('TgCreatorQueue', TgCreatorQueueSchema);
export const TgStat = models.TgStat || model('TgStat', TgStatSchema);
