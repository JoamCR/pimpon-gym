require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { query, pool, isConfigured } = require('./lib/database');

const seedPath = path.join(__dirname, 'seed.sql');
const sql = fs.readFileSync(seedPath, 'utf8');

const runSeed = async () => {
  if (!isConfigured) {
    console.error('ERROR: DATABASE_URL no está configurado. Revisa tu archivo .env o las variables de entorno.');
    process.exit(1);
  }

  console.log('🚀 Iniciando seed de base de datos...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('✅ Seed completado correctamente.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error al ejecutar el seed:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

runSeed();
