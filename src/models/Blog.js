const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    minlength: [3, 'Title must be at least 3 characters long'],
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  content: [{
    text: {
      type: String,
      required: [true, 'Content text is required']
    },
    image: {
      type: String,
      validate: {
        validator: function(v) {
          // Basic URL validation
          return !v || /^https?:\/\/.+\..+/.test(v);
        },
        message: 'Invalid image URL'
      }
    }
  }],
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Author is required']
  },
  category: {
    type: String,
    enum: {
      values: ['Nature', 'Wildlife', 'Household'],
      message: '{VALUE} is not a supported category'
    },
    required: [true, 'Category is required']
  },
  keywords: [{
    type: String,
    trim: true,
    maxlength: [30, 'Keyword cannot exceed 30 characters']
  }],
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'published'
  },
  views: {
    type: Number,
    default: 0
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for better search performance
blogSchema.index({ title: 'text', 'content.text': 'text' });

// Virtual for comment count
blogSchema.virtual('commentCount').get(function() {
  return this.comments.length;
});

// Virtual for like count
blogSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Pre-save middleware to sanitize content
blogSchema.pre('save', function(next) {
  if (this.isModified('content')) {
    this.content = this.content.map(item => ({
      ...item,
      text: item.text.trim()
    }));
  }
  next();
});

const Blog = mongoose.model('Blog', blogSchema);

module.exports = Blog;
