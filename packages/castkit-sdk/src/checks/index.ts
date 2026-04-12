import * as fs from 'fs';
import * as path from 'path';
import * as net from 'net';
import type { CheckResult, VerifyOptions, CastKitAppConfig } from '../types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function readPackageJson(repoPath: string): Record<string, unknown> | null {
  const pkgPath = path.join(repoPath, 'package.json');
  if (!fs.existsSync(pkgPath)) return null;
  try {
    const raw = fs.readFileSync(pkgPath, 'utf-8');
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Minimal semver parser. Returns [major, minor, patch] or null on failure.
 */
function parseSemver(version: string): [number, number, number] | null {
  const cleaned = version.replace(/^[~^>=<\s]+/, '');
  const parts = cleaned.split('.');
  if (parts.length !== 3) return null;
  const nums = parts.map(Number);
  if (nums.some(isNaN)) return null;
  return [nums[0]!, nums[1]!, nums[2]!];
}

/**
 * Checks whether `declared` satisfies the `required` range.
 * Supports exact match, ^ (caret), and ~ (tilde) prefixes.
 */
function satisfiesSemver(declared: string, required: string): boolean {
  const declParsed = parseSemver(declared);
  const reqParsed = parseSemver(required);
  if (!declParsed || !reqParsed) return false;

  const [dMaj, dMin, dPatch] = declParsed;
  const [rMaj, rMin, rPatch] = reqParsed;

  const trimmed = required.trim();

  if (trimmed.startsWith('^')) {
    // ^1.2.3 → >=1.2.3 && <2.0.0 (if major > 0)
    // ^0.2.3 → >=0.2.3 && <0.3.0 (if major === 0)
    if (rMaj > 0) {
      return dMaj === rMaj && (dMin > rMin || (dMin === rMin && dPatch >= rPatch));
    }
    return dMaj === rMaj && dMin === rMin && dPatch >= rPatch;
  }

  if (trimmed.startsWith('~')) {
    // ~1.2.3 → >=1.2.3 && <1.3.0
    return dMaj === rMaj && dMin === rMin && dPatch >= rPatch;
  }

  // Exact match
  return dMaj === rMaj && dMin === rMin && dPatch === rPatch;
}

function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.once('error', () => {
      resolve(false);
    });
    server.listen(port, '127.0.0.1');
  });
}

// ─── Sync Check Type ────────────────────────────────────────────────────────

type SyncCheck = (repoPath: string, options: VerifyOptions) => CheckResult;
type AsyncCheck = (repoPath: string, options: VerifyOptions) => Promise<CheckResult>;

// ─── CHECK 1: package.json exists ───────────────────────────────────────────

const checkPackageJsonExists: SyncCheck = (repoPath) => {
  const exists = fs.existsSync(path.join(repoPath, 'package.json'));
  if (exists) {
    return {
      checkName: 'package.json exists',
      status: 'pass',
      message: 'package.json found in repository root.',
    };
  }
  return {
    checkName: 'package.json exists',
    status: 'fail',
    message: 'No package.json found.',
    fix: 'Ensure your project root contains a valid package.json file.',
  };
};

// ─── CHECK 2: package.json is valid JSON ────────────────────────────────────

const checkPackageJsonValid: SyncCheck = (repoPath) => {
  const pkgPath = path.join(repoPath, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    return {
      checkName: 'package.json is valid JSON',
      status: 'fail',
      message: 'Skipped — package.json missing.',
    };
  }
  try {
    const raw = fs.readFileSync(pkgPath, 'utf-8');
    JSON.parse(raw);
    return {
      checkName: 'package.json is valid JSON',
      status: 'pass',
      message: 'package.json parsed successfully.',
    };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return {
      checkName: 'package.json is valid JSON',
      status: 'fail',
      message: `package.json contains invalid JSON: ${errMsg}`,
      fix: 'Run your package.json through a JSON validator such as jsonlint.com and fix any syntax errors.',
    };
  }
};

// ─── CHECK 3: @castkit/sdk dependency declared ─────────────────────────────

const checkCastKitSdkDependency: SyncCheck = (repoPath) => {
  const pkg = readPackageJson(repoPath);
  if (!pkg) {
    return {
      checkName: '@castkit/sdk dependency declared',
      status: 'fail',
      message: 'Skipped — package.json missing or invalid.',
    };
  }

  const deps = pkg.dependencies as Record<string, string> | undefined;
  const devDeps = pkg.devDependencies as Record<string, string> | undefined;

  if (deps && deps['@castkit/sdk'] !== undefined) {
    return {
      checkName: '@castkit/sdk dependency declared',
      status: 'pass',
      message: `Found @castkit/sdk in dependencies at version ${deps['@castkit/sdk']}.`,
    };
  }

  if (devDeps && devDeps['@castkit/sdk'] !== undefined) {
    return {
      checkName: '@castkit/sdk dependency declared',
      status: 'pass',
      message: `Found @castkit/sdk in devDependencies at version ${devDeps['@castkit/sdk']}.`,
    };
  }

  return {
    checkName: '@castkit/sdk dependency declared',
    status: 'fail',
    message: '@castkit/sdk not found in dependencies or devDependencies.',
    fix: 'Run: npm install @castkit/sdk  Then re-run verification.',
  };
};

// ─── CHECK 4: @castkit/sdk version compatibility ───────────────────────────

const checkSdkVersionCompatibility: SyncCheck = (repoPath, options) => {
  if (!options.requiredSdkVersion) {
    return {
      checkName: '@castkit/sdk version compatibility',
      status: 'pass',
      message: 'No version requirement specified. Skipping version check.',
    };
  }

  const pkg = readPackageJson(repoPath);
  if (!pkg) {
    return {
      checkName: '@castkit/sdk version compatibility',
      status: 'fail',
      message: 'Skipped — package.json missing or invalid.',
    };
  }

  const deps = pkg.dependencies as Record<string, string> | undefined;
  const devDeps = pkg.devDependencies as Record<string, string> | undefined;

  const declared = (deps && deps['@castkit/sdk']) || (devDeps && devDeps['@castkit/sdk']);

  if (!declared) {
    return {
      checkName: '@castkit/sdk version compatibility',
      status: 'fail',
      message: '@castkit/sdk not declared — cannot check version compatibility.',
    };
  }

  const declParsed = parseSemver(declared);
  if (!declParsed) {
    return {
      checkName: '@castkit/sdk version compatibility',
      status: 'warning',
      message: `Cannot parse declared SDK version "${declared}". Unable to verify compatibility.`,
      fix: `Use a standard semver version string (e.g. "1.0.0" or "^1.0.0").`,
    };
  }

  if (satisfiesSemver(declared, options.requiredSdkVersion)) {
    return {
      checkName: '@castkit/sdk version compatibility',
      status: 'pass',
      message: `SDK version ${declared} satisfies required range ${options.requiredSdkVersion}.`,
    };
  }

  return {
    checkName: '@castkit/sdk version compatibility',
    status: 'fail',
    message: `SDK version ${declared} does not satisfy required range ${options.requiredSdkVersion}.`,
    fix: `Update @castkit/sdk to a compatible version: npm install @castkit/sdk@${options.requiredSdkVersion}`,
  };
};

// ─── CHECK 5: dev script defined ────────────────────────────────────────────

const checkDevScriptExists: SyncCheck = (repoPath) => {
  const pkg = readPackageJson(repoPath);
  if (!pkg) {
    return {
      checkName: 'dev script defined',
      status: 'fail',
      message: 'Skipped — package.json missing or invalid.',
    };
  }

  const scripts = pkg.scripts as Record<string, string> | undefined;
  if (scripts && typeof scripts.dev === 'string' && scripts.dev.trim().length > 0) {
    return {
      checkName: 'dev script defined',
      status: 'pass',
      message: `dev script found: '${scripts.dev}'`,
    };
  }

  return {
    checkName: 'dev script defined',
    status: 'fail',
    message: "No 'dev' script found in package.json scripts.",
    fix: 'Add a dev script to your package.json, e.g.: "dev": "next dev" or "dev": "vite"',
  };
};

// ─── CHECK 6: node_modules not committed ────────────────────────────────────

const checkNodeModulesAbsent: SyncCheck = (repoPath) => {
  const nodeModulesPath = path.join(repoPath, 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    return {
      checkName: 'node_modules not committed',
      status: 'pass',
      message: 'node_modules directory is not present. Good practice.',
    };
  }

  return {
    checkName: 'node_modules not committed',
    status: 'warning',
    message: 'node_modules directory found in repo. This suggests dependencies were committed to git.',
    fix: 'Add node_modules/ to your .gitignore and remove it from version control: git rm -r --cached node_modules',
  };
};

// ─── CHECK 7: .gitignore present ───────────────────────────────────────────

const checkGitIgnoreExists: SyncCheck = (repoPath) => {
  if (fs.existsSync(path.join(repoPath, '.gitignore'))) {
    return {
      checkName: '.gitignore present',
      status: 'pass',
      message: '.gitignore file found.',
    };
  }

  return {
    checkName: '.gitignore present',
    status: 'warning',
    message: 'No .gitignore file found.',
    fix: 'Add a .gitignore file. At minimum, include: node_modules/, .env, .env.local, dist/, .next/',
  };
};

// ─── CHECK 8: no .env files committed ──────────────────────────────────────

const checkNoEnvFileCommitted: SyncCheck = (repoPath) => {
  const envFiles = ['.env', '.env.local', '.env.production'];
  const found = envFiles.filter((f) => fs.existsSync(path.join(repoPath, f)));

  if (found.length === 0) {
    return {
      checkName: 'no .env files committed',
      status: 'pass',
      message: 'No .env files detected in repository root.',
    };
  }

  return {
    checkName: 'no .env files committed',
    status: 'fail',
    message: `.env file(s) detected: ${found.join(', ')}. Secrets may be exposed.`,
    fix: 'Remove these files from git: git rm --cached .env  Then add them to .gitignore immediately.',
  };
};

// ─── CHECK 9: castkit.config.json (optional) ───────────────────────────────

const checkCastKitConfigOptional: SyncCheck = (repoPath) => {
  const configPath = path.join(repoPath, 'castkit.config.json');

  if (!fs.existsSync(configPath)) {
    return {
      checkName: 'castkit.config.json (optional)',
      status: 'pass',
      message: 'No castkit.config.json found. Using defaults. (This file is optional.)',
    };
  }

  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    const errors: string[] = [];
    if (typeof parsed.name !== 'string') errors.push('name must be a string');
    if (typeof parsed.version !== 'string') errors.push('version must be a string');
    if (!Array.isArray(parsed.permissions)) {
      errors.push('permissions must be a string[]');
    } else if (!parsed.permissions.every((p: unknown) => typeof p === 'string')) {
      errors.push('all entries in permissions must be strings');
    }
    if (typeof parsed.minSdkVersion !== 'string') errors.push('minSdkVersion must be a string');

    if (errors.length > 0) {
      return {
        checkName: 'castkit.config.json (optional)',
        status: 'fail',
        message: `castkit.config.json found but is invalid: ${errors.join('; ')}`,
        fix: 'Ensure castkit.config.json has the required fields: name (string), version (string), permissions (string[]), minSdkVersion (string).',
      };
    }

    const config = parsed as unknown as CastKitAppConfig;
    return {
      checkName: 'castkit.config.json (optional)',
      status: 'pass',
      message: `castkit.config.json found and valid. App: '${config.name}' v${config.version}, permissions: [${config.permissions.join(', ')}].`,
    };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return {
      checkName: 'castkit.config.json (optional)',
      status: 'fail',
      message: `castkit.config.json found but is invalid: ${errMsg}`,
      fix: 'Ensure castkit.config.json has the required fields: name (string), version (string), permissions (string[]), minSdkVersion (string).',
    };
  }
};

// ─── CHECK 10: deployment port range availability (ASYNC) ──────────────────

const checkPortAvailability: AsyncCheck = async () => {
  let freeCount = 0;
  for (let port = 8000; port <= 8010; port++) {
    const free = await isPortFree(port);
    if (free) freeCount++;
  }

  if (freeCount >= 3) {
    return {
      checkName: 'deployment port range availability',
      status: 'pass',
      message: `Port availability OK — found ${freeCount} free port(s) in range 8000–8010.`,
    };
  }

  if (freeCount >= 1) {
    return {
      checkName: 'deployment port range availability',
      status: 'warning',
      message: `Only ${freeCount} port(s) free in range 8000–8010. Deployment may fail under load.`,
      fix: 'Stop other local development servers to free up ports.',
    };
  }

  return {
    checkName: 'deployment port range availability',
    status: 'fail',
    message: 'No free ports found in range 8000–8010. Deployment will fail.',
    fix: 'Run: lsof -i :8000-8010  to find and kill blocking processes.',
  };
};

// ─── Export all checks ──────────────────────────────────────────────────────

export const SYNC_CHECKS: SyncCheck[] = [
  checkPackageJsonExists,
  checkPackageJsonValid,
  checkCastKitSdkDependency,
  checkSdkVersionCompatibility,
  checkDevScriptExists,
  checkNodeModulesAbsent,
  checkGitIgnoreExists,
  checkNoEnvFileCommitted,
  checkCastKitConfigOptional,
];

export { checkPortAvailability };

export type { SyncCheck, AsyncCheck };
