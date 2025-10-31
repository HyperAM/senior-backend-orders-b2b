const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const { CUSTOMERS_API_URL, SERVICE_TOKEN_SECRET } = process.env;

// Genera un token JWT para autenticar este servicio
function getServiceToken() {
    return jwt.sign({ service: 'orders-api' }, SERVICE_TOKEN_SECRET);
}

// Función que llama a la API de Clientes
async function getCustomerById(customerId) {
    const token = getServiceToken();
    try {
        console.log(`[CustomerService] Verificando cliente ID: ${customerId}...`);
        const response = await axios.get(
            `${CUSTOMERS_API_URL}/internal/customers/${customerId}`,
            {
                headers: { 'Authorization': `Bearer ${token}` }
            }
        );
        console.log(`[CustomerService] Cliente ${customerId} verificado.`);
        return response.data;
    } catch (error) {
        if (error.response && error.response.status === 404) {
            console.error(`[CustomerService] Error 404 de la API de Clientes:`, error.response.data);
            throw new Error('Cliente no encontrado.');
        } else {
            console.error('[CustomerService] Error al contactar la API de Clientes:', error.message);
            throw new Error('Error interno al verificar el cliente.');
        }
    }
}

module.exports = {
    getCustomerById
};