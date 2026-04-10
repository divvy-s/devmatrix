const fs = require('fs');
const slashN = String.fromCharCode(92) + 'n';

let f1 = fs.readFileSync('apps/api/src/infrastructure/outbox.worker.ts', 'utf8');
f1 = f1.split(slashN).join('\n');
fs.writeFileSync('apps/api/src/infrastructure/outbox.worker.ts', f1);

let f2 = fs.readFileSync('apps/api/src/modules/developers/developers.routes.ts', 'utf8');
f2 = f2.split(slashN).join('\n');
fs.writeFileSync('apps/api/src/modules/developers/developers.routes.ts', f2);

let f3 = fs.readFileSync('packages/queue/src/index.ts', 'utf8');
f3 = f3.split(slashN).join('\n');
fs.writeFileSync('packages/queue/src/index.ts', f3);
