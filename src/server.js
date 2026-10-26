const path = require('path');
const express = require('express');
const { ParseServer } = require('parse-server');
const { definitions } = require('./schema');

async function startServer({ appId, masterKey, databaseURI, port }) {
  let mongo = null;

  if (!databaseURI) {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongo = await MongoMemoryServer.create();
    databaseURI = mongo.getUri('blog');
    console.log('No DATABASE_URI, using in-memory MongoDB');
  }

  const serverURL = `http://localhost:${port}/parse`;

  const parseServer = new ParseServer({
    appId,
    masterKey,
    databaseURI,
    serverURL,
    cloud: path.join(__dirname, '..', 'cloud', 'main.js'),
    allowClientClassCreation: false,
    // users are readable so posts can include their author...
    enforcePrivateUsers: false,
    // ...but the email stays hidden
    protectedFields: { _User: { '*': ['email'] } },
    schema: { definitions },
  });

  await parseServer.start();

  const app = express();
  app.use('/parse', parseServer.app);

  const httpServer = await new Promise((resolve) => {
    const s = app.listen(port, () => resolve(s));
  });

  console.log(`Parse Server running on ${serverURL}`);

  async function stop() {
    await new Promise((resolve) => httpServer.close(resolve));
    await parseServer.config.databaseController.adapter.handleShutdown();
    if (mongo) await mongo.stop();
  }

  return { app, httpServer, serverURL, stop };
}

module.exports = { startServer };
