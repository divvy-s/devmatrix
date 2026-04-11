const fs = require('fs');

let schema = fs.readFileSync('packages/db/src/schema.ts', 'utf8');

// 1. Append imports: add numeric
schema = schema.replace(
  /integer,\n\s*index,\n\s*uniqueIndex,\n\s*check,\n\s*primaryKey,/g,
  'integer,\n  index,\n  uniqueIndex,\n  check,\n  primaryKey,\n  numeric,',
);

// 2. Append Phase 3 tables
const phase3 = `
export const developers = pgTable('developers', {
  id: uuid('id').primaryKey().default(sql\`gen_random_uuid()\`),
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
  id: uuid('id').primaryKey().default(sql\`gen_random_uuid()\`),
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
  id: uuid('id').primaryKey().default(sql\`gen_random_uuid()\`),
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
  id: uuid('id').primaryKey().default(sql\`gen_random_uuid()\`),
  name: text('name').unique().notNull(),
  description: text('description').notNull(),
  sensitivity: text('sensitivity').notNull(),
  requiresApproval: boolean('requires_approval').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const appPermissionGrants = pgTable('app_permission_grants', {
  id: uuid('id').primaryKey().default(sql\`gen_random_uuid()\`),
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
  id: uuid('id').primaryKey().default(sql\`gen_random_uuid()\`),
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
  id: uuid('id').primaryKey().default(sql\`gen_random_uuid()\`),
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
  id: uuid('id').primaryKey().default(sql\`gen_random_uuid()\`),
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
  id: uuid('id').primaryKey().default(sql\`gen_random_uuid()\`),
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
      .where(sql\`\${table.status} IN ('pending','failed')\`)
  };
});
`;

if (!schema.includes('webhook_subscriptions')) {
  fs.writeFileSync('packages/db/src/schema.ts', schema + '\\n' + phase3);
  console.log('Appended Phase 3 schema');
} else {
  console.log('Schema already embedded');
}
