const pgp = require('pg-promise')();

const db = pgp({
    connectionString: 'postgresql://exampleuser:G3+Md427TNwB6Np9wUcNLM82EPX9fP8JMT@dpg-db0onn445d6rc7achtnq-a.oregon-postgres.render.com:5432/exampledb',
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    await db.none('ALTER TABLE Bets ADD COLUMN BetLine INT;');
    console.log('✅ BetLine column added successfully.');
  } catch (err) {
    console.error('❌ Error:', err.message || err);
  } finally {
    pgp.end();
  }
})();
