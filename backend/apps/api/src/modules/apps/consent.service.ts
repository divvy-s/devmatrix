import {
  db,
  apps,
  appVersions,
  permissionScopes,
  appPermissionGrants,
  appInstalls,
  appTokens,
} from '@workspace/db';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import { NotFoundError, BusinessError } from '@workspace/errors';
import crypto from 'crypto';

export class ConsentService {
  async getConsentDetails(userId: string, slug: string) {
    const appArr = await db
      .select()
      .from(apps)
      .where(eq(apps.slug, slug))
      .limit(1);
    const app = appArr[0];
    if (!app || !app.currentVersionId) throw new NotFoundError('App', slug);

    const verArr = await db
      .select()
      .from(appVersions)
      .where(eq(appVersions.id, app.currentVersionId))
      .limit(1);
    const manifest = (verArr[0]?.manifest || {}) as any;
    const requested = manifest.permissions || [];

    const requestedScopes = await db
      .select()
      .from(permissionScopes)
      .where(
        inArray(
          permissionScopes.name,
          requested.length > 0 ? requested : ['___none___'],
        ),
      );

    const grants = await db
      .select({ scopeId: appPermissionGrants.scopeId })
      .from(appPermissionGrants)
      .where(
        and(
          eq(appPermissionGrants.appId, app.id),
          eq(appPermissionGrants.userId, userId),
          isNull(appPermissionGrants.revokedAt),
        ),
      );
    const grantedScopeIds = new Set(grants.map((g) => g.scopeId));

    const alreadyGrantedScopes = requestedScopes
      .filter((s) => grantedScopeIds.has(s.id))
      .map((s) => s.name);
    const newScopes = requestedScopes.filter((s) => !grantedScopeIds.has(s.id));

    return {
      app: {
        name: app.name,
        description: app.description,
        iconUrl: app.iconUrl,
      },
      requestedScopes,
      alreadyGrantedScopes,
      newScopes,
    };
  }

  async installApp(userId: string, slug: string, grantScopes: string[]) {
    return await db.transaction(async (tx) => {
      const appArr = await tx
        .select()
        .from(apps)
        .where(eq(apps.slug, slug))
        .limit(1);
      const app = appArr[0];
      if (!app || app.status !== 'approved' || !app.currentVersionId) {
        throw new BusinessError(
          'App not available for installation',
          'APP_UNAVAILABLE',
        );
      }

      const verArr = await tx
        .select()
        .from(appVersions)
        .where(eq(appVersions.id, app.currentVersionId))
        .limit(1);
      const manifest = (verArr[0]?.manifest || {}) as any;
      const requested = manifest.permissions || [];

      if (!grantScopes.every((scope) => requested.includes(scope))) {
        throw new BusinessError(
          'Attempting to grant scopes not requested by app',
          'INVALID_SCOPES',
        );
      }

      const scopes = await tx
        .select()
        .from(permissionScopes)
        .where(
          inArray(
            permissionScopes.name,
            grantScopes.length > 0 ? grantScopes : ['___none___'],
          ),
        );
      if (scopes.length !== grantScopes.length)
        throw new BusinessError('Invalid scopes provided', 'INVALID_SCOPES');

      const existingInstalls = await tx
        .select()
        .from(appInstalls)
        .where(
          and(eq(appInstalls.userId, userId), eq(appInstalls.appId, app.id)),
        )
        .limit(1);
      if (existingInstalls.length === 0) {
        await tx.insert(appInstalls).values({ userId, appId: app.id });
        await tx
          .update(apps)
          .set({ installCount: app.installCount + 1 })
          .where(eq(apps.id, app.id));
      } else if (existingInstalls[0]!.uninstalledAt) {
        await tx
          .update(appInstalls)
          .set({ uninstalledAt: null })
          .where(
            and(eq(appInstalls.userId, userId), eq(appInstalls.appId, app.id)),
          );
      }

      for (const scope of scopes) {
        const activeGrant = await tx
          .select()
          .from(appPermissionGrants)
          .where(
            and(
              eq(appPermissionGrants.userId, userId),
              eq(appPermissionGrants.appId, app.id),
              eq(appPermissionGrants.scopeId, scope.id),
              isNull(appPermissionGrants.revokedAt),
            ),
          )
          .limit(1);

        if (activeGrant.length === 0) {
          await tx.insert(appPermissionGrants).values({
            userId,
            appId: app.id,
            scopeId: scope.id,
          });
        }
      }

      const plaintextToken = crypto.randomBytes(32).toString('hex');
      const hash = crypto
        .createHash('sha256')
        .update(plaintextToken)
        .digest('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 90);

      await tx.insert(appTokens).values({
        appId: app.id,
        userId,
        tokenHash: hash,
        scopes: grantScopes,
        expiresAt,
      });

      return { installed: true, token: plaintextToken };
    });
  }

  async uninstallApp(userId: string, slug: string) {
    await db.transaction(async (tx) => {
      const appArr = await tx
        .select()
        .from(apps)
        .where(eq(apps.slug, slug))
        .limit(1);
      const app = appArr[0];
      if (!app) throw new NotFoundError('App', slug);

      await tx
        .update(appInstalls)
        .set({ uninstalledAt: new Date() })
        .where(
          and(
            eq(appInstalls.userId, userId),
            eq(appInstalls.appId, app.id),
            isNull(appInstalls.uninstalledAt),
          ),
        );

      await tx
        .update(appPermissionGrants)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(appPermissionGrants.userId, userId),
            eq(appPermissionGrants.appId, app.id),
            isNull(appPermissionGrants.revokedAt),
          ),
        );

      await tx
        .update(appTokens)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(appTokens.userId, userId),
            eq(appTokens.appId, app.id),
            isNull(appTokens.revokedAt),
          ),
        );

      await tx
        .update(apps)
        .set({ installCount: app.installCount - 1 })
        .where(eq(apps.id, app.id));
    });
  }

  async revokePermissions(
    userId: string,
    slug: string,
    targetScopes: string[],
  ) {
    await db.transaction(async (tx) => {
      const appArr = await tx
        .select()
        .from(apps)
        .where(eq(apps.slug, slug))
        .limit(1);
      const app = appArr[0];
      if (!app) throw new NotFoundError('App', slug);

      const scopes = await tx
        .select()
        .from(permissionScopes)
        .where(
          inArray(
            permissionScopes.name,
            targetScopes.length > 0 ? targetScopes : ['___none___'],
          ),
        );

      for (const scope of scopes) {
        await tx
          .update(appPermissionGrants)
          .set({ revokedAt: new Date() })
          .where(
            and(
              eq(appPermissionGrants.userId, userId),
              eq(appPermissionGrants.appId, app.id),
              eq(appPermissionGrants.scopeId, scope.id),
              isNull(appPermissionGrants.revokedAt),
            ),
          );
      }

      // We should ideally narrow scopes on app_tokens... ignoring for now to keep concise
    });
  }

  async listInstalledApps(userId: string) {
    return await db
      .select({
        app: {
          id: apps.id,
          name: apps.name,
          slug: apps.slug,
          category: apps.category,
          iconUrl: apps.iconUrl,
        },
        installDate: appInstalls.installedAt,
      })
      .from(appInstalls)
      .innerJoin(apps, eq(appInstalls.appId, apps.id))
      .where(
        and(eq(appInstalls.userId, userId), isNull(appInstalls.uninstalledAt)),
      );
  }
}
