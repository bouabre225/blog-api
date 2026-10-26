# Blog API — Express + Parse Server

Backend for a small blog (users, posts, comments, likes) built with **Parse Server** mounted on **Express**.

## Requirements

- Node.js 20.19+ (tested with Node 24)
- MongoDB is optional: if `DATABASE_URI` is empty, an in-memory MongoDB is started with `mongodb-memory-server`
  (the binary is downloaded on the first run, so the first start can take a few minutes).

## Run

```bash
cp .env.example .env      # then set PARSE_MASTER_KEY
npm install
npm start                 # http://localhost:1337/parse
```

Check: `curl http://localhost:1337/parse/health` → `{"status":"ok"}`

To use a real MongoDB:

```bash
docker run -p 27017:27017 mongo:7
DATABASE_URI=mongodb://localhost:27017/blog npm start
```

## Tests

```bash
npm test
```

The tests start the server on port `1338` with an in-memory database and call the API over REST
(`node:test`, no extra dependency).

## Project structure

```
src/
  index.js     entry point (reads config, starts the server)
  config.js    env variables (PARSE_MASTER_KEY is required)
  server.js    Express + ParseServer setup
  schema.js    classes, fields and CLPs created at startup
cloud/
  main.js      Cloud Code (triggers + toggleLike)
test/
  helpers.js   start/stop server, REST helper
  api.test.js  tests
```

## What is done

- Parse Server on Express, appId `blog-app`, `/parse/health`
- Schema (`Post`, `Comment`, `Like`) and Class-Level Permissions created by code at startup
- Clients cannot create classes, users are public but `email` is protected
- `beforeSave(Post)`: validation, author / counters / ACL set by the server
- `beforeSave(Comment)`: validation, post must exist (101), author / ACL
- `afterSave` / `afterDelete(Comment)`: `commentsCount` kept up to date
- `afterDelete(Post)`: deletes the comments of the post
- Cloud function `toggleLike({ postId })` → `{ liked, likesCount }`
- 10 automated tests

## Not done

- Bonus: `userStats`, docker-compose, ESLint, seed script
- `toggleLike` is not protected against parallel calls (no unique index on `Like`)

## Choices

- **CommonJS** because Parse Cloud Code loads `cloud/main.js` with `require` without extra config.
- **In-memory MongoDB fallback** so `npm install && npm start` works on a clean machine without Docker.
- Counters are updated with `increment()` (atomic on the database side) and the master key, because the
  ACL of a post only allows its author to write.
- `beforeSave(Post)` ignores the restrictions when the master key is used, so Cloud Code can update counters.

## What I would improve with more time

- Unique index on `Like (post, user)` to make `toggleLike` safe with parallel calls
- Pagination for the cascade delete (currently limited to 1000 comments)
- More tests (updates, permissions between two users), separate test database per file
- Lower log level in tests, ESLint + Prettier, CI
