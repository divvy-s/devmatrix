import { FastifyInstance } from 'fastify';
import { StorageController } from './storage.controller';
import { authenticateAppToken, requireAppScope } from '../../middleware/app-auth.middleware';

export async function storageRoutes(app: FastifyInstance) {
  const controller = new StorageController();

  app.addHook('preHandler', authenticateAppToken as any);

  app.get('/:key', { preHandler: [requireAppScope('storage.read') as any] }, controller.getStorage as any);
  app.put('/:key', { preHandler: [requireAppScope('storage.write') as any] }, controller.putStorage as any);
  app.delete('/:key', { preHandler: [requireAppScope('storage.write') as any] }, controller.deleteStorage as any);
  app.get('/', { preHandler: [requireAppScope('storage.read') as any] }, controller.listStorage as any);
}
