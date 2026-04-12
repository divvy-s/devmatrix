import * as crypto from 'crypto';
import { SYNC_CHECKS, checkPortAvailability } from './checks/index';
import type { VerifyOptions, VerificationReport, CheckResult, VerificationStatus } from './types';

const SDK_VERSION = '1.0.0';

export async function verifyRepo(options: VerifyOptions): Promise<VerificationReport> {
  const appId = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const checks: CheckResult[] = [];

  // Run all synchronous checks sequentially — order matters since later
  // checks may skip if earlier ones failed (e.g. package.json validity).
  for (const check of SYNC_CHECKS) {
    const result = check(options.repoPath, options);
    checks.push(result);
  }

  // Run the async port availability check
  const portResult = await checkPortAvailability(options.repoPath, options);
  checks.push(portResult);

  // Compute overall status
  const hasFail = checks.some((c) => c.status === 'fail');
  const hasWarning = checks.some((c) => c.status === 'warning');

  let overallStatus: VerificationStatus;
  if (hasFail) {
    overallStatus = 'fail';
  } else if (options.strict && hasWarning) {
    overallStatus = 'fail';
  } else if (hasWarning) {
    overallStatus = 'warning';
  } else {
    overallStatus = 'pass';
  }

  const deployable = overallStatus !== 'fail';

  return {
    appId,
    repoPath: options.repoPath,
    timestamp,
    overallStatus,
    checks,
    deployable,
    sdkVersion: SDK_VERSION,
  };
}

export async function isDeployable(repoPath: string): Promise<boolean> {
  const report = await verifyRepo({ repoPath });
  return report.deployable;
}
