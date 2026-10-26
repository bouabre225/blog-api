require('dotenv').config();

const config = {
  appId: 'blog-app',
  masterKey: process.env.PARSE_MASTER_KEY,
  databaseURI: process.env.DATABASE_URI,
  port: Number(process.env.PORT) || 1337,
};

if (!config.masterKey) {
  console.error('PARSE_MASTER_KEY is missing, see .env.example');
  process.exit(1);
}

module.exports = config;
