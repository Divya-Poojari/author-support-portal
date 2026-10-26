import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { loadDb, saveDb, closeDb } from './store.js';

try {
  const db = await loadDb();
  for (const user of db.users) {
    user.passwordHash = await bcrypt.hash(user.role === 'admin' ? 'Admin123!' : 'Author123!', 10);
  }
  await saveDb(db);
  console.log('Seeded demo credentials: admin@bookleaf.test / Admin123! and each author email / Author123!');
} finally {
  await closeDb();
}
