const { pool } = require('./src/lib/database');

(async () => {
  try {
    const sql = `
      SELECT
        CASE
          WHEN age IS NULL THEN 'Sin edad'
          WHEN age < 18 THEN '<18'
          WHEN age BETWEEN 18 AND 24 THEN '18-24'
          WHEN age BETWEEN 25 AND 34 THEN '25-34'
          WHEN age BETWEEN 35 AND 44 THEN '35-44'
          WHEN age BETWEEN 45 AND 54 THEN '45-54'
          ELSE '55+' END AS age_range,
        COUNT(*) as count
      FROM clients
      WHERE is_active = true
      GROUP BY age_range
      ORDER BY
        CASE
          WHEN age_range = 'Sin edad' THEN 1
          WHEN age_range = '<18' THEN 2
          WHEN age_range = '18-24' THEN 3
          WHEN age_range = '25-34' THEN 4
          WHEN age_range = '35-44' THEN 5
          WHEN age_range = '45-54' THEN 6
          ELSE 7 END
    `;
    const res = await pool.query(sql);
    console.log('OK', res.rows);
  } catch (err) {
    console.error('ERR', err);
  } finally {
    process.exit(0);
  }
})();
