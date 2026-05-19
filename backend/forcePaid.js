const pool = require('./src/config/database');

async function fix() {
  try {
    const [orders] = await pool.query('SELECT * FROM orders WHERE payment_status = ? ORDER BY id DESC LIMIT 1', ['pending']);
    if (orders.length > 0) {
      const o = orders[0];
      console.log('Found Pending Order:', o.id);
      
      // Update order status
      await pool.query(
        'UPDATE orders SET payment_status = ?, delivery_status = ? WHERE id = ?',
        ['paid', 'processing', o.id]
      );
      
      console.log('Order', o.id, 'forced to Paid and Processing');
    } else {
      console.log('No pending orders found.');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

fix();
