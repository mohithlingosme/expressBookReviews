const express = require('express');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const customer_routes = require('./router/auth_users.js').authenticated;
const genl_routes = require('./router/general.js');

const app = express();
const PORT = 5000;

app.use(express.json());

app.use('/customer', session({
  secret: process.env.SESSION_SECRET || 'fingerprint_customer',
  resave: true,
  saveUninitialized: true
}));

app.use('/customer/auth/*', function auth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'book-review-secret');
      req.user = decoded;
      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
  }

  if (req.session && req.session.user) {
    req.user = { username: req.session.user };
    return next();
  }

  return res.status(401).json({ message: 'Authentication required' });
});

app.use('/customer', customer_routes);
app.use('/customer', genl_routes);
app.use('/', genl_routes);

if (require.main === module) {
  app.listen(PORT, () => console.log('Server is running on port 5000'));
}

module.exports = app;
