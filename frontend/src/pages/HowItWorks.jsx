import React from 'react';
import Typography from '../components/atoms/Typography';

const HowItWorks = () => {
  return (
    <div className="container" style={{ padding: '4rem 1rem', maxWidth: '800px', minHeight: '70vh' }}>
      <Typography variant="h2" weight="bold" style={{ marginBottom: '1.5rem' }}>Cara Kerja</Typography>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div>
          <Typography variant="h5" weight="bold" style={{ marginBottom: '0.5rem' }}>1. Mendaftar & Verifikasi</Typography>
          <Typography variant="body" style={{ lineHeight: '1.6', color: 'var(--color-text-main)' }}>
            Buat akun baru di Bukuta sebagai pembeli. Jika Anda ingin mulai berjualan buku, Anda wajib melakukan verifikasi dengan mengunggah foto Kartu Tanda Mahasiswa (KTM) agar bisa beralih menjadi penjual.
          </Typography>
        </div>
        
        <div>
          <Typography variant="h5" weight="bold" style={{ marginBottom: '0.5rem' }}>2. Cari atau Jual Buku</Typography>
          <Typography variant="body" style={{ lineHeight: '1.6', color: 'var(--color-text-main)' }}>
            Pembeli dapat mencari buku kuliah yang dibutuhkan berdasarkan kategori, judul, atau ISBN. Penjual dapat mulai mengunggah foto buku, harga, dan deksripsi untuk dijual.
          </Typography>
        </div>

        <div>
          <Typography variant="h5" weight="bold" style={{ marginBottom: '0.5rem' }}>3. Transaksi Aman (Escrow)</Typography>
          <Typography variant="body" style={{ lineHeight: '1.6', color: 'var(--color-text-main)' }}>
            Pembeli melakukan pembayaran, namun uang tidak langsung masuk ke penjual melainkan ditahan oleh sistem (Saldo Hold). Penjual lalu mengirimkan buku. Setelah pembeli menerima buku dan mengonfirmasi pesanan, barulah saldo diteruskan ke penjual.
          </Typography>
        </div>

        <div>
          <Typography variant="h5" weight="bold" style={{ marginBottom: '0.5rem' }}>4. Penarikan Dana & Refund</Typography>
          <Typography variant="body" style={{ lineHeight: '1.6', color: 'var(--color-text-main)' }}>
            Penjual dapat mencairkan saldo hasil penjualan ke rekening bank mereka. Apabila terjadi komplain atau pesanan dibatalkan, pembeli juga dapat menarik kembali uangnya (Refund).
          </Typography>
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;
