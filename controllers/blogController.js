const Blog = require('../models/Blog');

async function createBlog(req, res) {
  try {
    const { title, blogContent, keywords, category } = req.body;
    
    const blogContentArray = Array.isArray(blogContent) ? blogContent : [blogContent];
    const blogImagesArray = req.files ? req.files.map(file => file.filename) : [];

    const blogContentWithImages = blogContentArray.map((content, index) => ({
      text: content,
      image: blogImagesArray[index] || ''
    }));

    const blog = new Blog({
      title,
      content: blogContentWithImages,
      author: req.session.user._id,
      category,
      keywords: keywords.split(',').map(keyword => keyword.trim())
    });

    await blog.save();
    req.flash('success_msg', 'Blog created successfully.');
    res.redirect('/');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error creating blog.');
    res.redirect('/blogs/new');
  }
}

async function editBlog(req, res) {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      req.flash('error_msg', 'Blog not found.');
      return res.redirect('/');
    }

    if (!blog.author.equals(req.session.user._id)) {
      req.flash('error_msg', 'Unauthorized access.');
      return res.redirect('/');
    }

    const { title, blogContent, keywords, category } = req.body;

    const blogContentArray = Array.isArray(blogContent) ? blogContent : [blogContent];
    const blogImagesArray = req.files ? req.files.map(file => file.filename) : [];

    const blogContentWithImages = blogContentArray.map((content, index) => ({
      text: content,
      image: blogImagesArray[index] || blog.content[index]?.image || ''
    }));

    blog.title = title;
    blog.content = blogContentWithImages;
    blog.category = category;
    blog.keywords = keywords.split(',').map(keyword => keyword.trim());

    await blog.save();
    req.flash('success_msg', 'Blog updated successfully.');
    res.redirect('/');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error updating blog.');
    res.redirect(`/blogs/edit/${req.params.id}`);
  }
}

async function deleteBlog(req, res) {
  const blog = await Blog.findById(req.params.id);

  if (!blog) {
    req.flash('error_msg', 'Blog not found.');
    return res.redirect('/');
  }

  if (!blog.author.equals(req.session.user._id) && req.session.user.username !== 'Admin') {
    req.flash('error_msg', 'Unauthorized access.');
    return res.redirect('/');
  }

  await blog.deleteOne();
  req.flash('success_msg', 'Blog deleted successfully.');
  res.redirect('/');
}

async function getBlog(req, res) {
  try {
    const blog = await Blog.findById(req.params.id).populate('author', 'username').populate({
      path: 'comments',
      populate: {
        path: 'author',
        select: 'username'
      }
    }).exec();

    if (!blog) {
      req.flash('error_msg', 'Blog not found.');
      return res.redirect('/');
    }

    res.render('show_blog', { blog });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error loading blog.');
    res.redirect('/');
  }
}

module.exports = { createBlog, editBlog, deleteBlog, getBlog };
