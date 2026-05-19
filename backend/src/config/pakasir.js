const { Pakasir } = require('pakasir-sdk');

/**
 * Daftar payment method yang tersedia beserta labelnya
 */
const PAYMENT_METHODS = {
  qris:            { label: 'QRIS',                fee_type: 'percent', fee: 0.7 },
  bni_va:          { label: 'BNI Virtual Account', fee_type: 'fixed',   fee: 3500 },
  bri_va:          { label: 'BRI Virtual Account', fee_type: 'fixed',   fee: 3500 },
  cimb_niaga_va:   { label: 'CIMB Niaga VA',       fee_type: 'fixed',   fee: 3500 },
  maybank_va:      { label: 'Maybank VA',           fee_type: 'fixed',   fee: 3500 },
  permata_va:      { label: 'Permata VA',           fee_type: 'fixed',   fee: 3500 },
  bnc_va:          { label: 'BNC VA',               fee_type: 'fixed',   fee: 3500 },
  atm_bersama_va:  { label: 'ATM Bersama VA',       fee_type: 'fixed',   fee: 3500 },
  sampoerna_va:    { label: 'Sampoerna VA',         fee_type: 'fixed',   fee: 2000 },
  artha_graha_va:  { label: 'Artha Graha VA',      fee_type: 'fixed',   fee: 2000 },
  paypal:          { label: 'PayPal',               fee_type: 'percent', fee: 1, min_fee: 3000 },
};

// ─── Lazy initialization: buat instance saat pertama dipakai ─
// Ini memastikan .env sudah di-load oleh dotenv di index.js
let _pakasirInstance = null;

function getPakasir() {
  if (!_pakasirInstance) {
    const slug   = process.env.PAKASIR_SLUG;
    const apikey = process.env.PAKASIR_API_KEY;

    if (!slug || !apikey) {
      throw new Error(
        'Pakasir config missing: PAKASIR_SLUG dan PAKASIR_API_KEY harus diset di .env'
      );
    }

    _pakasirInstance = new Pakasir({ slug, apikey });
    console.log(`✅ Pakasir initialized (slug: ${slug})`);
  }
  return _pakasirInstance;
}

// Getter proxy agar bisa dipakai seperti: pakasir.createPayment(...)
const pakasir = new Proxy({}, {
  get(_, prop) {
    const instance = getPakasir();
    const value = instance[prop];
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  }
});

module.exports = { pakasir, PAYMENT_METHODS, getPakasir };
