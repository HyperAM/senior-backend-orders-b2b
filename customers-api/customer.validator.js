const Joi = require('joi');

// Definimos el "schema" o las reglas para un nuevo cliente
const createCustomerSchema = Joi.object({
    name: Joi.string().min(3).max(100).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().allow(null, '') // El teléfono es opcional
});

// Exportamos la función de validación
module.exports = {
    createCustomerSchema
};