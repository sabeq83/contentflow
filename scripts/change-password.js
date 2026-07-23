const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, '../data/app.db');
const db = new Database(dbPath);

const username = process.argv[2] || 'admin';
const newPassword = process.argv[3];

if (!newPassword) {
  console.log('Penggunaan: node scripts/change-password.js <username> <password_baru>');
  console.log('Contoh   : node scripts/change-password.js admin password_baru123');
  process.exit(1);
}

const user = db.prepare('SELECT id, username FROM users WHERE username = ?').get(username);
if (!user) {
  console.error(`User '${username}' tidak ditemukan di database.`);
  process.exit(1);
}

const hashedPassword = bcrypt.hashSync(newPassword, 10);
db.prepare('UPDATE users SET hashed_password = ? WHERE id = ?').run(hashedPassword, user.id);

console.log(`✅ Password untuk user '${username}' berhasil diubah!`);
