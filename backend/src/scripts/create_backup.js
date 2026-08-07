const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const REMOTE_DB = process.env.SUPABASE_DB_URL;

if (!REMOTE_DB) {
  console.error('❌ Error: Se requiere la variable SUPABASE_DB_URL en backend/.env');
  process.exit(1);
}

const tablesInOrder = [
  'app_users',
  'plans',
  'clients',
  'patients',
  'subscriptions',
  'payments',
  'transfer_control',
  'attendance',
  'nutrition_records',
  'exercise_plans',
  'promotions',
  'notifications',
  'agenda',
  'audit_log'
];

function escapeSQLValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return val;
  if (val instanceof Date) return `'${val.toISOString()}'`;
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

async function exportBackup() {
  const pool = new Pool({
    connectionString: REMOTE_DB,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Conectando a Supabase para realizar respaldo...');
    const backupDir = path.join(__dirname, '..', '..', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const sqlFilePath = path.join(backupDir, `supabase_backup_${todayStr}.sql`);
    const jsonFilePath = path.join(backupDir, `supabase_backup_${todayStr}.json`);

    let sqlContent = `-- -----------------------------------------------------------------------------\n`;
    sqlContent += `-- RESPALDO BASE DE DATOS SUPABASE - PIMPON GYM\n`;
    sqlContent += `-- FECHA: ${new Date().toISOString()}\n`;
    sqlContent += `-- -----------------------------------------------------------------------------\n\n`;

    const fullDump = {};

    for (const table of tablesInOrder) {
      try {
        const { rows } = await pool.query(`SELECT * FROM "${table}"`);
        fullDump[table] = rows;
        console.log(`- Tabla ${table}: ${rows.length} registros extraídos.`);

        if (rows.length > 0) {
          sqlContent += `-- Datos para la tabla: ${table}\n`;
          const cols = Object.keys(rows[0]).map(c => `"${c}"`).join(', ');

          for (const row of rows) {
            const vals = Object.values(row).map(escapeSQLValue).join(', ');
            sqlContent += `INSERT INTO "${table}" (${cols}) VALUES (${vals}) ON CONFLICT DO NOTHING;\n`;
          }
          sqlContent += `\n`;
        }
      } catch (err) {
        console.warn(`Advertencia al extraer tabla ${table}:`, err.message);
      }
    }

    fs.writeFileSync(sqlFilePath, sqlContent, 'utf-8');
    fs.writeFileSync(jsonFilePath, JSON.stringify(fullDump, null, 2), 'utf-8');

    console.log('\n✅ Respaldo creado exitosamente:');
    console.log(`- SQL: ${sqlFilePath}`);
    console.log(`- JSON: ${jsonFilePath}`);

  } catch (err) {
    console.error('Error durante la creación del respaldo:', err);
  } finally {
    await pool.end();
  }
}

exportBackup();
