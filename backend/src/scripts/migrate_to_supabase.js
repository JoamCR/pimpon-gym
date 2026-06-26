const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const LOCAL_DB = process.env.DATABASE_URL || 'postgresql://pimpon_dev:pimpon_dev_2026@localhost:5432/pimpon_gym';
const REMOTE_DB = process.env.SUPABASE_DB_URL;

if (!REMOTE_DB) {
  console.error('❌ Error: Por favor define la variable de entorno SUPABASE_DB_URL');
  console.log('Ejemplo: SUPABASE_DB_URL="postgresql://postgres.[project]:[password]@aws-0...pooler.supabase.com:6543/postgres" node src/scripts/migrate_to_supabase.js');
  process.exit(1);
}

const localPool = new Pool({ connectionString: LOCAL_DB });
// For supabase connection, we might need ssl: { rejectUnauthorized: false }
const remotePool = new Pool({
  connectionString: REMOTE_DB,
  ssl: { rejectUnauthorized: false }
});

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

async function run() {
  try {
    console.log('🚀 Iniciando migración a Supabase...');
    
    // 1. Crear el esquema
    console.log('\n📄 Aplicando schema.sql en Supabase...');
    const schemaPath = path.join(__dirname, '../../../schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    try {
      await remotePool.query(schemaSql);
      console.log('✅ Esquema aplicado correctamente.');
    } catch (e) {
      console.log('⚠️ Hubo advertencias o errores al aplicar el esquema (puede que ya exista). Error:', e.message);
    }

    // 2. Limpiar base de datos remota para evitar duplicados si ya tenía datos
    console.log('\n🧹 Limpiando tablas en Supabase...');
    // Se trunca en orden inverso para respetar las claves foráneas (foreign keys)
    for (let i = tablesInOrder.length - 1; i >= 0; i--) {
      const tableToTruncate = tablesInOrder[i];
      try {
        await remotePool.query(`TRUNCATE TABLE ${tableToTruncate} RESTART IDENTITY CASCADE`);
      } catch (e) {
        // Ignore if table doesn't exist
      }
    }

    // 3. Migrar datos tabla por tabla
    console.log('\n📦 Migrando datos...');
    for (const table of tablesInOrder) {
      console.log(`\n-> Procesando tabla: ${table}`);
      
      const resLocal = await localPool.query(`SELECT * FROM ${table}`);
      const rows = resLocal.rows;
      
      if (rows.length === 0) {
        console.log(`   Sin datos para migrar en ${table}.`);
        continue;
      }

      const colRes = await remotePool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = $1`, [table]);
      const validCols = colRes.rows.map(r => r.column_name);

      console.log(`   Migrando ${rows.length} registros...`);
      
      for (const row of rows) {
        const filteredRow = {};
        for (const [k, v] of Object.entries(row)) {
          if (validCols.includes(k)) {
            filteredRow[k] = v;
          }
        }

        const columns = Object.keys(filteredRow);
        const values = Object.values(filteredRow);
        
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
        
        try {
          await remotePool.query(query, values);
        } catch (err) {
          console.error(`   ❌ Error insertando fila en ${table}:`, err.message);
          console.error(`      Data:`, row);
        }
      }
      console.log(`   ✅ ${table} migrada.`);
    }

    console.log('\n🎉 Migración completada exitosamente.');
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Error fatal durante la migración:', error);
    process.exit(1);
  }
}

run();
