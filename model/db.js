const mysql = require("mysql2");
require("dotenv").config();

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
};

let pool;

async function initDB() {
  try {
    pool = mysql.createPool(dbConfig).promise();
    await pool.getConnection();
    console.log("Connected to Database");
  } catch (err) {
    console.error(" Database connection failed:", err.message);
    process.exit(1);
  }
}

initDB();

module.exports = pool;
