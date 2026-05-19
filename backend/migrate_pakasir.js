require('dotenv').config();
const pool = require('./src/config/database');

async function migrate() {
  const conn = await pool.getConnection();
  try {
    const columns = [
      { name: 'pakasir_order_id',  def: 'VARCHAR(100) DEFAULT NULL' },
      { name: 'payment_method',    def: 'VARCHAR(50) DEFAULT NULL' },
      { name: 'payment_fee',       def: 'DECIMAL(10,2) DEFAULT NULL' },
      { name: 'payment_total',     def: 'DECIMAL(12,2) DEFAULT NULL' },
      { name: 'payment_url',       def: 'VARCHAR(500) DEFAULT NULL' },
      { name: 'payment_number',    def: 'VARCHAR(100) DEFAULT NULL' },
      { name: 'payment_expired_at', def: 'TIMESTAMP NULL DEFAULT NULL' },
    ];

    for (const col of columns) {
      try {
        await conn.query(`ALTER TABLE orders ADD COLUMN ${col.name} ${col.def}`);
        console.log('[ADDED   ]', col.name);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log('[SKIP    ]', col.name, '(sudah ada)');
        } else {
          throw err;
        }
      }
    }

    try {
      await conn.query('CREATE INDEX idx_orders_pakasir ON orders(pakasir_order_id)');
      console.log('[INDEX   ] pakasir_order_id index dibuat');
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log('[SKIP    ] index sudah ada');
      } else {
        throw err;
      }
    }

    console.log('\n✅ Migration Pakasir selesai!');
  } catch (err) {
    console.error('❌ Migration error:', err.message);
    process.exit(1);
  } finally {
    conn.release();
    process.exit(0);
  }
}

migrate();
