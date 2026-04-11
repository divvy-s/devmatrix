const fs = require('fs');

let devSrc = fs.readFileSync(
  'apps/api/src/modules/developers/developers.service.ts',
  'utf8',
);
devSrc = devSrc.replace(
  /NotFoundError\('Developer Profile'\)/g,
  "NotFoundError('Developer', userId)",
);
fs.writeFileSync(
  'apps/api/src/modules/developers/developers.service.ts',
  devSrc,
);

let authMW = fs.readFileSync(
  'apps/api/src/middleware/app-auth.middleware.ts',
  'utf8',
);
authMW = authMW.replace(
  /request\.user = {\\s+userId: appToken\.userId,\\s+roles: \[\],\\s+};/gs,
  "request.user = { userId: appToken.userId, roles: [], sessionId: 'app' };",
);
fs.writeFileSync('apps/api/src/middleware/app-auth.middleware.ts', authMW);

let app = fs.readFileSync('apps/api/src/app.ts', 'utf8');
if (!app.includes('appsRoutes')) {
  app = app.replace(
    "import { developersRoutes } from './modules/developers/developers.routes';",
    "import { developersRoutes } from './modules/developers/developers.routes';\\nimport { appsRoutes } from './modules/apps/apps.routes';",
  );
  app = app.replace(
    "app.register(developersRoutes, { prefix: '/api/v1/developers' });",
    "app.register(developersRoutes, { prefix: '/api/v1/developers' });\\n  app.register(appsRoutes, { prefix: '/api/v1/apps' });",
  );
  fs.writeFileSync('apps/api/src/app.ts', app);
}

console.log('Fixed developer routes and injected apps routes!');
