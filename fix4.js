const fs = require('fs');

let feed = fs.readFileSync('apps/api/src/modules/feed/feed.service.ts', 'utf8');
feed = feed.replace(/const last = dataRows\[dataRows\.length - 1\];/g, 'const last = dataRows[dataRows.length - 1]!;');
fs.writeFileSync('apps/api/src/modules/feed/feed.service.ts', feed);

let app = fs.readFileSync('apps/api/src/app.ts', 'utf8');
if (!app.includes('notificationsRoutes')) {
  app = app.replace("import { feedRoutes } from './modules/feed/feed.routes';", "import { feedRoutes } from './modules/feed/feed.routes';\nimport { notificationsRoutes } from './modules/notifications/notifications.routes';");
  app = app.replace("app.register(feedRoutes, { prefix: '/api/v1/feed' });", "app.register(feedRoutes, { prefix: '/api/v1/feed' });\n  app.register(notificationsRoutes, { prefix: '/api/v1/notifications' });");
  fs.writeFileSync('apps/api/src/app.ts', app);
}

console.log('Fixed feed assertions and registered routes');
