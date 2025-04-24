const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || "sql5.freesqldatabase.com",
  user: process.env.DB_USER || "sql5774886",
  password: process.env.DB_PASS || "xClrmkRHqw",
  database: process.env.DB_NAME || "sql5774886",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const query = async (sql, values) => {
  console.log("\nExecuting SQL Query:", sql, "Values:", values);
  try {
    const [results] = await pool.execute(sql, values);
    console.log("SQL Query Success:", results);
    return results;
  } catch (err) {
    console.error("SQL Query Error:", err.message);
    throw err;
  }
};

module.exports = { pool, query };
