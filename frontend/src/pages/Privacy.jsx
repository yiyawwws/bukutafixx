import React from 'react';
import Typography from '../components/atoms/Typography';

const Privacy = () => {
  return (
    <div className="container" style={{ padding: '4rem 1rem', maxWidth: '800px', minHeight: '70vh' }}>
      <Typography variant="h2" weight="bold" style={{ marginBottom: '1.5rem' }}>Kebijakan Privasi</Typography>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <Typography variant="body" style={{ lineHeight: '1.6', color: 'var(--color-text-main)' }}>
          Di Bukuta, privasi Anda adalah prioritas utama kami. Dokumen Kebijakan Privasi ini menguraikan jenis informasi pribadi yang diterima dan dikumpulkan oleh Bukuta dan bagaimana informasi tersebut digunakan.
        </Typography>

        <div>
          <Typography variant="h5" weight="bold" style={{ marginBottom: '0.5rem' }}>Pengumpulan Informasi</Typography>
          <Typography variant="body" style={{ lineHeight: '1.6', color: 'var(--color-text-main)' }}>
            Kami mengumpulkan informasi yang Anda berikan saat mendaftar, seperti nama, alamat email, nomor telepon, NIM, Universitas, dan foto dokumen verifikasi (KTM) bagi pengguna yang ingin menjadi penjual. Kami juga menyimpan data riwayat transaksi dan pesan.
          </Typography>
        </div>

        <div>
          <Typography variant="h5" weight="bold" style={{ marginBottom: '0.5rem' }}>Penggunaan Informasi</Typography>
          <Typography variant="body" style={{ lineHeight: '1.6', color: 'var(--color-text-main)' }}>
            Informasi Anda digunakan semata-mata untuk mengelola akun Anda, memfasilitasi transaksi jual beli buku, memverifikasi identitas pengguna (KTM), dan mencegah tindakan penipuan. Kami tidak akan pernah menjual atau menyewakan informasi pribadi Anda kepada pihak ketiga.
          </Typography>
        </div>
        
        <div>
          <Typography variant="h5" weight="bold" style={{ marginBottom: '0.5rem' }}>Keamanan Data</Typography>
          <Typography variant="body" style={{ lineHeight: '1.6', color: 'var(--color-text-main)' }}>
            Kami menerapkan berbagai langkah keamanan untuk menjaga keamanan informasi pribadi Anda. Dokumen penting seperti foto KTM akan disimpan secara aman dan hanya dapat diakses oleh admin untuk tujuan verifikasi.
          </Typography>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
