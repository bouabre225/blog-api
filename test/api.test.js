const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { setup, teardown, api, signUp, createPost } = require('./helpers');

before(async () => {
  await setup();
});

after(async () => {
  await teardown();
});

test('health endpoint returns ok', async () => {
  const { data } = await api('GET', '/health');
  assert.strictEqual(data.status, 'ok');
});

test('post with a too short title is rejected (142)', async () => {
  const user = await signUp();
  const { data } = await createPost(user.token, { title: '  a  ' });
  assert.strictEqual(data.code, 142);
});

test('post ignores author / counters sent by the client', async () => {
  const alice = await signUp();
  const bob = await signUp();

  const { data } = await createPost(alice.token, {
    likesCount: 99,
    commentsCount: 42,
    author: { __type: 'Pointer', className: '_User', objectId: bob.id },
  });
  const { data: post } = await api('GET', `/classes/Post/${data.objectId}`);

  assert.strictEqual(post.author.objectId, alice.id);
  assert.strictEqual(post.likesCount, 0);
  assert.strictEqual(post.commentsCount, 0);
});

test('anonymous user cannot create a post', async () => {
  const { data } = await createPost(undefined);
  assert.ok(data.code, 'should return an error');
});

test('comment on a missing post returns 101', async () => {
  const user = await signUp();
  const { data } = await api('POST', '/classes/Comment', {
    token: user.token,
    body: {
      text: 'hi',
      post: { __type: 'Pointer', className: 'Post', objectId: 'doesNotExist' },
    },
  });
  assert.strictEqual(data.code, 101);
});

test('commentsCount follows created / deleted comments', async () => {
  const user = await signUp();
  const { data: post } = await createPost(user.token);
  const pointer = { __type: 'Pointer', className: 'Post', objectId: post.objectId };

  const { data: comment } = await api('POST', '/classes/Comment', {
    token: user.token,
    body: { text: 'Nice', post: pointer },
  });
  let { data: fresh } = await api('GET', `/classes/Post/${post.objectId}`);
  assert.strictEqual(fresh.commentsCount, 1);

  await api('DELETE', `/classes/Comment/${comment.objectId}`, { token: user.token });
  ({ data: fresh } = await api('GET', `/classes/Post/${post.objectId}`));
  assert.strictEqual(fresh.commentsCount, 0);
});

test('toggleLike likes then unlikes', async () => {
  const user = await signUp();
  const { data: post } = await createPost(user.token);

  let { data } = await api('POST', '/functions/toggleLike', {
    token: user.token,
    body: { postId: post.objectId },
  });
  assert.deepStrictEqual(data.result, { liked: true, likesCount: 1 });

  ({ data } = await api('POST', '/functions/toggleLike', {
    token: user.token,
    body: { postId: post.objectId },
  }));
  assert.deepStrictEqual(data.result, { liked: false, likesCount: 0 });
});

test('toggleLike requires a logged in user (142)', async () => {
  const { data } = await api('POST', '/functions/toggleLike', {
    body: { postId: 'whatever' },
  });
  assert.strictEqual(data.code, 142);
});

test('clients cannot create Like objects directly', async () => {
  const user = await signUp();
  const { data: post } = await createPost(user.token);
  const { data } = await api('POST', '/classes/Like', {
    token: user.token,
    body: {
      post: { __type: 'Pointer', className: 'Post', objectId: post.objectId },
      user: { __type: 'Pointer', className: '_User', objectId: user.id },
    },
  });
  assert.ok(data.code, 'should return an error');
});

test('email is not visible to other users', async () => {
  const alice = await signUp();
  const bob = await signUp();
  const { data } = await api('GET', `/users/${alice.id}`, { token: bob.token });
  assert.strictEqual(data.username, alice.username);
  assert.strictEqual(data.email, undefined);
});
