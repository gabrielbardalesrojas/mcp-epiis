import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Logger } from '../utils/logger.js';

const logger = new Logger('Database');

// Ruta de la base de datos
const DB_PATH = path.join(process.cwd(), 'database', 'epiis.db');

// Asegurar que existe el directorio
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Crear instancia de la base de datos
let db = null;

/**
 * Obtener conexión a la base de datos
 */
export const getDatabase = () => {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    logger.info('Base de datos conectada:', DB_PATH);
  }
  return db;
};

/**
 * Inicializar esquema de base de datos
 */
export const initializeDatabase = () => {
  const database = getDatabase();

  // Tabla de documentos
  database.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      path TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL,
      content TEXT,
      size INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla de análisis
  database.exec(`
    CREATE TABLE IF NOT EXISTS analyses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER,
      analysis_type TEXT NOT NULL,
      result TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents(id)
    )
  `);

  // Tabla de generaciones
  database.exec(`
    CREATE TABLE IF NOT EXISTS generations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      input_data TEXT,
      output_content TEXT,
      output_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla de conversaciones (chat history)
  database.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla de usuarios (Google Auth)
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      google_id TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL,
      name TEXT,
      avatar_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla de sesiones WhatsApp por usuario
  database.exec(`
    CREATE TABLE IF NOT EXISTS whatsapp_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      session_data TEXT,
      status TEXT DEFAULT 'disconnected',
      phone_number TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Índices
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
    CREATE INDEX IF NOT EXISTS idx_conversations_session ON conversations(session_id);
    CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
    CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_user ON whatsapp_sessions(user_id);
  `);

  // Tabla de documentos pendientes de aprobación
  database.exec(`
    CREATE TABLE IF NOT EXISTS pending_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'general',
      size INTEGER DEFAULT 0,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT NOT NULL DEFAULT 'pending',
      reviewed_at DATETIME,
      reviewed_by TEXT
    )
  `);

  // Tabla de administradores
  database.exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT DEFAULT 'Administrador',
      email TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Índices para nuevas tablas
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_pending_status ON pending_documents(status);
    CREATE INDEX IF NOT EXISTS idx_admin_username ON admin_users(username);
  `);

  // Seed: crear admin por defecto si no existe
  const adminExists = database.prepare('SELECT id FROM admin_users WHERE username = ?').get('admin');
  if (!adminExists) {
    const hashedPassword = crypto.createHash('sha256').update('admin123').digest('hex');
    database.prepare(
      'INSERT INTO admin_users (username, password, name, email) VALUES (?, ?, ?, ?)'
    ).run('admin', hashedPassword, 'Administrador EPIIS', 'admin@epiis.unas.edu.pe');
    logger.info('Admin por defecto creado: admin / admin123');
  }
};

/**
 * Cerrar conexión
 */
export const closeDatabase = () => {
  if (db) {
    db.close();
    db = null;
    logger.info('Base de datos cerrada');
  }
};

export default {
  getDatabase,
  initializeDatabase,
  closeDatabase,
};
