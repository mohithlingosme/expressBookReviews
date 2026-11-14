const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const app = require('../index.js');

let server;
let sessionCookie;
let jwtToken;

before(async () => {
  server = app.listen(5000);
  await once(server, 'listening');
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

async function request(path, options = {}) {
  const { headers = {}, ...rest } = options;
  const response = await fetch(`http://localhost:5000${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  return { response, data };
}

function getHeadersWithSession(extra = {}) {
  return {
    ...extra,
    Cookie: sessionCookie || ''
  };
}

test('GET / returns all books', async () => {
  const { response, data } = await request('/');
  assert.equal(response.status, 200);
  assert.ok(data[1]);
  assert.equal(data[1].title, 'Things Fall Apart');
});

test('GET /isbn/:isbn returns a valid book', async () => {
  const { response, data } = await request('/isbn/1');
  assert.equal(response.status, 200);
  assert.equal(data.author, 'Chinua Achebe');
});

test('GET /isbn/:isbn returns 404 for unknown ISBN', async () => {
  const { response, data } = await request('/isbn/999');
  assert.equal(response.status, 404);
  assert.equal(data.message, 'Book not found');
});

test('GET /author/:author matches author case-insensitively', async () => {
  const { response, data } = await request('/author/chinua%20achebe');
  assert.equal(response.status, 200);
  assert.equal(Array.isArray(data), true);
  assert.equal(data[0].title, 'Things Fall Apart');
});

test('GET /title/:title matches title with spaces', async () => {
  const { response, data } = await request('/title/Pride%20and%20Prejudice');
  assert.equal(response.status, 200);
  assert.equal(data[0].title, 'Pride and Prejudice');
});

test('GET /review/:isbn returns reviews for a book', async () => {
  const { response, data } = await request('/review/1');
  assert.equal(response.status, 200);
  assert.deepEqual(data, {});
});

test('registers a valid new user', async () => {
  const { response, data } = await request('/customer/register', {
    method: 'POST',
    body: JSON.stringify({ username: 'alice123', password: 'secretpass' })
  });
  assert.equal(response.status, 201);
  assert.equal(data.message, 'User registered successfully');
});

test('rejects duplicate usernames', async () => {
  const { response, data } = await request('/customer/register', {
    method: 'POST',
    body: JSON.stringify({ username: 'alice123', password: 'anotherpass' })
  });
  assert.equal(response.status, 409);
  assert.equal(data.message, 'User already exists');
});

test('rejects incomplete registration data', async () => {
  const { response, data } = await request('/customer/register', {
    method: 'POST',
    body: JSON.stringify({ username: 'ab' })
  });
  assert.equal(response.status, 400);
  assert.ok(data.message);
});

test('logs in with valid credentials and creates a session', async () => {
  const result = await request('/customer/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'alice123', password: 'secretpass' })
  });

  sessionCookie = result.response.headers.get('set-cookie')?.split(';')[0] || 'sessionId=test';
  assert.equal(result.response.status, 200);
  assert.equal(result.data.message, 'Login successful');
  assert.ok(result.data.token);
  jwtToken = result.data.token;
});

test('rejects invalid login credentials', async () => {
  const { response, data } = await request('/customer/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'alice123', password: 'wrongpass' })
  });
  assert.equal(response.status, 401);
  assert.equal(data.message, 'Invalid username or password');
});

test('accepts valid JWT on protected route', async () => {
  const { response, data } = await request('/customer/auth/review/1', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${jwtToken}`
    },
    body: JSON.stringify({ review: 'Excellent classic.' })
  });

  assert.equal(response.status, 201);
  assert.equal(data.message, 'Review added successfully');
});

test('rejects missing or invalid authentication on protected route', async () => {
  const { response, data } = await request('/customer/auth/review/1', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ review: 'Should fail' })
  });

  assert.equal(response.status, 401);
  assert.equal(data.message, 'Authentication required');
});

test('supports session-based review update', async () => {
  const sessionLogin = await request('/customer/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'alice123', password: 'secretpass' })
  });

  const cookie = sessionLogin.response.headers.get('set-cookie')?.split(';')[0] || 'connect.sid=invalid';

  const { response, data } = await request('/customer/auth/review/1', {
    method: 'PUT',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ review: 'Updated via session' })
  });

  assert.equal(response.status, 200);
  assert.equal(data.message, 'Review updated successfully');
  assert.equal(data.reviews.alice123.review, 'Updated via session');
});

test('allows a user to delete their own review', async () => {
  const { response, data } = await request('/customer/auth/review/1', {
    method: 'DELETE',
    headers: getHeadersWithSession({
      'Content-Type': 'application/json'
    })
  });

  assert.equal(response.status, 200);
  assert.equal(data.message, 'Review deleted successfully');
});

test('supports async helper methods', async () => {
  const general = require('../router/general.js');
  const booksPromise = await general.getAllBooks();
  const allBooks = await general.getAllBooksAsync();
  const titleBooks = await general.getBooksByTitleAsync('Pride and Prejudice');
  const authorBooks = await general.getBooksByAuthorAsync('Jane Austen');
  const isbnBook = await general.getBookByISBNAsync(8);

  assert.ok(booksPromise[8]);
  assert.ok(allBooks[8]);
  assert.equal(titleBooks[0].title, 'Pride and Prejudice');
  assert.equal(authorBooks[0].author, 'Jane Austen');
  assert.equal(isbnBook.title, 'Pride and Prejudice');
});
