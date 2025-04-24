// server/db.js
const mysql = require('mysql2');
const dotenv = require('dotenv');
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

pool.on('connection', (connection) => {
  console.log('Connected to the database as thread id: ' + connection.threadId);
});

// Add error event listener to catch database connection issues
pool.on('error', (err) => {
  console.error('Database connection error:', err);
});

module.exports = pool.promise();
