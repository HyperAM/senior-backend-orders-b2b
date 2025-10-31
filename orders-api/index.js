// Cargar variables de entorno
require('dotenv').config();

// Importar librerías
const express = require('express');
const pool = require('./db'); // <-- ¡Ahora existe!
const { createProductSchema, updateProductSchema } = require('./product.validator'); // <-- ¡Ahora existe!
const { createOrderSchema } = require('./order.validator'); // <-- ¡Ahora existe!
const customerService = require('./customer.service'); // <-- ¡Ahora existe!
const { v4: uuidv4 } = require('uuid'); // <-- Lo instalamos

// Crear la aplicación de Express
const app = express();
const port = process.env.PORT || 3002;
app.use(express.json());

// --- RUTAS DE NUESTRA API ---

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'orders-api' });
});

// --- RUTAS DE PRODUCTOS ---
app.post('/products', async (req, res) => {
    try {
        const { error, value } = createProductSchema.validate(req.body);
        if (error) { return res.status(400).json({ error: error.details[0].message }); }
        const { sku, name, price_cents, stock } = value;
        const sql = 'INSERT INTO products (sku, name, price_cents, stock) VALUES (?, ?, ?, ?)';
        const [result] = await pool.query(sql, [sku, name, price_cents, stock]);
        res.status(201).json({ id: result.insertId, ...value });
    } catch (dbError) {
        if (dbError.code === 'ER_DUP_ENTRY') { return res.status(409).json({ error: 'El SKU ya está registrado.' }); }
        console.error('Error en POST /products:', dbError);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

app.patch('/products/:id', async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        if (isNaN(productId)) { return res.status(400).json({ error: 'El ID debe ser un número.' }); }
        const { error, value } = updateProductSchema.validate(req.body);
        if (error) { return res.status(400).json({ error: error.details[0].message }); }
        const updateFields = [], sqlParams = [];
        if (value.price_cents !== undefined) { updateFields.push('price_cents = ?'); sqlParams.push(value.price_cents); }
        if (value.stock !== undefined) { updateFields.push('stock = ?'); sqlParams.push(value.stock); }
        sqlParams.push(productId);
        const sql = `UPDATE products SET ${updateFields.join(', ')} WHERE id = ?`;
        const [result] = await pool.query(sql, sqlParams);
        if (result.affectedRows === 0) { return res.status(404).json({ error: 'Producto no encontrado.' }); }
        res.status(200).json({ id: productId, message: 'Producto actualizado.', updated_fields: value });
    } catch (dbError) {
        console.error('Error en PATCH /products/:id:', dbError);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});
// --- FIN RUTAS DE PRODUCTOS ---

// --- RUTA POST /orders (LA BUENA, CON TRANSACCIÓN) ---
app.post('/orders', async (req, res) => {
    let connection; 
    try {
        const { error, value } = createOrderSchema.validate(req.body);
        if (error) { return res.status(400).json({ error: error.details[0].message }); }
        const { customer_id, items } = value;
        
        // ¡Validamos al cliente!
        const customer = await customerService.getCustomerById(customer_id);

        connection = await pool.getConnection();
        await connection.beginTransaction();
        console.log(`[POST /orders] Transacción iniciada para cliente ${customer_id}`);
        
        let total_cents = 0;
        const orderItemsData = [];
        for (const item of items) {
            const { product_id, qty } = item;
            const [rows] = await connection.query('SELECT * FROM products WHERE id = ? FOR UPDATE', [product_id]);
            if (rows.length === 0) { throw new Error(`Producto con ID ${product_id} no encontrado.`); }
            const product = rows[0];
            if (product.stock < qty) { throw new Error(`Stock insuficiente para el producto '${product.name}' (requerido: ${qty}, disponible: ${product.stock}).`); }
            const subtotal_cents = product.price_cents * qty;
            total_cents += subtotal_cents;
            orderItemsData.push({ product_id, qty, unit_price_cents: product.price_cents, subtotal_cents });
        }
        
        const orderSql = 'INSERT INTO orders (customer_id, status, total_cents) VALUES (?, ?, ?)';
        const [orderResult] = await connection.query(orderSql, [customer_id, 'CREATED', total_cents]);
        const newOrderId = orderResult.insertId;
        console.log(`[POST /orders] Orden ${newOrderId} creada, total: ${total_cents}`);

        for (const itemData of orderItemsData) {
            const itemSql = 'INSERT INTO order_items (order_id, product_id, qty, unit_price_cents, subtotal_cents) VALUES (?, ?, ?, ?, ?)';
            await connection.query(itemSql, [newOrderId, itemData.product_id, itemData.qty, itemData.unit_price_cents, itemData.subtotal_cents]);
            const stockSql = 'UPDATE products SET stock = stock - ? WHERE id = ?';
            await connection.query(stockSql, [itemData.qty, itemData.product_id]);
        }
        
        await connection.commit();
        console.log(`[POST /orders] Transacción ${newOrderId} completada (COMMIT).`);
        
        res.status(201).json({
            message: 'Orden creada exitosamente.',
            order: { id: newOrderId, status: 'CREATED', total_cents, customer_id },
            items: orderItemsData
        });
    } catch (error) {
        if (connection) { 
            await connection.rollback(); 
            console.error(`[POST /orders] Transacción fallida. ROLLBACK ejecutado.`, error.message);
        }
        if (error.message.includes('Cliente no encontrado')) { return res.status(404).json({ error: 'El cliente especificado no existe.' }); }
        if (error.message.includes('Stock') || error.message.includes('no encontrado')) { return res.status(400).json({ error: error.message }); }
        console.error('[POST /orders] Error interno:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    } finally {
        if (connection) { connection.release(); }
    }
});
// --- FIN RUTA POST /orders ---

// --- RUTA POST /orders/:id/confirm (IDEMPOTENCIA) ---
app.post('/orders/:id/confirm', async (req, res) => {
    const idempotencyKey = req.headers['x-idempotency-key'];
    if (!idempotencyKey) {
        return res.status(400).json({ error: 'Header X-Idempotency-Key es requerido.' });
    }
    const orderId = parseInt(req.params.id);
    if (isNaN(orderId)) {
        return res.status(400).json({ error: 'El ID de la orden debe ser un número.' });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [keyRows] = await connection.query('SELECT * FROM idempotency_keys WHERE idempotency_key = ? FOR UPDATE', [idempotencyKey]);

        if (keyRows.length > 0) {
            const key = keyRows[0];
            if (key.status === 'COMPLETED') {
                console.log(`[ConfirmOrder] Petición idempotente (ya completada): ${idempotencyKey}`);
                await connection.commit();
                // Devolvemos 200 (hardcodeado) porque no guardamos el status_code en el schema.sql original
                return res.status(200).json(JSON.parse(key.response_body)); 
            }
            if (key.status === 'PROCESSING') {
                console.log(`[ConfirmOrder] Petición duplicada (en proceso): ${idempotencyKey}`);
                await connection.rollback();
                return res.status(409).json({ error: 'Procesando una petición previa con la misma llave.' });
            }
        }

        const expiresAt = new Date(Date.now() + 3600 * 1000);
        await connection.query(
            'INSERT INTO idempotency_keys (idempotency_key, target_type, target_id, status, expires_at) VALUES (?, ?, ?, ?, ?)',
            [idempotencyKey, 'order_confirmation', orderId, 'PROCESSING', expiresAt]
        );
        console.log(`[ConfirmOrder] Llave ${idempotencyKey} insertada como PROCESSING.`);
        
        const [orderRows] = await connection.query('SELECT * FROM orders WHERE id = ? FOR UPDATE', [orderId]);
        if (orderRows.length === 0) {
            throw new Error('Orden no encontrada.');
        }

        const order = orderRows[0];
        if (order.status === 'CONFIRMED') {
             throw new Error(`La orden ${orderId} ya se encuentra confirmada.`);
        } else if (order.status !== 'CREATED') {
            throw new Error(`La orden ${orderId} no se puede confirmar (estado actual: ${order.status}).`);
        }
        
        await connection.query('UPDATE orders SET status = ? WHERE id = ?', ['CONFIRMED', orderId]);
        
        const responseBody = {
            message: 'Orden confirmada exitosamente.',
            order: { id: orderId, status: 'CONFIRMED', total_cents: order.total_cents }
        };
        const statusCode = 200;

        // Quitamos "status_code = ?" de la consulta SQL
        await connection.query(
            'UPDATE idempotency_keys SET status = ?, response_body = ? WHERE idempotency_key = ?',
            ['COMPLETED', JSON.stringify(responseBody), idempotencyKey]
        );

        await connection.commit();
        console.log(`[ConfirmOrder] Llave ${idempotencyKey} completada (COMMIT).`);
        res.status(statusCode).json(responseBody);

    } catch (error) {
        if (connection) {
            await connection.rollback();
            console.error(`[ConfirmOrder] Transacción fallida. ROLLBACK ejecutado.`, error.message);
        }
        if (error.message.includes('Orden no encontrada')) { return res.status(404).json({ error: error.message }); }
        if (error.message.includes('no se puede confirmar') || error.message.includes('ya se encuentra confirmada')) {
            return res.status(409).json({ error: error.message });
        }
        console.error('[ConfirmOrder] Error interno:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});
// --- FIN RUTA CONFIRM ---

// --- FIN DE RUTAS ---

// Función para iniciar el servidor
const startServer = async () => {
    try {
        // Test de conexión
        const [rows] = await pool.query('SELECT 1 + 1 AS solution');
        console.log('✅ ¡Conexión a la base de datos exitosa! (1+1 = ' + rows[0].solution + ')');
        
        // Arrancar el servidor
        app.listen(port, () => {
            console.log(`🚀 Servidor de Orders API corriendo en http://localhost:${port}`);
        });
    } catch (error) {
        console.error('❌ Error al conectar con la base de datos:', error);
        process.exit(1);
    }
};

// ¡Arrancar el servidor!
startServer();