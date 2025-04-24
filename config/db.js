const mysql = require("mysql");

const db = mysql.createConnection({
  host: process.env.DB_HOST || "sql5.freesqldatabase.com",
  user: process.env.DB_USER || "sql5774886",
  password: process.env.DB_PASS || "xClrmkRHqw",
  database: process.env.DB_NAME || "sql5774886",
});

db.connect((err) => {
  if (err) {
    console.error("Database connection error:", err.message);
    process.exit(1); // Exit process if DB connection fails
  } else {
    console.log("✅ Connected to MySQL database");
  }
});

// Promisified query function with better logging
const query = (sql, values) => {
  return new Promise((resolve, reject) => {
    console.log("\nExecuting SQL Query:", sql, "Values:", values);
    db.query(sql, values, (err, results) => {
      if (err) {
        console.error("SQL Query Error:", err.message);
        reject(err);
      } else {
        console.log("SQL Query Success:", results);
        resolve(results);
      }
    });
  });
};

module.exports = { db, query };