const pool = require('./src/config/database');
pool.query("UPDATE users SET active_role = 'admin' WHERE email = 'admin@bookbekas.com'")
.then(() => {
    console.log("Admin active_role updated successfully");
    process.exit(0);
})
.catch(err => {
    console.error(err);
    process.exit(1);
});
