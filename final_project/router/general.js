const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
let books = require("./booksdb.js");
let isValid = require("./auth_users.js").isValid;
let users = require("./auth_users.js").users;
const public_users = express.Router();

const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

const apiBaseUrl = 'http://localhost:5000';

function getAllBooks(callback) {
  return axios.get(`${apiBaseUrl}/`)
    .then((response) => {
      if (typeof callback === 'function') {
        callback(null, response.data);
      }
      return response.data;
    })
    .catch((error) => {
      if (typeof callback === 'function') {
        callback(error, null);
      }
      throw error;
    });
}

function getBookByISBN(isbn, callback) {
  return axios.get(`${apiBaseUrl}/isbn/${encodeURIComponent(isbn)}`)
    .then((response) => {
      if (typeof callback === 'function') {
        callback(null, response.data);
      }
      return response.data;
    })
    .catch((error) => {
      if (typeof callback === 'function') {
        callback(error, null);
      }
      throw error;
    });
}

function getBooksByAuthor(author, callback) {
  return axios.get(`${apiBaseUrl}/author/${encodeURIComponent(author)}`)
    .then((response) => {
      if (typeof callback === 'function') {
        callback(null, response.data);
      }
      return response.data;
    })
    .catch((error) => {
      if (typeof callback === 'function') {
        callback(error, null);
      }
      throw error;
    });
}

function getBooksByTitle(title, callback) {
  return axios.get(`${apiBaseUrl}/title/${encodeURIComponent(title)}`)
    .then((response) => {
      if (typeof callback === 'function') {
        callback(null, response.data);
      }
      return response.data;
    })
    .catch((error) => {
      if (typeof callback === 'function') {
        callback(error, null);
      }
      throw error;
    });
}

async function getAllBooksAsync() {
  const response = await axios.get(`${apiBaseUrl}/`);
  return response.data;
}

async function getBookByISBNAsync(isbn) {
  const response = await axios.get(`${apiBaseUrl}/isbn/${encodeURIComponent(isbn)}`);
  return response.data;
}

async function getBooksByAuthorAsync(author) {
  const response = await axios.get(`${apiBaseUrl}/author/${encodeURIComponent(author)}`);
  return response.data;
}

async function getBooksByTitleAsync(title) {
  const response = await axios.get(`${apiBaseUrl}/title/${encodeURIComponent(title)}`);
  return response.data;
}

public_users.post("/register", (req,res) => {
  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  if (!isValid(username)) {
    return res.status(400).json({ message: 'Username must be at least 3 characters and contain only letters, numbers, or underscores' });
  }

  const duplicateUser = users.find((user) => user.username.toLowerCase() === username.toLowerCase());
  if (duplicateUser) {
    return res.status(409).json({ message: 'User already exists' });
  }

  users.push({ username, password: hashPassword(password) });
  return res.status(201).json({ message: 'User registered successfully' });
});

// Get the book list available in the shop
public_users.get('/', function (req, res) {
    return res.status(200).json(books);
});

// Get book details based on ISBN
public_users.get('/isbn/:isbn', function (req, res) {
    const isbn = req.params.isbn;

    if (!books[isbn]) {
        return res.status(404).json({
            message: "Book not found"
        });
    }

    return res.status(200).json(books[isbn]);
});

// Get book details based on author
public_users.get('/author/:author', function (req, res) {
    const author = decodeURIComponent(req.params.author || '').trim();

    const matchedBooks = Object.values(books).filter(book =>
        (book.author || '').toLowerCase() === author.toLowerCase()
    );

    return res.status(matchedBooks.length ? 200 : 404).json(matchedBooks.length ? matchedBooks : { message: 'No books found for this author' });
});

// Get all books based on title
public_users.get('/title/:title', function (req, res) {
    const title = decodeURIComponent(req.params.title || '').trim();

    const matchedBooks = Object.values(books).filter(book =>
        (book.title || '').toLowerCase().includes(title.toLowerCase())
    );

    return res.status(matchedBooks.length ? 200 : 404).json(matchedBooks.length ? matchedBooks : { message: 'No books found for this title' });
});

// Get book review
public_users.get('/review/:isbn', function (req, res) {
    const isbn = req.params.isbn;

    if (!books[isbn]) {
        return res.status(404).json({
            message: "Book not found"
        });
    }

    return res.status(200).json(books[isbn].reviews || {});
});

module.exports = public_users;
module.exports.general = public_users;
module.exports.getAllBooks = getAllBooks;
module.exports.getBookByISBN = getBookByISBN;
module.exports.getBooksByAuthor = getBooksByAuthor;
module.exports.getBooksByTitle = getBooksByTitle;
module.exports.getAllBooksAsync = getAllBooksAsync;
module.exports.getBookByISBNAsync = getBookByISBNAsync;
module.exports.getBooksByAuthorAsync = getBooksByAuthorAsync;
module.exports.getBooksByTitleAsync = getBooksByTitleAsync;