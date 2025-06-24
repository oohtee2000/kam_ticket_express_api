const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ticket',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const query = async (sql, values) => {
  console.log("\nExecuting SQL Query:", sql, "Values:", values);
  try {
    let results;
    if (values !== undefined) {
      [results] = await pool.execute(sql, values);
    } else {
      [results] = await pool.execute(sql);
    }
    console.log("SQL Query Success:", results);
    return results;
  } catch (err) {
    console.error("SQL Query Error:", err.message);
    throw err;
  }
};

module.exports = { pool, query };
