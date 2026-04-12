import type { CastKitAppConfig } from './types';

const CASTKIT_SYMBOL = Symbol.for('castkit.app');

interface CastKitGlobalEntry {
  name: string;
  version?: string;
  permissions?: string[];
  minSdkVersion?: string;
  entry?: string;
  sdkVersion: string;
  startedAt: string;
}

export function initCastKit(config: Partial<CastKitAppConfig>): void {
  if (!config.name) {
    throw new Error('CastKit SDK: config.name is required.');
  }

  const entry: CastKitGlobalEntry = {
    ...config,
    name: config.name,
    sdkVersion: '1.0.0',
    startedAt: new Date().toISOString(),
  };

  (globalThis as Record<symbol, unknown>)[CASTKIT_SYMBOL] = entry;

  console.log(`[CastKit] Mini-app '${config.name}' initialized. SDK v1.0.0`);

  process.on('SIGTERM', () => {
    console.log(`[CastKit] Shutting down '${config.name}'...`);
    process.exit(0);
  });
}

export function getCastKitContext(): CastKitAppConfig | null {
  const entry = (globalThis as Record<symbol, unknown>)[CASTKIT_SYMBOL] as CastKitGlobalEntry | undefined;

  if (!entry) {
    return null;
  }

  return {
    name: entry.name,
    version: entry.version ?? '0.0.0',
    permissions: entry.permissions ?? [],
    minSdkVersion: entry.minSdkVersion ?? '1.0.0',
    entry: entry.entry,
  };
}
