'use strict';

const axios = require('axios');
const jwt = require('jsonwebtoken');

// Leemos las variables del .env
const {
  CUSTOMERS_API_URL,
  ORDERS_API_URL,
  SERVICE_TOKEN_SECRET,
} = process.env;

/**
 * Genera un token de servicio para autenticarnos contra nuestras APIs
 */
function generateServiceToken() {
  return jwt.sign({ service: 'lambda-orchestrator' }, SERVICE_TOKEN_SECRET);
}

/**
 * Esta es la función principal del Lambda (el orquestador)
 */
module.exports.orchestrate = async (event) => {
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Body de JSON inválido.' }) };
  }

  // 1. Extraer datos del body
  const { customer_id, items, idempotency_key, correlation_id } = body;

  if (!customer_id || !items || !idempotency_key) {
    return { statusCode: 400, body: JSON.stringify({ error: 'customer_id, items, y idempotency_key son requeridos.' }) };
  }

  // Generamos un token para todas nuestras llamadas internas
  const token = generateServiceToken();

  try {
    // --- PASO 1: Validar Cliente (llamando a Customers API) ---
    console.log(`Orquestador: Verificando cliente ${customer_id}...`);
    const customerResponse = await axios.get(
      `${CUSTOMERS_API_URL}/internal/customers/${customer_id}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const customer = customerResponse.data;

    // --- PASO 2: Crear la Orden (llamando a Orders API) ---
    console.log(`Orquestador: Creando orden para cliente ${customer_id}...`);
    const orderResponse = await axios.post(
      `${ORDERS_API_URL}/orders`, // <--- FIX: ORDERS_API_URL ahora termina en /dev, no en /orders
      { customer_id, items },
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const createdOrder = orderResponse.data;
    const newOrderId = createdOrder.order.id;

    // --- PASO 3: Confirmar la Orden (llamando a Orders API con Idempotencia) ---
    console.log(`Orquestador: Confirmando orden ${newOrderId} con llave ${idempotency_key}...`);
    const confirmResponse = await axios.post(
      `${ORDERS_API_URL}/orders/${newOrderId}/confirm`,
      null,
      {
        headers: {
          'X-Idempotency-Key': idempotency_key
        }
      }
    );
    const confirmedOrder = confirmResponse.data;

    // --- PASO 4: Construir la respuesta final ---
    console.log(`Orquestador: ¡Éxito! Orden ${newOrderId} confirmada.`);
    const finalResponse = {
      success: true,
      correlationId: correlation_id || null,
      data: {
        customer,
        order: {
          ...confirmedOrder.order,
          items: createdOrder.items
        }
      }
    };

    return {
      statusCode: 201,
      body: JSON.stringify(finalResponse),
    };

  } catch (error) {
    console.error("Error en el Orquestador:", error);

    // Manejar errores de las APIs
    if (error.response) {
      console.error("Error de API:", error.response.status, error.response.data);
      return {
        statusCode: error.response.status,
        body: JSON.stringify(error.response.data),
      };
    }

    // Error de red u otro
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error interno del orquestador.', details: error.message }),
    };
  }
};
