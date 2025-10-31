// Usamos 'mysql2/promise' para poder usar async/await (más moderno)
const mysql = require('mysql2/promise');

// Cargamos las variables de entorno del archivo .env
require('dotenv').config();

// Creamos un "pool" de conexiones.
// Un pool es más eficiente que crear una conexión por cada consulta.
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Exportamos el pool para que otros archivos (nuestras rutas) puedan usarlo
module.exports = pool;