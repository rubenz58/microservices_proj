
const express = require('express');
const csrf = require('csurf');
const { check, validationResult } = require('express-validator');
const axios = require('axios')

const db = require('./db/models');

const router = express.Router();

const csrfProtection = csrf({ cookie: true });

const asyncHandler = (handler) => (req, res, next) => handler(req, res, next).catch(next);

// Flask microservice URL
const FLASK_API_URL = 'http://host.docker.internal:5001';

router.get('/', asyncHandler(async (req, res) => {
  const books = await db.Book.findAll({ order: [['title', 'ASC']] });
  res.render('book-list', { title: 'Books', books });
}));

// Book show page route
router.get('/books/:id', async (req, res) => {
  const bookId = req.params.id;
  
  try {
      // Get book details from your main database
      const book = await db.Book.findByPk(bookId);
      if (!book) {
          return res.status(404).render('error', { message: 'Book not found' });
      }
      
      // Get ratings from Flask microservice
      let ratings = null;
      try {
          const ratingsResponse = await axios.get(`${FLASK_API_URL}/ratings/${bookId}`);
          ratings = ratingsResponse.data;
      } catch (error) {
          if (error.response && error.response.status === 404) {
              ratings = { average: 0, ratings: [] };
          } else {
              console.error('Error fetching ratings:', error.message);
              ratings = { average: 0, ratings: [] };
          }
      }
      
      res.render('book-show', { book, ratings });
  } catch (error) {
      console.error('Error:', error);
      res.status(500).render('error', { message: 'Server error' });
  }
});

// Create rating route
router.post('/books/:id/ratings', async (req, res) => {
  const bookId = req.params.id;
  const { value, email } = req.body;
  
  try {
      const response = await axios.post(`${FLASK_API_URL}/ratings/${bookId}`, null, {
          params: { value, email }
      });
      
      res.redirect(`/books/${bookId}`);
  } catch (error) {
      console.error('Error creating rating:', error.message);
      res.redirect(`/books/${bookId}?error=rating_failed`);
  }
});

router.get('/book/add', csrfProtection, (req, res) => {
  const book = db.Book.build();
  res.render('book-add', {
    title: 'Add Book',
    book,
    csrfToken: req.csrfToken(),
  });
});

const bookValidators = [
  check('title')
    .exists({ checkFalsy: true })
    .withMessage('Please provide a value for Title')
    .isLength({ max: 255 })
    .withMessage('Title must not be more than 255 characters long'),
  check('author')
    .exists({ checkFalsy: true })
    .withMessage('Please provide a value for Author')
    .isLength({ max: 100 })
    .withMessage('Author must not be more than 100 characters long'),
  check('releaseDate')
    .exists({ checkFalsy: true })
    .withMessage('Please provide a value for Release Date')
    .isISO8601()
    .withMessage('Please provide a valid date for Release Date'),
  check('pageCount')
    .exists({ checkFalsy: true })
    .withMessage('Please provide a value for Page Count')
    .isInt({ min: 0 })
    .withMessage('Please provide a valid integer for Page Count'),
  check('publisher')
    .exists({ checkFalsy: true })
    .withMessage('Please provide a value for Publisher')
    .isLength({ max: 100 })
    .withMessage('Publisher must not be more than 100 characters long'),
];

router.post('/book/add', csrfProtection, bookValidators,
  asyncHandler(async (req, res) => {
    const {
      title,
      author,
      releaseDate,
      pageCount,
      publisher,
    } = req.body;

    const book = db.Book.build({
      title,
      author,
      releaseDate,
      pageCount,
      publisher,
    });

    const validatorErrors = validationResult(req);

    if (validatorErrors.isEmpty()) {
      await book.save();
      res.redirect('/');
    } else {
      const errors = validatorErrors.array().map((error) => error.msg);
      res.render('book-add', {
        title: 'Add Book',
        book,
        errors,
        csrfToken: req.csrfToken(),
      });
    }
  }));

router.get('/book/edit/:id(\\d+)', csrfProtection,
  asyncHandler(async (req, res) => {
    const bookId = parseInt(req.params.id, 10);
    const book = await db.Book.findByPk(bookId);
    res.render('book-edit', {
      title: 'Edit Book',
      book,
      csrfToken: req.csrfToken(),
    });
  }));

router.post('/book/edit/:id(\\d+)', csrfProtection, bookValidators,
  asyncHandler(async (req, res) => {
    const bookId = parseInt(req.params.id, 10);
    const bookToUpdate = await db.Book.findByPk(bookId);

    const {
      title,
      author,
      releaseDate,
      pageCount,
      publisher,
    } = req.body;

    const book = {
      title,
      author,
      releaseDate,
      pageCount,
      publisher,
    };

    const validatorErrors = validationResult(req);

    if (validatorErrors.isEmpty()) {
      await bookToUpdate.update(book);
      res.redirect('/');
    } else {
      const errors = validatorErrors.array().map((error) => error.msg);
      res.render('book-edit', {
        title: 'Edit Book',
        book: { ...book, bookId },
        errors,
        csrfToken: req.csrfToken(),
      });
    }
  }));

router.get('/book/delete/:id(\\d+)', csrfProtection, asyncHandler(async (req, res) => {
  const bookId = parseInt(req.params.id, 10);
  const book = await db.Book.findByPk(bookId);
  res.render('book-delete', {
    title: 'Delete Book',
    book,
    csrfToken: req.csrfToken(),
  });
}));

router.post('/book/delete/:id(\\d+)', csrfProtection, asyncHandler(async (req, res) => {
  const bookId = parseInt(req.params.id, 10);
  const book = await db.Book.findByPk(bookId);
  await book.destroy();
  res.redirect('/');
}));

module.exports = router;
