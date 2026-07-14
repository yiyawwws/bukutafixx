import React from 'react';
import Typography from '../components/atoms/Typography';

const About = () => {
  return (
    <div className="container" style={{ padding: '4rem 1rem', maxWidth: '800px', minHeight: '70vh' }}>
      <Typography variant="h2" weight="bold" style={{ marginBottom: '1.5rem' }}>Tentang Kami</Typography>
      <Typography variant="body" style={{ lineHeight: '1.8', color: 'var(--color-text-main)' }}>
        Bukuta adalah marketplace inovatif yang dirancang khusus untuk memfasilitasi transaksi jual beli buku, baik baru maupun bekas, di kalangan mahasiswa Indonesia. 
        <br /><br />
        Misi utama kami adalah mendukung akses pendidikan yang lebih terjangkau dengan mempertemukan penjual dan pembeli dalam satu platform yang aman, mudah, dan terpercaya. Melalui sistem verifikasi mahasiswa dan keamanan transaksi, Bukuta memastikan setiap pengguna mendapatkan pengalaman bertransaksi yang nyaman.
      </Typography>
    </div>
  );
};

export default About;
