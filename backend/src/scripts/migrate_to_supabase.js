const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config();

const LOCAL_DB = process.env.DATABASE_URL || 'postgresql://pimpon_dev:pimpon_dev_2026@localhost:5432/pimpon_gym';
const REMOTE_DB = process.env.SUPABASE_DB_URL || 'postgresql://postgres.tuhzjjhbtmfzlnxanthl:pimpon_dev_2026@aws-1-us-east-1.pooler.supabase.com:6543/postgres';

// --- Medida de seguridad ---
if (process.env.NODE_ENV === 'production') {
  console.error('❌ Este script no debe ejecutarse en un entorno de producción (NODE_ENV=production).');
  process.exit(1);
}

if (!REMOTE_DB) {
  console.error('❌ Error: Por favor define la variable de entorno SUPABASE_DB_URL');
  console.log('Ejemplo: SUPABASE_DB_URL="postgresql://postgres.[project]:[password]@aws-0...pooler.supabase.com:6543/postgres" node src/scripts/migrate_to_supabase.js');
  process.exit(1);
}

const localPool = new Pool({ connectionString: LOCAL_DB });
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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query) => {
  return new Promise(resolve => rl.question(query, resolve));
};

async function run() {
  try {
    console.log('------------------------------------------------------------------');
    console.log('⚠️  ADVERTENCIA: Este script borrará y reemplazará los datos en la');
    console.log('    base de datos de Supabase configurada en SUPABASE_DB_URL.');
    console.log('------------------------------------------------------------------');
    
    const answer = await askQuestion('¿Estás seguro de que quieres continuar? (escribe "si" para proceder): ');
    if (answer.toLowerCase() !== 'si') {
      console.log('Operación cancelada.');
      process.exit(0);
    }
    rl.close();

    console.log('🚀 Iniciando migración a Supabase...');
    
    // 1. Crear el esquema usando seed.sql
    console.log('\n📄 Aplicando schema desde seed.sql en Supabase...');
    const schemaPath = path.join(__dirname, '../seed.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`No se encontró el archivo de esquema en: ${schemaPath}`);
    }
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    try {
      await remotePool.query(schemaSql);
      console.log('✅ Esquema aplicado correctamente.');
    } catch (e) {
      console.error('❌ Error al aplicar el esquema:', e.message);
      throw e;
    }

    // 2. Limpiar base de datos remota para evitar duplicados si ya tenía datos
    console.log('\n🧹 Limpiando tablas en Supabase...');
    for (let i = tablesInOrder.length - 1; i >= 0; i--) {
      const tableToTruncate = tablesInOrder[i];
      try {
        await remotePool.query(`TRUNCATE TABLE ${tableToTruncate} RESTART IDENTITY CASCADE`);
        console.log(`   - Tabla ${tableToTruncate} truncada.`);
      } catch (e) {
        console.warn(`   - No se pudo truncar ${tableToTruncate} (puede que no exista o esté vacía): ${e.message}`);
      }
    }

    // 3. Migrar datos tabla por tabla
    console.log('\n📦 Migrando datos...');
    for (const table of tablesInOrder) {
      console.log(`\n-> Procesando tabla: "${table}"`);
      
      let localRows;
      try {
        const resLocal = await localPool.query(`SELECT * FROM ${table}`);
        localRows = resLocal.rows;
      } catch (e) {
        console.warn(`   ⚠️ No se pudo leer de la tabla local "${table}". Saltando. Error: ${e.message}`);
        continue;
      }
      
      if (localRows.length === 0) {
        console.log(`   Sin datos para migrar en ${table}.`);
        continue;
      }

      let remoteCols;
      try {
        const colRes = await remotePool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND table_schema = 'public'`, [table]);
        remoteCols = colRes.rows.map(r => r.column_name);
      } catch (e) {
        console.warn(`   ⚠️ No se pudieron obtener las columnas de la tabla remota "${table}". Saltando. Error: ${e.message}`);
        continue;
      }

      console.log(`   Migrando ${localRows.length} registros...`);
      
      for (const row of localRows) {
        const filteredRow = {};
        const localCols = Object.keys(row);

        for (const [k, v] of Object.entries(row)) {
          if (remoteCols.includes(k)) {
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
          console.error(`      Fila con problemas:`, JSON.stringify(row).substring(0, 200));
        }
      }
      console.log(`   ✅ ${table} migrada.`);
    }

    console.log('\n🎉 Migración completada exitosamente.');
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Error fatal durante la migración:', error);
    if (rl) rl.close();
    process.exit(1);
  }
}

run();
