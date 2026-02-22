import { createApp } from './app';
import { config } from './config';

const app = createApp();

const server = app.listen(config.PORT, () => {
  console.log(`[kasa] backend listening on http://localhost:${config.PORT}`);
});

// Gestion des signaux d'arrêt
const handleShutdown = () => {
  console.log('\nStopping server...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });

  // Force l'arrêt après 2s si le serveur est bloqué
  setTimeout(() => {
    console.error('Could not close connections in time, forceful shutdown');
    process.exit(1);
  }, 2000);
};

process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);
