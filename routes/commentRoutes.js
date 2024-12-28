const express = require('express');
const router = express.Router();
const { addComment, editComment, deleteComment } = require('../controllers/commentController');
const { ensureAuthenticated } = require('../middlewares/middleware');

router.post('/blogs/:id/comments', ensureAuthenticated, addComment);
router.post('/comments/edit/:id', ensureAuthenticated, editComment);
router.post('/comments/delete/:id', ensureAuthenticated, deleteComment);

module.exports = router;
