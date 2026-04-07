import Database from 'better-sqlite3';
import crypto from 'crypto';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'database', 'epiis.db');

// ─── CONFIGURA AQUÍ TU NUEVA CONTRASEÑA ───
const NUEVA_CONTRASEÑA = 'admin123';
// ───────────────────────────────────────────

const db = new Database(DB_PATH);
const hashedPassword = crypto.createHash('sha256').update(NUEVA_CONTRASEÑA).digest('hex');

const result = db.prepare('UPDATE admin_users SET password = ? WHERE username = ?').run(hashedPassword, 'admin');

if (result.changes > 0) {
    console.log(`✅ Contraseña del admin reseteada exitosamente.`);
    console.log(`   Usuario: admin`);
    console.log(`   Nueva contraseña: ${NUEVA_CONTRASEÑA}`);
} else {
    console.log('⚠️ No se encontró el usuario admin. Creándolo...');
    db.prepare(
        'INSERT INTO admin_users (username, password, name, email) VALUES (?, ?, ?, ?)'
    ).run('admin', hashedPassword, 'Administrador EPIIS', 'admin@epiis.unas.edu.pe');
    console.log(`✅ Usuario admin creado con contraseña: ${NUEVA_CONTRASEÑA}`);
}

db.close();
