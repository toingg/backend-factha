const mysql = require("mysql2");
require("dotenv").config();

// MySQL database configuration
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};

// Create a connection to the database
const connection = mysql.createConnection(dbConfig);

// Attempt to connect to the database
connection.connect(function (err) {
  if (err) {
    console.error("Error connecting to MySQL database:", err.stack);
    return;
  }
  console.log("Connected to MySQL database as id", connection.threadId);
});

// Close the connection after a short delay (for testing purposes)
setTimeout(() => {
  connection.end(function (err) {
    if (err) {
      console.error("Error closing MySQL connection:", err.stack);
      return;
    }
    console.log("MySQL connection closed");
  });
}, 5000); // Close the connection after 5 seconds (adjust as needed)