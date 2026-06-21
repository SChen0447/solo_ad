import { Application } from 'egg';

export default (app: Application) => {
  const { controller, router } = app;

  router.get('/api/batches', controller.batch.list);
  router.get('/api/batches/:id', controller.batch.show);
  router.post('/api/batches', controller.batch.create);
  router.post('/api/compare', controller.batch.compare);
};
