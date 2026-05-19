const pool = require('./src/config/database');
pool.query("UPDATE users SET email = 'admin@bukuta.com' WHERE email = 'admin@bookbekas.com'")
.then(() => {
    console.log("Admin email updated successfully");
    process.exit(0);
})
.catch(err => {
    console.error(err);
    process.exit(1);
});
