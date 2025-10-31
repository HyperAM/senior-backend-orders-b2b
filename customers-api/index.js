// Cargar variables de entorno
require('dotenv').config();
console.log('🔑 SECRETO CARGADO:', process.env.SERVICE_TOKEN_SECRET); // <-- El chismoso

// Importar librerías
const express = require('express');
const pool = require('./db'); 
const { createCustomerSchema } = require('./customer.validator'); 
const verifyServiceToken = require('./auth.middleware');
const jwt = require('jsonwebtoken'); // <-- ¡NUEVA IMPORTACIÓN!

// Crear la aplicación de Express
const app = express();
const port = process.env.PORT || 3001;

// Middleware para que Express entienda JSON
app.use(express.json());

// --- RUTAS DE NUESTRA API ---

// Endpoint de "salud"
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'customers-api' });
});

// --- ¡NUEVA RUTA TRAMPA PARA GENERAR UN TOKEN! ---
app.get('/internal/get-token', (req, res) => {
    try {
        // Creamos un token que no expira, usando el mismo secreto del .env
        const token = jwt.sign(
            { service: 'self-generated', scope: 'internal' }, // El contenido del token
            process.env.SERVICE_TOKEN_SECRET // El secreto
        );
        
        res.status(200).json({ service_token: token });

    } catch (err) {
        res.status(500).json({ error: 'No se pudo firmar el token. ¿El secreto está en .env?' });
    }
});
// --- FIN DE LA RUTA TRAMPA ---

// --- RUTA PARA CREAR CLIENTES ---
app.post('/customers', async (req, res) => {
    try {
        const { error, value } = createCustomerSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }
        const { name, email, phone } = value;
        const sql = 'INSERT INTO customers (name, email, phone) VALUES (?, ?, ?)';
        const [result] = await pool.query(sql, [name, email, phone]);
        const newCustomerId = result.insertId;
        res.status(201).json({
            id: newCustomerId, name, email, phone
        });
    } catch (dbError) {
        if (dbError.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'El email ya está registrado.' });
        }
        console.error('Error en POST /customers:', dbError);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});
// --- FIN DE RUTA POST ---

// --- RUTA PARA OBTENER UN CLIENTE POR ID (PÚBLICA) ---
app.get('/customers/:id', async (req, res) => {
    try {
        const customerId = parseInt(req.params.id);
        if (isNaN(customerId)) {
            return res.status(400).json({ error: 'El ID debe ser un número.' });
        }
        const sql = 'SELECT id, name, email, phone FROM customers WHERE id = ?';
        const [rows] = await pool.query(sql, [customerId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado.' });
        }
        res.status(200).json(rows[0]);
    } catch (dbError) {
        console.error('Error en GET /customers/:id:', dbError);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});
// --- FIN DE RUTA GET ---


// --- RUTA PROTEGIDA PARA SERVICIOS INTERNOS ---
//               👇 Fíjate cómo pasamos el guardia antes de la lógica
app.get('/internal/customers/:id', verifyServiceToken, async (req, res) => {
    // Esta lógica es IDÉNTICA a la de /customers/:id
    // pero solo se ejecuta si el middleware "verifyServiceToken" llama a next()
    try {
        const customerId = parseInt(req.params.id);
        if (isNaN(customerId)) {
            return res.status(400).json({ error: 'El ID debe ser un número.' });
        }
        const sql = 'SELECT id, name, email, phone FROM customers WHERE id = ?';
        const [rows] = await pool.query(sql, [customerId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado.' });
        }
        res.status(200).json(rows[0]);
    } catch (dbError) {
        console.error('Error en GET /internal/customers/:id:', dbError);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});
// --- FIN DE LA RUTA INTERNA ---


// --- FIN DE RUTAS ---

// Función para iniciar el servidor
const startServer = async () => {
    try {
        const [rows] = await pool.query('SELECT 1 + 1 AS solution');
        console.log('✅ ¡Conexión a la base de datos exitosa! (1+1 = ' + rows[0].solution + ')');
        app.listen(port, () => {
            console.log(`🚀 Servidor de Customers API corriendo en http://localhost:${port}`);
        });
    } catch (error) {
        console.error('❌ Error al conectar con la base de datos:', error);
        process.exit(1);
    }
};

// ¡Arrancar el servidor!
startServer();