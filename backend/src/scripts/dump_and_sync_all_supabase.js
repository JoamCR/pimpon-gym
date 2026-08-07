const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const REMOTE_DB = process.env.SUPABASE_DB_URL;
const LOCAL_DB = process.env.DATABASE_URL;

if (!REMOTE_DB || !LOCAL_DB) {
  console.error('❌ Error: Se requieren las variables SUPABASE_DB_URL y DATABASE_URL en backend/.env');
  process.exit(1);
}

function escapeSQLValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return val;
  if (val instanceof Date) return `'${val.toISOString()}'`;
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

function mapDataType(col) {
  const dt = col.data_type.toLowerCase();
  const udt = col.udt_name.toLowerCase();
  
  if (dt === 'array' || udt.startsWith('_')) {
    return 'text[]';
  }
  if (dt === 'user-defined') {
    return udt;
  }
  if (dt === 'character varying') {
    return col.character_maximum_length ? `VARCHAR(${col.character_maximum_length})` : 'VARCHAR(255)';
  }
  if (dt === 'timestamp with time zone' || udt === 'timestamptz') {
    return 'TIMESTAMPTZ';
  }
  if (dt === 'timestamp without time zone' || udt === 'timestamp') {
    return 'TIMESTAMP';
  }
  if (dt === 'json' || dt === 'jsonb') {
    return 'JSONB';
  }
  if (dt === 'bigint') return 'BIGINT';
  if (dt === 'integer') return 'INTEGER';
  if (dt === 'smallint') return 'SMALLINT';
  if (dt === 'numeric') return 'NUMERIC';
  if (dt === 'boolean') return 'BOOLEAN';
  if (dt === 'text') return 'TEXT';
  if (dt === 'uuid') return 'UUID';
  if (dt === 'date') return 'DATE';
  
  return udt.toUpperCase() || 'TEXT';
}

async function dumpAndSyncAll() {
  const remotePool = new Pool({
    connectionString: REMOTE_DB,
    ssl: { rejectUnauthorized: false }
  });

  const localPool = new Pool({
    connectionString: LOCAL_DB
  });

  try {
    console.log('🔍 Conectando a Supabase para descubrir TODAS las tablas y esquemas...');
    
    // 1. Obtener la lista completa de tablas en el esquema public
    const tablesRes = await remotePool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE' 
      ORDER BY table_name
    `);

    const preferredOrder = [
      'app_users',
      'plans',
      'patients',
      'clients',
      'subscriptions',
      'payments',
      'transfer_control',
      'attendance',
      'nutrition_records',
      'exercise_plans',
      'expenses',
      'promotions',
      'notifications',
      'agenda',
      'audit_log',
      'app_config'
    ];

    const rawTables = tablesRes.rows.map(r => r.table_name);
    const allTables = rawTables.sort((a, b) => {
      const idxA = preferredOrder.indexOf(a);
      const idxB = preferredOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    console.log(`📋 Se encontraron ${allTables.length} tablas en Supabase (ordenadas por dependencia):`, allTables.join(', '));

    // 2. Extraer esquemas y columnas para cada tabla
    const tableSchemas = {};
    const fullDump = {};
    let fullSqlDump = `-- -----------------------------------------------------------------------------\n`;
    fullSqlDump += `-- RESPALDO COMPLETO DE SUPABASE (ESQUEMA Y DATOS)\n`;
    fullSqlDump += `-- FECHA: ${new Date().toISOString()}\n`;
    fullSqlDump += `-- -----------------------------------------------------------------------------\n\n`;

    for (const table of allTables) {
      // Obtener columnas de la tabla
      const colsRes = await remotePool.query(`
        SELECT column_name, data_type, udt_name, is_nullable, column_default, character_maximum_length
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [table]);

      tableSchemas[table] = colsRes.rows;

      // Obtener datos
      const dataRes = await remotePool.query(`SELECT * FROM "${table}"`);
      fullDump[table] = dataRes.rows;

      console.log(`📦 Tabla "${table}": ${colsRes.rows.length} columnas, ${dataRes.rows.length} registros extraídos.`);

      // Generar SQL DDL
      fullSqlDump += `-- Esquema para la tabla "${table}"\n`;
      const colDefs = colsRes.rows.map(col => {
        let def = `  "${col.column_name}" ${mapDataType(col)}`;
        if (col.is_nullable === 'NO') def += ' NOT NULL';
        if (col.column_default && !col.column_default.includes('nextval')) {
          def += ` DEFAULT ${col.column_default}`;
        }
        return def;
      });

      fullSqlDump += `CREATE TABLE IF NOT EXISTS "${table}" (\n${colDefs.join(',\n')}\n);\n\n`;

      if (dataRes.rows.length > 0) {
        fullSqlDump += `-- Datos para "${table}"\n`;
        const colsList = colsRes.rows.map(c => `"${c.column_name}"`).join(', ');
        for (const row of dataRes.rows) {
          const valsList = colsRes.rows.map(c => escapeSQLValue(row[c.column_name])).join(', ');
          fullSqlDump += `INSERT INTO "${table}" (${colsList}) VALUES (${valsList}) ON CONFLICT DO NOTHING;\n`;
        }
        fullSqlDump += `\n`;
      }
    }

    // 3. Guardar archivos de respaldo localmente
    const backupDir = path.join(__dirname, '..', '..', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const sqlFilePath = path.join(backupDir, `supabase_backup_complete_${todayStr}.sql`);
    const jsonFilePath = path.join(backupDir, `supabase_backup_complete_${todayStr}.json`);

    fs.writeFileSync(sqlFilePath, fullSqlDump, 'utf-8');
    fs.writeFileSync(jsonFilePath, JSON.stringify({ tables: allTables, schemas: tableSchemas, data: fullDump }, null, 2), 'utf-8');

    console.log('\n💾 Archivos de respaldo guardados localmente:');
    console.log(`- SQL Completo: ${sqlFilePath}`);
    console.log(`- JSON Completo: ${jsonFilePath}`);

    // 4. Sincronizar esquemas en la base de datos local
    console.log('\n🛠️ Sincronizando esquemas (creando tablas y columnas faltantes) en la BD local...');
    
    for (const table of allTables) {
      const cols = tableSchemas[table];
      
      // Crear la tabla si no existe
      const colDefs = cols.map(col => {
        let def = `"${col.column_name}" ${mapDataType(col)}`;
        if (col.column_name === 'id') def += ' PRIMARY KEY';
        return def;
      });
      
      const createTableQuery = `CREATE TABLE IF NOT EXISTS "${table}" (\n  ${colDefs.join(',\n  ')}\n);`;
      try {
        await localPool.query(createTableQuery);
      } catch (err) {
        console.warn(`Advertencia al crear tabla local ${table}:`, err.message);
      }

      // Agregar columnas faltantes en la BD local si la tabla ya existía
      for (const col of cols) {
        try {
          const addColQuery = `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${col.column_name}" ${mapDataType(col)};`;
          await localPool.query(addColQuery);
        } catch (err) {
          // Ignorar pequeños descalces de tipos si la columna ya existe
        }
      }
    }

    // 5. Truncar e insertar todos los datos en la BD local
    console.log('\n🧹 Limpiando y poblando la base de datos local con la información actualizada...');
    
    // Limpiar tablas en orden inverso para evitar violaciones de llaves foráneas
    const tablesInReverse = [...allTables].reverse();
    for (const table of tablesInReverse) {
      try {
        await localPool.query(`TRUNCATE TABLE "${table}" CASCADE;`);
      } catch (e) {}
    }

    for (const table of allTables) {
      try {
        await localPool.query(`ALTER TABLE "${table}" DISABLE TRIGGER ALL;`);
      } catch (e) {}
    }

    for (const table of allTables) {
      const rows = fullDump[table];
      const cols = tableSchemas[table];

      if (rows && rows.length > 0) {
        const colsList = cols.map(c => `"${c.column_name}"`).join(', ');
        let count = 0;
        for (const row of rows) {
          const valsList = cols.map(c => escapeSQLValue(row[c.column_name])).join(', ');
          const insertSql = `INSERT INTO "${table}" (${colsList}) VALUES (${valsList}) ON CONFLICT DO NOTHING;`;
          try {
            await localPool.query(insertSql);
            count++;
          } catch (err) {
            console.warn(`⚠️ Error al insertar fila en ${table} local:`, err.message);
          }
        }
        console.log(`✅ BD Local "${table}": ${count}/${rows.length} registros insertados.`);
      } else {
        console.log(`- BD Local "${table}": 0 registros.`);
      }

      // Ajustar secuencias de ID
      try {
        const seqRes = await localPool.query(`SELECT pg_get_serial_sequence('"${table}"', 'id') as seq`);
        const seqName = seqRes.rows[0]?.seq;
        if (seqName) {
          await localPool.query(`SELECT setval('${seqName}', COALESCE((SELECT MAX(id) FROM "${table}"), 1), true)`);
        }
      } catch (e) {}
    }

    for (const table of allTables) {
      try {
        await localPool.query(`ALTER TABLE "${table}" ENABLE TRIGGER ALL;`);
      } catch (e) {}
    }

    console.log('\n🚀 ¡Sincronización y respaldo completo finalizado con éxito!');

  } catch (err) {
    console.error('❌ Error durante la sincronización completa:', err);
  } finally {
    await remotePool.end();
    await localPool.end();
  }
}

dumpAndSyncAll();
