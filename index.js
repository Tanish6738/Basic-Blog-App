const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cookieParser = require('cookie-parser');
const flash = require('connect-flash');
const path = require('path');
const app = express();
const { createAdminUser } = require('./controllers/adminController');
const userRoutes = require('./routes/userRoutes');
const blogRoutes = require('./routes/blogRoutes');
const commentRoutes = require('./routes/commentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { setFlashMessages, setUserInLocals, setIsAdmin } = require('./middlewares/middleware');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/myapp', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: 'mongodb://localhost:27017/myapp' }),
  cookie: { maxAge: 180 * 60 * 1000 }
}));
app.use(flash());
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to set flash messages and user in locals
app.use(setFlashMessages);
app.use(setUserInLocals);
app.use(setIsAdmin);

// Call the function to create admin user on server start
createAdminUser();

// Routes
app.use('/', userRoutes);
app.use('/blogs', blogRoutes);
app.use('/comments', commentRoutes);
app.use('/admin', adminRoutes);

app.listen(3000, () => {
  console.log('Server started on port 3000');
});
