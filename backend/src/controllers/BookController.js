const BookModel = require('../models/BookModel');

class BookController {
  /**
   * GET /api/books/list
   * Get all books where is_available = true.
   */
  static async listAvailableBooks(req, res) {
    try {
      const books = await BookModel.findAllAvailable();
      res.json({
        success: true,
        message: 'Books retrieved successfully',
        data: books
      });
    } catch (err) {
      console.error('List Available Books Error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
}

module.exports = BookController;
