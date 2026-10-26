/* global Parse */

function validationError(message) {
  return new Parse.Error(Parse.Error.VALIDATION_ERROR, message);
}

function checkLength(value, min, max, field) {
  if (typeof value !== 'string' || value.length < min || value.length > max) {
    throw validationError(`${field} must be between ${min} and ${max} characters`);
  }
}

function ownerACL(user) {
  const acl = new Parse.ACL(user);
  acl.setPublicReadAccess(true);
  return acl;
}

// ---------- Post ----------

Parse.Cloud.beforeSave('Post', (request) => {
  const post = request.object;

  const title = post.get('title');
  if (typeof title === 'string') post.set('title', title.trim());

  checkLength(post.get('title'), 3, 120, 'title');
  checkLength(post.get('body'), 1, 5000, 'body');

  if (post.isNew()) {
    if (request.user) {
      post.set('author', request.user);
      post.setACL(ownerACL(request.user));
    }
    post.set('likesCount', 0);
    post.set('commentsCount', 0);
  } else if (!request.master) {
    // the client is not allowed to change these fields
    post.set('author', request.original.get('author'));
    post.set('likesCount', request.original.get('likesCount'));
  }
});

Parse.Cloud.afterDelete('Post', async (request) => {
  const comments = await new Parse.Query('Comment')
    .equalTo('post', request.object)
    .limit(1000)
    .find({ useMasterKey: true });

  await Parse.Object.destroyAll(comments, { useMasterKey: true });
});
