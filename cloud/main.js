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

// ---------- Comment ----------

Parse.Cloud.beforeSave('Comment', async (request) => {
  const comment = request.object;

  checkLength(comment.get('text'), 1, 500, 'text');

  const post = comment.get('post');
  if (!post || !post.id) {
    throw validationError('post is required');
  }

  try {
    await new Parse.Query('Post').get(post.id, { useMasterKey: true });
  } catch (e) {
    throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Post not found');
  }

  if (comment.isNew() && request.user) {
    comment.set('author', request.user);
    comment.setACL(ownerACL(request.user));
  }
});

async function updateCommentsCount(comment, amount) {
  const post = comment.get('post');
  if (!post) return;
  try {
    post.increment('commentsCount', amount);
    await post.save(null, { useMasterKey: true });
  } catch (e) {
    // the post may already be deleted
    console.warn('Could not update commentsCount:', e.message);
  }
}

Parse.Cloud.afterSave('Comment', async (request) => {
  if (!request.original) {
    await updateCommentsCount(request.object, 1);
  }
});

Parse.Cloud.afterDelete('Comment', async (request) => {
  await updateCommentsCount(request.object, -1);
});

// ---------- Like ----------

Parse.Cloud.define(
  'toggleLike',
  async (request) => {
    const { postId } = request.params;
    if (typeof postId !== 'string' || postId.length === 0) {
      throw validationError('postId is required');
    }

    let post;
    try {
      post = await new Parse.Query('Post').get(postId, { useMasterKey: true });
    } catch (e) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Post not found');
    }

    const existing = await new Parse.Query('Like')
      .equalTo('post', post)
      .equalTo('user', request.user)
      .first({ useMasterKey: true });

    let liked;
    if (existing) {
      await existing.destroy({ useMasterKey: true });
      post.increment('likesCount', -1);
      liked = false;
    } else {
      const like = new Parse.Object('Like');
      like.set('post', post);
      like.set('user', request.user);
      const acl = new Parse.ACL();
      acl.setPublicReadAccess(true);
      like.setACL(acl);
      await like.save(null, { useMasterKey: true });
      post.increment('likesCount', 1);
      liked = true;
    }

    await post.save(null, { useMasterKey: true });

    return { liked, likesCount: post.get('likesCount') };
  },
  { requireUser: true }
);
