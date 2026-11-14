const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
let books = require("./booksdb.js");
const regd_users = express.Router();

let users = [];
const SESSION_SECRET = process.env.SESSION_SECRET || 'fingerprint_customer';
const JWT_SECRET = process.env.JWT_SECRET || 'book-review-secret';

const sanitizeUsername = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const hashPassword = (password) => {
  if (typeof password !== 'string') {
    return '';
  }

  return crypto.createHash('sha256').update(password).digest('hex');
};

const isValid = (username) => {
  const cleanUsername = sanitizeUsername(username);

  return cleanUsername.length >= 3 && /^[a-zA-Z0-9_]+$/.test(cleanUsername);
};

const authenticatedUser = (username, password) => {
  const cleanUsername = sanitizeUsername(username);
  const storedUser = users.find((user) => user.username.toLowerCase() === cleanUsername.toLowerCase());

  if (!storedUser) {
    return false;
  }

  return storedUser.password === hashPassword(password);
};

const createToken = (username) => {
  return jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
};

//only registered users can login
regd_users.post("/login", (req,res) => {
  const username = sanitizeUsername(req.body && req.body.username);
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  if (!authenticatedUser(username, password)) {
    return res.status(401).json({ message: 'Invalid username or password' });
  }

  req.session.user = username;
  const token = createToken(username);

  return res.status(200).json({
    message: 'Login successful',
    token,
    username
  });
});

// Add a book review
regd_users.put("/auth/review/:isbn", (req, res) => {
  const isbn = req.params.isbn;
  const book = books[isbn];
  const username = req.user && req.user.username ? req.user.username : (req.session && req.session.user);
  const reviewText = typeof req.body?.review === 'string' ? req.body.review.trim() : '';

  if (!book) {
    return res.status(404).json({ message: 'Book not found' });
  }

  if (!username) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (!reviewText) {
    return res.status(400).json({ message: 'Review text is required' });
  }

  if (!book.reviews) {
    book.reviews = {};
  }

  const existingReview = book.reviews[username];
  if (existingReview) {
    existingReview.review = reviewText;
    return res.status(200).json({
      message: 'Review updated successfully',
      reviews: book.reviews
    });
  }

  book.reviews[username] = { review: reviewText };
  return res.status(201).json({
    message: 'Review added successfully',
    reviews: book.reviews
  });
});

regd_users.delete('/auth/review/:isbn', (req, res) => {
  const isbn = req.params.isbn;
  const book = books[isbn];
  const username = req.user && req.user.username ? req.user.username : (req.session && req.session.user);

  if (!book) {
    return res.status(404).json({ message: 'Book not found' });
  }

  if (!username) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (!book.reviews || !book.reviews[username]) {
    return res.status(404).json({ message: 'Review not found' });
  }

  delete book.reviews[username];
  return res.status(200).json({
    message: 'Review deleted successfully',
    reviews: book.reviews
  });
});

module.exports.authenticated = regd_users;
module.exports.isValid = isValid;
module.exports.users = users;
module.exports.authenticatedUser = authenticatedUser;
module.exports.hashPassword = hashPassword;
module.exports.createToken = createToken;
module.exports.sessionSecret = SESSION_SECRET;
