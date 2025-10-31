const axios = require('axios');
const jwt = require('jsonwebtoken');

// Leemos las variables del .env
const CUSTOMERS_API_URL = process.env.CUSTOMERS_API_URL;
const SERVICE_TOKEN_SECRET = process.env.SERVICE_TOKEN_SECRET;

/**
 * Genera un token de servicio para autenticarnos contra otras APIs
 */
function generateServiceToken() {
    return jwt.sign({ service: 'orders-api' }, SERVICE_TOKEN_SECRET);
}

/**
 * Llama a la API de Clientes (en puerto 3001) para obtener un cliente
 * @param {number} customerId - El ID del cliente a buscar
 * @returns {Promise<object>} Los datos del cliente
 * @throws {Error} Si el cliente no se encuentra (404) o hay otro error
 */
async function getCustomerById(customerId) {
    console.log(`[CustomerService] Verificando cliente ID: ${customerId}...`);
    
    try {
        // 1. Generamos nuestro token de autenticación
        const token = generateServiceToken();

        // 2. Hacemos la llamada HTTP con axios
        const response = await axios.get(
            `${CUSTOMERS_API_URL}/internal/customers/${customerId}`, // URL: http://localhost:3001/internal/customers/1
            {
                headers: {
                    'Authorization': `Bearer ${token}` // Ponemos el token
                }
            }
        );

        // 3. Si todo sale bien (status 200), devolvemos los datos
        console.log(`[CustomerService] Cliente ${customerId} verificado.`);
        return response.data; // Esto será { id: 1, name: "...", ... }

    } catch (error) {
        // 4. Si la customers-api nos da un error (ej: 404, 401, 500)
        if (error.response) {
            console.error(`[CustomerService] Error ${error.response.status} de la API de Clientes:`, error.response.data);
            // Si el cliente no existe (404), lanzamos un error
            if (error.response.status === 404) {
                throw new Error('Cliente no encontrado.');
            }
        }
        // Si la API ni siquiera respondió (ej: está caída)
        console.error('[CustomerService] Error al conectar con la API de Clientes:', error.message);
        throw new Error('No se pudo verificar el cliente.');
    }
}

module.exports = {
    getCustomerById
};