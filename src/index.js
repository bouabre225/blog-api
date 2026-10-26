const config = require('./config');
const { startServer } = require('./server');

startServer(config).catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
