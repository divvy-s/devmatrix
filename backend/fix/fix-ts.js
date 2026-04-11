const fs = require('fs');

const routes = [
  'apps/api/src/modules/auth/auth.routes.ts',
  'apps/api/src/modules/identity/identity.routes.ts',
  'apps/api/src/modules/social/social.routes.ts',
  'apps/api/src/modules/wallet/wallet.routes.ts',
];
for (const f of routes) {
  let r = fs.readFileSync(f, 'utf8');
  r = r.replace(
    /controller\.([a-zA-Z0-9_]+)(\s*[,)\]\n])/g,
    'controller.$1 as any$2',
  );
  fs.writeFileSync(f, r);
}

let ss = fs.readFileSync(
  'apps/api/src/modules/social/social.service.ts',
  'utf8',
);
ss = ss.replace('!existing[0].deletedAt', '!existing[0]?.deletedAt');
fs.writeFileSync('apps/api/src/modules/social/social.service.ts', ss);

let ws = fs.readFileSync(
  'apps/api/src/modules/wallet/wallet.service.ts',
  'utf8',
);
ws = ws.replace('existingOwnerArr[0].userId', 'existingOwnerArr[0]?.userId');
ws = ws.replace('result[0].value', 'result[0]?.value');
fs.writeFileSync('apps/api/src/modules/wallet/wallet.service.ts', ws);

let server = fs.readFileSync('apps/api/src/server.ts', 'utf8');
if (!server.includes('import { outboxWorker }')) {
  server =
    "import { outboxWorker } from './infrastructure/outbox.worker';\n" + server;
}
server = server.replace(
  /import\('\.\/infrastructure\/outbox\.worker'\)\.then\(\(\{ outboxWorker \}\) => \{[\s\n]*outboxWorker\.start\(\);[\s\n]*\}\);/g,
  'outboxWorker.start();',
);
fs.writeFileSync('apps/api/src/server.ts', server);

console.log('Fixed TS files');
