import app from './app.js';
import { websocketManager } from './websocketManager.js';

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`);
  websocketManager.init(server);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received');
  websocketManager.close();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received');
  websocketManager.close();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
