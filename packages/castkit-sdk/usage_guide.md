# CastKit SDK Usage Guide

The `@castkit/sdk` is a dependency-free TypeScript library used for developing and verifying CastKit mini-apps.

## 1. Installation

Since the SDK is local to the monorepo, you can link it to other packages using your package manager's workspace or link feature.

### Using pnpm (Recommended)
In the target package directory:
```bash
pnpm add ../packages/castkit-sdk
```

### Manual package.json
Add it to your `dependencies` or `devDependencies`:
```json
{
  "dependencies": {
    "@castkit/sdk": "link:../packages/castkit-sdk"
  }
}
```

---

## 2. Runtime Usage (For Mini-Apps)

Mini-apps must initialize the SDK to register themselves and provide metadata to the platform.

### Basic Initialization
In your app's entry point (e.g., `src/index.ts` or `app/layout.tsx`):

```typescript
import { initCastKit } from '@castkit/sdk';

initCastKit({
  name: 'My Awesome Mini-App',
  version: '1.0.0',
  permissions: ['camera', 'location'],
  entry: '/index.html'
});
```

### Accessing Context
You can retrieve the registered context elsewhere in your app:

```typescript
import { getCastKitContext } from '@castkit/sdk';

const context = getCastKitContext();
if (context) {
  console.log(`Running in ${context.name} v${context.version}`);
}
```

---

## 3. Verification Usage (For Tools/CI)

The SDK exposes a robust verification engine to validate repositories before deployment.

### Programmatic Usage
Used in deployers or verification scripts:

```typescript
import { verifyRepo, VerificationReport } from '@castkit/sdk';

async function validate() {
  const report: VerificationReport = await verifyRepo({
    repoPath: './cloned-repo',
    strict: true
  });

  if (!report.deployable) {
    console.error('Validation failed:');
    report.checks.filter(c => c.status === 'fail').forEach(c => {
      console.error(`- ${c.checkName}: ${c.message}`);
    });
    process.exit(1);
  }

  console.log('App is deployable!');
}
```

---

## 4. CLI Usage

The SDK includes a CLI tool for manual verification of local repositories.

```bash
# From the SDK directory
npm run build
npx . ./path/to/my-app

# Or if linked globally/locally
npx castkit-verify ./path/to/my-app
```

### Validation Reports
The CLI outputs a colored report covering 10 key checks:
- `package.json` validity and structure.
- SDK dependency and version compatibility.
- Presence of a `dev` script.
- Security checks (e.g., ensuring `.env` files are not committed).
- Port availability for deployment.

---

## 5. Development

To rebuild the SDK after making changes:
```bash
cd packages/castkit-sdk
npm run build
```
