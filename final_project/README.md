# Online Book Review API

This project provides a small Express.js API for browsing books, creating users, logging in, and adding reviews.

## Run locally

1. In the project folder, install dependencies:
   npm install
2. Start the server:
   npm start
3. The app listens on port 5000.

## Authentication

- Session auth: `POST /customer/login` and then make protected requests with the `connect.sid` cookie.
- JWT auth: use the `token` returned by `POST /customer/login` in the `Authorization: Bearer <token>` header.

## Public APIs

- `GET /`
- `GET /isbn/:isbn`
- `GET /author/:author`
- `GET /title/:title`
- `GET /review/:isbn`

## Protected APIs

- `POST /customer/register`
- `POST /customer/login`
- `PUT /customer/auth/review/:isbn`
- `DELETE /customer/auth/review/:isbn`

## Test

Run:

npm test

The Node test suite covers public book lookup, user registration/login, protected review routes, and the async helper methods.