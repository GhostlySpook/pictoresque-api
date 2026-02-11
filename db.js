//const mssql = require('mssql');

require('dotenv').config();

const dbConfig = {
    user: process.env.SQL_USERNAME,
    password: process.env.SQL_PASSWORD,
    server: process.env.SQL_SERVER, // e.g., 'myserver.database.windows.net'
    database: process.env.SQL_DATABASE,
    options: {
        encrypt: true // Use encryption for secure connection
    } 
};

module.exports = dbConfig;