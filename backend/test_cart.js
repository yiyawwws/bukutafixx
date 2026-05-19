require('dotenv').config();
const mysql = require('mysql2/promise');

async function testCart() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'bookbekas_db',
    });
    
    const [books] = await connection.query('SELECT * FROM books LIMIT 1');
    if (books.length === 0) {
      console.log('No books found!');
      return;
    }
    
    const book = books[0];
    
    // Test exact query from the cart route
    const [result] = await connection.query(
      `INSERT INTO cart_items (user_id, book_id, quantity) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE quantity = LEAST(quantity + ?, ?)`,
      [2, book.id, 1, 1, book.stock]
    );
    console.log('Query result:', result);

    await connection.end();
  } catch (error) {
    console.error('Database connection failed:', error);
  }
}

testCart();
