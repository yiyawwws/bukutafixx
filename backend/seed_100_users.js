const fs = require('fs');
const path = require('path');
require('dotenv').config();
const mysql = require('mysql2/promise');

const names = [
    'Ahmad', 'Budi', 'Citra', 'Dewi', 'Eko', 'Fajar', 'Gita', 'Hadi',
    'Intan', 'Joko', 'Kartika', 'Lukman', 'Maya', 'Nanda', 'Oki', 'Putri',
    'Qori', 'Rizky', 'Sari', 'Trio', 'Umar', 'Vina', 'Wahyu', 'Xena',
    'Yudi', 'Zara', 'Suryadi', 'Wibowo', 'Nugroho', 'Pratama', 'Santoso',
    'Wijaya', 'Kusuma', 'Lestari', 'Sari', 'Putra', 'Setiawan', 'Hidayat'
];

const univs = [
    'Universitas Indonesia', 'Institut Teknologi Bandung', 'Universitas Gadjah Mada', 
    'Universitas Airlangga', 'Institut Pertanian Bogor', 'Universitas Brawijaya', 
    'Universitas Diponegoro', 'Universitas Padjadjaran', 'Universitas Hasanuddin'
];

function generateRandomName() {
    const firstName = names[Math.floor(Math.random() * names.length)];
    const lastName = names[Math.floor(Math.random() * names.length)];
    return firstName !== lastName ? `${firstName} ${lastName}` : firstName;
}

async function seed() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'bookbekas_db',
            port: process.env.DB_PORT || 3306,
            multipleStatements: true
        });

        console.log('Connected to the database.');

        const password_hash = '$2b$10$VWP9YZnXNq7abItFEbH7vOK4lB.Q33sZOzzDzLUGdNgv3I36CxNTW'; // admin123
        let values = [];

        console.log('Generating 100 dummy users...');
        for (let i = 0; i < 100; i++) {
            const name = generateRandomName();
            const email = `newuser${Date.now()}_${i}@bookbekas.com`;
            const phone = `0812${Math.floor(10000000 + Math.random() * 90000000)}`;
            const address = `Jalan Baru No. ${Math.floor(Math.random() * 100)}, Jakarta`;
            const role = Math.random() < 0.5 ? 'buyer' : 'seller';
            const active_role = role;
            const nim = `12345${Math.floor(1000 + Math.random() * 9000)}`;
            const univ = univs[Math.floor(Math.random() * univs.length)];
            const is_verified = Math.random() < 0.5;
            
            values.push(`("${name}", "${email}", "${password_hash}", "${phone}", "${address}", "${role}", "${active_role}", TRUE, "${nim}", "${univ}", ${is_verified})`);
        }

        const query = `INSERT INTO users (name, email, password, phone, address, role, active_role, is_active, nim, university, is_verified) VALUES ${values.join(',')};`;
        await connection.query(query);

        console.log('Successfully inserted 100 dummy users into the database.');
        await connection.end();
    } catch (error) {
        console.error('Error executing seed script:', error);
    }
}

seed();
