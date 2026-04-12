#!/usr/bin/env node

import * as path from 'path';
import { verifyRepo } from './verifier';
import type { CheckResult } from './types';

const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';

function formatCheck(check: CheckResult): string {
  const lines: string[] = [];

  switch (check.status) {
    case 'pass':
      lines.push(`  ${GREEN}✓  ${check.checkName}: ${check.message}${RESET}`);
      break;
    case 'warning':
      lines.push(`  ${YELLOW}⚠  ${check.checkName}: ${check.message}${RESET}`);
      break;
    case 'fail':
      lines.push(`  ${RED}✗  ${check.checkName}: ${check.message}${RESET}`);
      break;
  }

  if (check.fix) {
    lines.push(`  ${DIM}   → Fix: ${check.fix}${RESET}`);
  }

  return lines.join('\n');
}

async function main(): Promise<void> {
  const repoArg = process.argv[2];

  if (!repoArg) {
    console.log('Usage: castkit-verify <path-to-repo>');
    process.exit(1);
  }

  const resolvedPath = path.resolve(repoArg);

  const report = await verifyRepo({ repoPath: resolvedPath, strict: false });

  console.log('');
  console.log('═══ CastKit Verification Report ═══');
  console.log(`App ID: ${report.appId}`);
  console.log(`Timestamp: ${report.timestamp}`);
  console.log(`Repo: ${report.repoPath}`);
  console.log('───────────────────────────────────');

  for (const check of report.checks) {
    console.log(formatCheck(check));
  }

  console.log('───────────────────────────────────');

  if (report.deployable) {
    console.log(`  ${GREEN}✓ DEPLOYABLE — This app passed CastKit verification.${RESET}`);
  } else {
    console.log(`  ${RED}✗ NOT DEPLOYABLE — Fix the errors above before submitting.${RESET}`);
  }

  console.log('');

  process.exit(report.deployable ? 0 : 1);
}

main().catch((error: unknown) => {
  const errMsg = error instanceof Error ? error.message : String(error);
  console.error(`${RED}Fatal error: ${errMsg}${RESET}`);
  process.exit(1);
});
