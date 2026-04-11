const fs = require('fs');

const p4 = `
export const reports = pgTable('reports', {
  id: uuid('id').primaryKey().default(sql\`gen_random_uuid()\`),
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
  id: uuid('id').primaryKey().default(sql\`gen_random_uuid()\`),
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
  id: uuid('id').primaryKey().default(sql\`gen_random_uuid()\`),
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
  id: uuid('id').default(sql\`gen_random_uuid()\`),
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
  id: uuid('id').primaryKey().default(sql\`gen_random_uuid()\`),
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
  id: uuid('id').primaryKey().default(sql\`gen_random_uuid()\`),
  name: text('name').unique().notNull(),
  description: text('description'),
  enabled: boolean('enabled').notNull().default(false),
  enabledForRoles: jsonb('enabled_for_roles').default('[]'),
  enabledPercentage: integer('enabled_percentage').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});
`;

let schema = fs.readFileSync('packages/db/src/schema.ts', 'utf8');
if (!schema.includes('reports')) {
  fs.writeFileSync('packages/db/src/schema.ts', schema + '\n' + p4);
}
console.log('Appended tables effectively');
