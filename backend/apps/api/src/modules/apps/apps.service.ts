import {
  db,
  apps,
  appVersions,
  developers,
  permissionScopes,
  appInstalls,
  appPermissionGrants,
} from '@workspace/db';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import {
  NotFoundError,
  BusinessError,
  ForbiddenError,
} from '@workspace/errors';

export class AppsService {
  async createApp(
    userId: string,
    data: {
      slug: string;
      name: string;
      description?: string;
      category: string;
      iconUrl?: string;
      repoUrl?: string;
    },
  ) {
    const devArr = await db
      .select()
      .from(developers)
      .where(eq(developers.userId, userId))
      .limit(1);
    if (!devArr[0])
      throw new BusinessError(
        'Not registered as developer',
        'DEVELOPER_NOT_FOUND',
      );
    const dev = devArr[0];

    const reserved = ['api', 'admin', 'system', 'platform', 'help'];
    if (reserved.includes(data.slug.toLowerCase())) {
      throw new BusinessError('Slug reserved', 'SLUG_RESERVED');
    }
    if (!/^[a-z0-9-]{3,50}$/.test(data.slug)) {
      throw new BusinessError('Invalid slug format', 'INVALID_SLUG');
    }

    const appArr = await db
      .insert(apps)
      .values({
        developerId: dev.id,
        slug: data.slug.toLowerCase(),
        name: data.name,
        description: data.description,
        category: data.category,
        iconUrl: data.iconUrl,
        repoUrl: data.repoUrl,
        status: 'draft',
      })
      .returning();

    return appArr[0];
  }

  async createVersion(
    userId: string,
    slug: string,
    data: {
      version: string;
      manifest: any;
      entryUrl: string;
      changelog?: string;
    },
  ) {
    return await db.transaction(async (tx) => {
      const appArr = await tx
        .select()
        .from(apps)
        .innerJoin(developers, eq(apps.developerId, developers.id))
        .where(eq(apps.slug, slug))
        .limit(1);
      if (!appArr[0]) throw new NotFoundError('App', slug);
      const app = appArr[0].apps;
      const dev = appArr[0].developers;
      if (dev.userId !== userId) throw new ForbiddenError('Not your app');

      const requested = data.manifest.permissions || [];
      if (requested.length > 0) {
        const scopes = await tx
          .select()
          .from(permissionScopes)
          .where(inArray(permissionScopes.name, requested));
        if (scopes.length !== requested.length)
          throw new BusinessError('Invalid scopes requested', 'INVALID_SCOPES');
      }

      const allowedEvents = [
        'post.created',
        'post.deleted',
        'post.liked',
        'user.followed',
        'user.unfollowed',
        'comment.created',
      ];
      const requestedEvts = data.manifest.events || [];
      if (!requestedEvts.every((e: string) => allowedEvents.includes(e))) {
        throw new BusinessError('Invalid events requested', 'INVALID_EVENTS');
      }

      if (!data.entryUrl.startsWith('https://'))
        throw new BusinessError('HTTPS required for entryUrl', 'INSECURE_URL');
      if (
        data.manifest.webhookUrl &&
        !data.manifest.webhookUrl.startsWith('https://')
      )
        throw new BusinessError(
          'HTTPS required for webhookUrl',
          'INSECURE_URL',
        );

      const verArr = await tx
        .insert(appVersions)
        .values({
          appId: app.id,
          version: data.version,
          manifest: data.manifest,
          entryUrl: data.entryUrl,
          changelog: data.changelog,
          status: 'pending',
        })
        .returning();

      await tx
        .update(apps)
        .set({ status: 'pending', updatedAt: new Date() })
        .where(eq(apps.id, app.id));

      return verArr[0];
    });
  }

  async listApprovedApps(cursor?: string, category?: string, search?: string) {
    const q = db
      .select()
      .from(apps)
      .where(
        and(
          eq(apps.status, 'approved'),
          category ? eq(apps.category, category) : undefined,
        ),
      )
      .orderBy(desc(apps.installCount), desc(apps.createdAt))
      .limit(20);

    const dataRows = await q;
    return { data: dataRows, nextCursor: null, hasMore: false }; // Simplified cursor logic for standard requests
  }

  async getAppBySlug(slug: string, userId?: string) {
    const appArr = await db
      .select()
      .from(apps)
      .innerJoin(developers, eq(apps.developerId, developers.id))
      .where(eq(apps.slug, slug))
      .limit(1);

    if (!appArr[0]) throw new NotFoundError('App', slug);
    const result: any = {
      app: appArr[0].apps,
      developer: appArr[0].developers,
    };

    if (appArr[0].apps.currentVersionId) {
      const ver = await db
        .select()
        .from(appVersions)
        .where(eq(appVersions.id, appArr[0].apps.currentVersionId))
        .limit(1);
      if (ver[0]) result.currentVersion = ver[0];
    }

    if (userId) {
      const inst = await db
        .select()
        .from(appInstalls)
        .where(
          and(
            eq(appInstalls.appId, appArr[0].apps.id),
            eq(appInstalls.userId, userId),
          ),
        )
        .limit(1);
      result.installed = inst.length > 0 && !inst[0]!.uninstalledAt;

      const grants = await db
        .select({ scopeName: permissionScopes.name })
        .from(appPermissionGrants)
        .innerJoin(
          permissionScopes,
          eq(appPermissionGrants.scopeId, permissionScopes.id),
        )
        .where(
          and(
            eq(appPermissionGrants.appId, appArr[0].apps.id),
            eq(appPermissionGrants.userId, userId),
          ),
        );

      result.grantedScopes = grants.map((g) => g.scopeName);
    }

    return result;
  }

  async getDeveloperApps(userId: string) {
    const devArr = await db
      .select()
      .from(developers)
      .where(eq(developers.userId, userId))
      .limit(1);
    if (!devArr[0])
      throw new BusinessError(
        'Not registered as developer',
        'DEVELOPER_NOT_FOUND',
      );
    return await db
      .select()
      .from(apps)
      .where(eq(apps.developerId, devArr[0].id));
  }

  async rollbackVersion(userId: string, slug: string, versionId: string) {
    return await db.transaction(async (tx) => {
      const appArr = await tx
        .select()
        .from(apps)
        .innerJoin(developers, eq(apps.developerId, developers.id))
        .where(eq(apps.slug, slug))
        .limit(1);
      if (!appArr[0] || appArr[0].developers.userId !== userId)
        throw new ForbiddenError('Not your app');

      const verArr = await tx
        .select()
        .from(appVersions)
        .where(eq(appVersions.id, versionId))
        .limit(1);
      if (
        !verArr[0] ||
        verArr[0].status !== 'approved' ||
        verArr[0].appId !== appArr[0].apps.id
      ) {
        throw new BusinessError(
          'Cannot rollback to unapproved version',
          'INVALID_VERSION',
        );
      }

      const updated = await tx
        .update(apps)
        .set({ currentVersionId: versionId, updatedAt: new Date() })
        .where(eq(apps.id, appArr[0].apps.id))
        .returning();
      return updated[0];
    });
  }
}
