const fs = require('fs');

let app = fs.readFileSync('apps/api/src/app.ts', 'utf8');
app = app.replace('reply.getResponseTime()', '(reply as any).getResponseTime()');
fs.writeFileSync('apps/api/src/app.ts', app);

let ob = fs.readFileSync('apps/api/src/infrastructure/outbox.worker.ts', 'utf8');
ob = ob.replace('const events = result.rows as', 'const events = result as unknown as');
fs.writeFileSync('apps/api/src/infrastructure/outbox.worker.ts', ob);

console.log('Fixed final two errors');
