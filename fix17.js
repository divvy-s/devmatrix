const fs = require('fs');
let idx = fs.readFileSync('packages/queue/src/index.ts', 'utf8');
if (!idx.includes('analytics.queue')) {
  fs.writeFileSync('packages/queue/src/index.ts', idx + '\nexport * from "./analytics.queue";\n');
}
