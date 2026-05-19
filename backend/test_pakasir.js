require('dotenv').config();
const { pakasir } = require('./src/config/pakasir');

async function test() {
  console.log('PAKASIR_SLUG:', process.env.PAKASIR_SLUG);
  console.log('PAKASIR_API_KEY:', process.env.PAKASIR_API_KEY ? process.env.PAKASIR_API_KEY.substring(0,8) + '...' : 'NOT SET');

  try {
    // Test dengan order ID unik
    const testOrderId = 'BKT-TEST-' + Date.now();
    console.log('Calling createPayment with order_id:', testOrderId);

    const result = await pakasir.createPayment(
      'qris',
      testOrderId,
      50000,
      'http://localhost:5173/buyer/orders'
    );
    console.log('SUCCESS:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('=== ERROR ===');
    console.error('Message:', err.message);
    if (err.response) {
      console.error('HTTP Status:', err.response.status);
      console.error('HTTP Data:', JSON.stringify(err.response.data, null, 2));
    } else {
      console.error('Stack:', err.stack ? err.stack.split('\n').slice(0,8).join('\n') : 'no stack');
    }
  }
}

test();
