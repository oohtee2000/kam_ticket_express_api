const mysql = require('mysql2/promise');

// Debugging output to check if environment variables are being picked up correctly
console.log("DB Config:", {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD ? "[HIDDEN]" : "NOT SET",
  database: process.env.DB_NAME
});

const pool = mysql.createPool({
  host: process.env.DB_HOST || "sql5.freesqldatabase.com",
  user: process.env.DB_USER || "sql5777302",
  password: process.env.DB_PASSWORD || "PvHaPyRgTa", // <- FIXED HERE
  database: process.env.DB_NAME || "sql5777302",
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
