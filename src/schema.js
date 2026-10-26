// Classes + CLPs, created by Parse Server at startup (option `schema`)

const publicRead = {
  find: { '*': true },
  get: { '*': true },
  count: { '*': true },
};

const definitions = [
  {
    className: 'Post',
    fields: {
      title: { type: 'String' },
      body: { type: 'String' },
      author: { type: 'Pointer', targetClass: '_User' },
      likesCount: { type: 'Number' },
      commentsCount: { type: 'Number' },
    },
    classLevelPermissions: {
      ...publicRead,
      create: { requiresAuthentication: true },
      update: { '*': true },
      delete: { '*': true },
      addField: {},
      protectedFields: {},
    },
  },
  {
    className: 'Comment',
    fields: {
      post: { type: 'Pointer', targetClass: 'Post' },
      author: { type: 'Pointer', targetClass: '_User' },
      text: { type: 'String' },
    },
    classLevelPermissions: {
      ...publicRead,
      create: { requiresAuthentication: true },
      update: { '*': true },
      delete: { '*': true },
      addField: {},
      protectedFields: {},
    },
  },
  {
    className: 'Like',
    fields: {
      post: { type: 'Pointer', targetClass: 'Post' },
      user: { type: 'Pointer', targetClass: '_User' },
    },
    // only Cloud Code (master key) can write likes
    classLevelPermissions: {
      ...publicRead,
      create: {},
      update: {},
      delete: {},
      addField: {},
      protectedFields: {},
    },
  },
];

module.exports = { definitions };
