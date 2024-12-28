function setFlashMessages(req, res, next) {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  next();
}

function setUserInLocals(req, res, next) {
  res.locals.user = req.session.user || null;
  next();
}

function setIsAdmin(req, res, next) {
  res.locals.isAdmin = (user) => user && user.username === 'Admin';
  next();
}

function ensureAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  req.flash('error_msg', 'Please log in to view this resource.');
  res.redirect('/login');
}

module.exports = { setFlashMessages, setUserInLocals, setIsAdmin, ensureAuthenticated };
