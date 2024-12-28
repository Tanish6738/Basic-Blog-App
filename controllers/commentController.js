const Comment = require('../models/Comment');
const Blog = require('../models/Blog');

async function addComment(req, res) {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      req.flash('error_msg', 'Blog not found.');
      return res.redirect('/');
    }

    const comment = new Comment({
      text: req.body.text,
      author: req.session.user._id,
      blog: blog._id
    });

    await comment.save();
    blog.comments.push(comment._id);
    await blog.save();

    req.flash('success_msg', 'Comment added successfully.');
    res.redirect(`/blogs/${blog._id}`);
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error adding comment.');
    res.redirect(`/blogs/${req.params.id}`);
  }
}

async function editComment(req, res) {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      req.flash('error_msg', 'Comment not found.');
      return res.redirect('back');
    }

    if (!comment.author.equals(req.session.user._id) && req.session.user.username !== 'Admin') {
      req.flash('error_msg', 'Unauthorized access.');
      return res.redirect('back');
    }

    comment.text = req.body.text;
    await comment.save();

    req.flash('success_msg', 'Comment edited successfully.');
    res.redirect(`/blogs/${comment.blog}`);
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error editing comment.');
    res.redirect('back');
  }
}

async function deleteComment(req, res) {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      req.flash('error_msg', 'Comment not found.');
      return res.redirect('back');
    }

    if (!comment.author.equals(req.session.user._id) && req.session.user.username !== 'Admin') {
      req.flash('error_msg', 'Unauthorized access.');
      return res.redirect('back');
    }

    await Comment.findByIdAndDelete(req.params.id);
    req.flash('success_msg', 'Comment deleted successfully.');
    res.redirect(`/blogs/${comment.blog}`);
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error deleting comment.');
    res.redirect('back');
  }
}

module.exports = { addComment, editComment, deleteComment };
