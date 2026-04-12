export type VerificationStatus = 'pass' | 'fail' | 'warning';

export interface CheckResult {
  checkName: string;
  status: VerificationStatus;
  message: string;
  fix?: string;
}

export interface VerificationReport {
  appId: string;
  repoPath: string;
  timestamp: string;
  overallStatus: VerificationStatus;
  checks: CheckResult[];
  deployable: boolean;
  sdkVersion: string;
}

export interface VerifyOptions {
  repoPath: string;
  strict?: boolean;
  requiredSdkVersion?: string;
}

export interface CastKitAppConfig {
  name: string;
  version: string;
  permissions: string[];
  minSdkVersion: string;
  entry?: string;
}
