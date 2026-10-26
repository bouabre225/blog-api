const { startServer } = require('../src/server');

const APP_ID = 'blog-app';
const PORT = 1338;

let server;

async function setup() {
  server = await startServer({
    appId: APP_ID,
    masterKey: 'test-master-key',
    databaseURI: undefined, // in-memory mongo
    port: PORT,
  });
  return server;
}

async function teardown() {
  if (server) await server.stop();
}

async function api(method, path, { body, token } = {}) {
  const headers = {
    'X-Parse-Application-Id': APP_ID,
    'Content-Type': 'application/json',
  };
  if (token) headers['X-Parse-Session-Token'] = token;

  const res = await fetch(`http://localhost:${PORT}/parse${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  return { status: res.status, data };
}

let counter = 0;
async function signUp() {
  counter++;
  const username = `user_${Date.now()}_${counter}`;
  const { data } = await api('POST', '/users', {
    body: { username, password: 'Password123!', email: `${username}@test.com` },
  });
  return { id: data.objectId, token: data.sessionToken, username };
}

async function createPost(token, fields = {}) {
  return api('POST', '/classes/Post', {
    token,
    body: { title: 'Hello world', body: 'My first post', ...fields },
  });
}

module.exports = { setup, teardown, api, signUp, createPost };
