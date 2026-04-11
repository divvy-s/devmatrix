import { db, featureFlags } from '@workspace/db';
import { eq } from 'drizzle-orm';
import { redisConnection } from '@workspace/queue';
import crypto from 'crypto';

export async function isFeatureEnabled(
  name: string,
  user?: { userId: string; roles: string[] },
): Promise<boolean> {
  const cacheKey = `fflag:\${name}`;
  const cached = await redisConnection.get(cacheKey);
  let flag: any = null;

  if (cached) {
    flag = JSON.parse(cached);
  } else {
    const fArr = await db
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.name, name))
      .limit(1);
    if (fArr[0]) {
      flag = fArr[0];
      await redisConnection.setex(cacheKey, 30, JSON.stringify(flag));
    }
  }

  if (!flag) return false;

  if (flag.enabled) return true;

  if (user && flag.enabledForRoles && Array.isArray(flag.enabledForRoles)) {
    if (user.roles.some((r: string) => flag.enabledForRoles.includes(r))) {
      return true;
    }
  }

  if (user && flag.enabledPercentage && flag.enabledPercentage > 0) {
    const hashData = crypto.createHash('md5').update(user.userId).digest('hex');
    const hashInt = parseInt(hashData.substring(0, 8), 16);
    if (hashInt % 100 < flag.enabledPercentage) {
      return true;
    }
  }

  return false;
}
