import {
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
  jsonb,
  boolean,
  integer,
  index,
  uniqueIndex,
  check,
  primaryKey,
  numeric,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const pingTable = pgTable('ping', {
  id: serial('id').primaryKey(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const users = pgTable(
  'users',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    username: text('username').unique().notNull(),
    displayName: text('display_name'),
    status: text('status').notNull().default('active'),
    moderationStatus: text('moderation_status').notNull().default('none'),
    roles: jsonb('roles').notNull().default('["user"]'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => {
    return {
      usernameIdx: uniqueIndex('users_username_idx').on(table.username),
      statusCreatedAtIdx: index('users_status_created_at_idx').on(table.status, table.createdAt),
      modStatusPartialIdx: index('users_mod_status_idx')
        .on(table.moderationStatus)
        .where(sql`${table.moderationStatus} != 'none'`),
    };
  }
);

export const userProfiles = pgTable('user_profiles', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  bio: text('bio'),
  avatarUrl: text('avatar_url'),
  websiteUrl: text('website_url'),
  location: text('location'),
  metadata: jsonb('metadata').notNull().default('{}'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const externalIdentities = pgTable(
  'external_identities',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    providerId: text('provider_id').notNull(),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => {
    return {
      userIdIdx: index('ext_identities_user_id_idx').on(table.userId),
      providerIdIdx: uniqueIndex('ext_identities_provider_idx').on(table.provider, table.providerId),
    };
  }
);

export const walletAddresses = pgTable(
  'wallet_addresses',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    address: text('address').unique().notNull(),
    chainId: integer('chain_id').notNull(),
    isPrimary: boolean('is_primary').notNull().default(false),
    verifiedAt: timestamp('verified_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => {
    return {
      userIdIdx: index('wallet_addr_user_id_idx').on(table.userId),
      addressIdx: index('wallet_addr_address_idx').on(table.address),
    };
  }
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    refreshTokenHash: text('refresh_token_hash').unique().notNull(),
    deviceInfo: text('device_info'),
    ip: text('ip'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => {
    return {
      userRevokedIdx: index('sessions_user_revoked_idx').on(table.userId, table.revokedAt),
    };
  }
);

export const userRoles = pgTable('user_roles', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  grantedBy: uuid('granted_by').references(() => users.id),
  grantedAt: timestamp('granted_at', { withTimezone: true }).defaultNow().notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
});

export const outboxEvents = pgTable(
  'outbox_events',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    type: text('type').notNull(),
    version: text('version').notNull().default('1'),
    payload: jsonb('payload').notNull(),
    actorId: uuid('actor_id'),
    traceId: text('trace_id'),
    status: text('status').notNull().default('pending'),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
    deliverAt: timestamp('deliver_at', { withTimezone: true }).defaultNow().notNull(),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => {
    return {
      statusDeliverPartialIdx: index('outbox_status_deliver_idx')
        .on(table.status, table.deliverAt)
        .where(sql`${table.status} = 'pending'`),
    };
  }
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    actorId: uuid('actor_id'),
    action: text('action').notNull(),
    resourceType: text('resource_type').notNull(),
    resourceId: text('resource_id').notNull(),
    changes: jsonb('changes'),
    ip: text('ip'),
    userAgent: text('user_agent'),
    traceId: text('trace_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => {
    return {
      actorCreatedIdx: index('audit_actor_created_idx').on(table.actorId, table.createdAt),
      resourceTypeIdx: index('audit_resource_type_idx').on(table.resourceType, table.resourceId),
    };
  }
);

export const follows = pgTable(
  'follows',
  {
    followerId: uuid('follower_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    followingId: uuid('following_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => {
    return {
      followerPk: uniqueIndex('follows_pk').on(table.followerId, table.followingId),
      followerIdx: index('follows_follower_idx').on(table.followerId, table.deletedAt),
      followingIdx: index('follows_following_idx').on(table.followingId, table.deletedAt),
    };
  }
);

export const blocks = pgTable(
  'blocks',
  {
    blockerId: uuid('blocker_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    blockedId: uuid('blocked_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => {
    return {
      blockerPk: uniqueIndex('blocks_pk').on(table.blockerId, table.blockedId),
    };
  }
);

export const mutes = pgTable(
  'mutes',
  {
    muterId: uuid('muter_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    mutedId: uuid('muted_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => {
    return {
      muterPk: uniqueIndex('mutes_pk').on(table.muterId, table.mutedId),
    };
  }
);

export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  authorId: uuid('author_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  parentId: uuid('parent_id').references((): any => posts.id),
  rootId: uuid('root_id').references((): any => posts.id),
  postType: text('post_type').notNull(),
  quotedPostId: uuid('quoted_post_id').references((): any => posts.id),
  moderationStatus: text('moderation_status').notNull().default('visible'),
  visibility: text('visibility').notNull().default('public'),
  likeCount: integer('like_count').notNull().default(0),
  replyCount: integer('reply_count').notNull().default(0),
  repostCount: integer('repost_count').notNull().default(0),
  bookmarkCount: integer('bookmark_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true })
}, (table) => {
  return {
    contentLenCheck: check("posts_content_max", sql`char_length(${table.content}) <= 500`),
    authorCreatedIdx: index('posts_author_created_idx').on(table.authorId, table.createdAt).where(sql`${table.deletedAt} IS NULL`),
    parentIdx: index('posts_parent_idx').on(table.parentId).where(sql`${table.parentId} IS NOT NULL`),
    rootIdx: index('posts_root_idx').on(table.rootId).where(sql`${table.rootId} IS NOT NULL`),
    modStatusIdx: index('posts_mod_status_idx').on(table.moderationStatus).where(sql`${table.moderationStatus} != 'visible'`)
  };
});

export const postEdits = pgTable('post_edits', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  postId: uuid('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  editedAt: timestamp('edited_at', { withTimezone: true }).defaultNow().notNull(),
  editorId: uuid('editor_id').notNull().references(() => users.id)
});

export const postLikes = pgTable('post_likes', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  postId: uuid('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => {
  return {
    userPostUnique: uniqueIndex('post_likes_user_post_unique').on(table.userId, table.postId),
    postIdx: index('post_likes_post_idx').on(table.postId),
    userIdx: index('post_likes_user_idx').on(table.userId)
  };
});

export const postBookmarks = pgTable('post_bookmarks', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  postId: uuid('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.userId, table.postId] })
  };
});

export const postReposts = pgTable('post_reposts', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  postId: uuid('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => {
  return {
    userPostUnique: uniqueIndex('post_reposts_user_post_unique').on(table.userId, table.postId)
  };
});

export const mediaAttachments = pgTable('media_attachments', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  postId: uuid('post_id').references(() => posts.id, { onDelete: 'cascade' }),
  uploaderId: uuid('uploader_id').notNull().references(() => users.id),
  url: text('url').notNull(),
  storageKey: text('storage_key').notNull(),
  mediaType: text('media_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  width: integer('width'),
  height: integer('height'),
  durationMs: integer('duration_ms'),
  altText: text('alt_text'),
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  recipientId: uuid('recipient_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
  type: text('type').notNull(),
  resourceType: text('resource_type').notNull(),
  resourceId: text('resource_id').notNull(),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => {
  return {
    recipientUnreadIdx: index('notifs_recipient_unread_idx').on(table.recipientId, table.readAt, table.createdAt),
    recipientCreatedIdx: index('notifs_recipient_created_idx').on(table.recipientId, table.createdAt)
  };
});

export const notificationPreferences = pgTable('notification_preferences', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  notifyOnFollow: boolean('notify_on_follow').notNull().default(true),
  notifyOnLike: boolean('notify_on_like').notNull().default(true),
  notifyOnReply: boolean('notify_on_reply').notNull().default(true),
  notifyOnRepost: boolean('notify_on_repost').notNull().default(true),
  notifyOnMention: boolean('notify_on_mention').notNull().default(true),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const developers = pgTable('developers', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').unique().notNull().references(() => users.id, { onDelete: 'cascade' }),
  displayName: text('display_name').notNull(),
  websiteUrl: text('website_url'),
  bio: text('bio'),
  status: text('status').notNull().default('active'),
  verified: boolean('verified').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const apps = pgTable('apps', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  developerId: uuid('developer_id').notNull().references(() => developers.id),
  slug: text('slug').unique().notNull(),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category').notNull(),
  iconUrl: text('icon_url'),
  status: text('status').notNull().default('draft'),
  currentVersionId: uuid('current_version_id'), 
  installCount: integer('install_count').notNull().default(0),
  ratingAvg: numeric('rating_avg', { precision: 3, scale: 2 }),
  rejectedReason: text('rejected_reason'),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => {
  return {
    devIdx: index('apps_dev_idx').on(table.developerId),
    statusIdx: index('apps_status_idx').on(table.status),
    catStatusIdx: index('apps_cat_status_idx').on(table.category, table.status)
  };
});

export const appVersions = pgTable('app_versions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  appId: uuid('app_id').notNull().references(() => apps.id, { onDelete: 'cascade' }),
  version: text('version').notNull(),
  manifest: jsonb('manifest').notNull(),
  entryUrl: text('entry_url').notNull(),
  changelog: text('changelog'),
  status: text('status').notNull().default('pending'),
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => {
  return {
    appVersionUnique: uniqueIndex('app_versions_unique').on(table.appId, table.version)
  };
});

export const permissionScopes = pgTable('permission_scopes', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').unique().notNull(),
  description: text('description').notNull(),
  sensitivity: text('sensitivity').notNull(),
  requiresApproval: boolean('requires_approval').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const appPermissionGrants = pgTable('app_permission_grants', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  appId: uuid('app_id').notNull().references(() => apps.id, { onDelete: 'cascade' }),
  scopeId: uuid('scope_id').notNull().references(() => permissionScopes.id),
  grantedAt: timestamp('granted_at', { withTimezone: true }).defaultNow().notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true })
}, (table) => {
  return {
    userAppIdx: index('app_grants_user_app_idx').on(table.userId, table.appId),
    userAppScopeIdx: index('app_grants_user_app_scope_idx').on(table.userId, table.appId, table.scopeId)
  };
});

export const appInstalls = pgTable('app_installs', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  appId: uuid('app_id').notNull().references(() => apps.id, { onDelete: 'cascade' }),
  installedAt: timestamp('installed_at', { withTimezone: true }).defaultNow().notNull(),
  uninstalledAt: timestamp('uninstalled_at', { withTimezone: true })
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.userId, table.appId] }),
    userUninstIdx: index('app_installs_user_uninst_idx').on(table.userId, table.uninstalledAt),
    appUninstIdx: index('app_installs_app_uninst_idx').on(table.appId, table.uninstalledAt)
  };
});

export const appStorage = pgTable('app_storage', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  appId: uuid('app_id').notNull().references(() => apps.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  key: text('key').notNull(),
  value: jsonb('value').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => {
  return {
    appUserKeyUnique: uniqueIndex('app_storage_app_user_key_unique').on(table.appId, table.userId, table.key),
    appUserIdx: index('app_storage_app_user_idx').on(table.appId, table.userId)
  };
});

export const appTokens = pgTable('app_tokens', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  appId: uuid('app_id').notNull().references(() => apps.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').unique().notNull(),
  name: text('name'),
  scopes: jsonb('scopes').notNull(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => {
  return {
    appUserIdx: index('app_tokens_app_user_idx').on(table.appId, table.userId)
  };
});

export const webhookSubscriptions = pgTable('webhook_subscriptions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  appId: uuid('app_id').notNull().references(() => apps.id, { onDelete: 'cascade' }),
  eventType: text('event_type').notNull(),
  webhookUrl: text('webhook_url').notNull(),
  secret: text('secret').notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => {
  return {
    appEventUnique: uniqueIndex('webhook_sub_app_evt_unique').on(table.appId, table.eventType)
  };
});

export const webhookDeliveries = pgTable('webhook_deliveries', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  subscriptionId: uuid('subscription_id').notNull().references(() => webhookSubscriptions.id),
  eventId: uuid('event_id').notNull(),
  payload: jsonb('payload').notNull(),
  status: text('status').notNull().default('pending'),
  attempts: integer('attempts').notNull().default(0),
  lastHttpStatus: integer('last_http_status'),
  lastError: text('last_error'),
  nextRetryAt: timestamp('next_retry_at', { withTimezone: true }),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => {
  return {
    statusRetryIdx: index('webhook_del_status_retry_idx')
      .on(table.status, table.nextRetryAt)
      .where(sql`${table.status} IN ('pending','failed')`)
  };
});


export const reports = pgTable('reports', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  reporterId: uuid('reporter_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  reason: text('reason').notNull(),
  details: text('details'),
  status: text('status').notNull().default('pending'),
  resolvedBy: uuid('resolved_by').references(() => users.id),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  resolutionNote: text('resolution_note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => {
  return {
    statusIdx: index('reports_status_time_idx').on(table.status, table.createdAt),
    targetIdx: index('reports_target_idx').on(table.targetType, table.targetId)
  };
});

export const moderationActions = pgTable('moderation_actions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  adminId: uuid('admin_id').notNull().references(() => users.id),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  action: text('action').notNull(),
  reason: text('reason').notNull(),
  note: text('note'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  reportId: uuid('report_id').references(() => reports.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => {
  return {
    targetIdx: index('mod_actions_target_time_idx').on(table.targetType, table.targetId, table.createdAt),
    adminIdx: index('mod_actions_admin_time_idx').on(table.adminId, table.createdAt)
  };
});

export const moderationAppeals = pgTable('moderation_appeals', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  actionId: uuid('action_id').notNull().references(() => moderationActions.id),
  reason: text('reason').notNull(),
  status: text('status').notNull().default('pending'),
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  responseNote: text('response_note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => {
  return {
    userActionUnique: uniqueIndex('mod_appeals_user_action_unique').on(table.userId, table.actionId)
  };
});

export const analyticsEvents = pgTable('analytics_events', {
  id: uuid('id').default(sql`gen_random_uuid()`),
  eventType: text('event_type').notNull(),
  userId: uuid('user_id'),
  resourceType: text('resource_type'),
  resourceId: text('resource_id'),
  appId: uuid('app_id').references(() => apps.id),
  sessionId: text('session_id'),
  properties: jsonb('properties').notNull().default('{}'),
  ipHash: text('ip_hash'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => {
  return {
    eventCreatedIdx: index('analytics_event_created_idx').on(table.eventType, table.createdAt),
    userCreatedIdx: index('analytics_user_created_idx').on(table.userId, table.createdAt),
    pk: primaryKey({ columns: [table.id, table.createdAt] })
  };
});

export const trendingScores = pgTable('trending_scores', {
  resourceType: text('resource_type').notNull(),
  resourceId: text('resource_id').notNull(),
  score: numeric('score', { precision: 15, scale: 4 }).notNull().default('0'),
  likeCount24h: integer('like_count_24h').notNull().default(0),
  repostCount24h: integer('repost_count_24h').notNull().default(0),
  replyCount24h: integer('reply_count_24h').notNull().default(0),
  viewCount24h: integer('view_count_24h').notNull().default(0),
  computedAt: timestamp('computed_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.resourceType, table.resourceId] })
  };
});

export const appAnalyticsRollups = pgTable('app_analytics_rollups', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  appId: uuid('app_id').notNull().references(() => apps.id, { onDelete: 'cascade' }),
  period: text('period').notNull(),
  periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
  installs: integer('installs').notNull().default(0),
  uninstalls: integer('uninstalls').notNull().default(0),
  activeUsers: integer('active_users').notNull().default(0),
  apiCalls: integer('api_calls').notNull().default(0),
  webhookDeliveries: integer('webhook_deliveries').notNull().default(0),
  webhookFailures: integer('webhook_failures').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => {
  return {
    appPeriodUnique: uniqueIndex('app_analytics_unique').on(table.appId, table.period, table.periodStart)
  };
});

export const featureFlags = pgTable('feature_flags', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').unique().notNull(),
  description: text('description'),
  enabled: boolean('enabled').notNull().default(false),
  enabledForRoles: jsonb('enabled_for_roles').default('[]'),
  enabledPercentage: integer('enabled_percentage').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});
