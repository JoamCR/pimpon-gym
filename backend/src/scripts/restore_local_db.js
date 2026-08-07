const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const LOCAL_DB = process.env.DATABASE_URL || 'postgresql://pimpon_dev:pimpon_dev_2026@localhost:5432/pimpon_gym';

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

async function restoreLocalDB() {
  const pool = new Pool({ connectionString: LOCAL_DB });

  try {
    console.log('🔌 Conectando a la base de datos local:', LOCAL_DB.replace(/:[^:@]+@/, ':****@'));
    
    // Buscar el archivo JSON de respaldo más reciente en backend/backups
    const backupDir = path.join(__dirname, '..', '..', 'backups');
    if (!fs.existsSync(backupDir)) {
      throw new Error(`No existe la carpeta de respaldos: ${backupDir}`);
    }

    const files = fs.readdirSync(backupDir).filter(f => f.startsWith('supabase_backup_') && f.endsWith('.json'));
    if (files.length === 0) {
      throw new Error('No se encontraron archivos .json de respaldo en backend/backups/');
    }

    // Ordenar por fecha descendente
    files.sort().reverse();
    const latestJsonFile = path.join(backupDir, files[0]);
    console.log(`📦 Cargando archivo de respaldo: ${files[0]}`);

    const backupData = JSON.parse(fs.readFileSync(latestJsonFile, 'utf-8'));

    // Truncar tablas en orden inverso para respetar llaves foráneas
    console.log('\n🧹 Limpiando datos previos en la base de datos local...');
    const tablesInReverse = [...tablesInOrder].reverse();
    for (const table of tablesInReverse) {
      try {
        await pool.query(`TRUNCATE TABLE "${table}" CASCADE`);
      } catch (e) {
        // Ignorar si la tabla no existe localmente aún
      }
    }

    console.log('\n📥 Insertando datos de Supabase en la base de datos local...');
    for (const table of tablesInOrder) {
      const rows = backupData[table];
      if (!rows || rows.length === 0) {
        console.log(`- Tabla ${table}: 0 registros.`);
        continue;
      }

      const cols = Object.keys(rows[0]).map(c => `"${c}"`).join(', ');
      
      let insertedCount = 0;
      for (const row of rows) {
        const vals = Object.values(row).map(escapeSQLValue).join(', ');
        const queryText = `INSERT INTO "${table}" (${cols}) VALUES (${vals}) ON CONFLICT DO NOTHING;`;
        try {
          await pool.query(queryText);
          insertedCount++;
        } catch (err) {
          console.warn(`⚠️ Error al insertar fila en ${table}:`, err.message);
        }
      }

      console.log(`✅ Tabla ${table}: ${insertedCount}/${rows.length} registros insertados.`);

      // Ajustar secuencia del id si existe
      try {
        const seqRes = await pool.query(`SELECT pg_get_serial_sequence('"${table}"', 'id') as seq`);
        const seqName = seqRes.rows[0]?.seq;
        if (seqName) {
          await pool.query(`SELECT setval('${seqName}', COALESCE((SELECT MAX(id) FROM "${table}"), 1), true)`);
        }
      } catch (e) {
        // No id or non-serial id
      }
    }

    console.log('\n🎉 ¡Base de datos local actualizada exitosamente desde el respaldo!');

  } catch (err) {
    console.error('❌ Error durante la restauración local:', err);
  } finally {
    await pool.end();
  }
}

restoreLocalDB();
