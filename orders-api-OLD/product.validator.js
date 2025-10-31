const Joi = require('joi');

// Reglas para un nuevo producto
const createProductSchema = Joi.object({
    sku: Joi.string().min(3).max(50).required(),
    name: Joi.string().min(3).max(255).required(),
    price_cents: Joi.number().integer().min(0).required(),
    stock: Joi.number().integer().min(0).default(0)
});

// --- ¡NUEVO SCHEMA PARA ACTUALIZAR (PATCH)! ---
// Campos opcionales, pero al menos UNO debe estar presente
const updateProductSchema = Joi.object({
    price_cents: Joi.number().integer().min(0), // opcional
    stock: Joi.number().integer().min(0)       // opcional
})
.min(1) // Joi debe encontrar al menos 1 de las claves de arriba
.messages({
    'object.min': 'Debe proporcionar al menos un campo para actualizar (price_cents o stock).'
});
// --- FIN DEL NUEVO SCHEMA ---

module.exports = {
    createProductSchema,
    updateProductSchema // <-- Exportamos el nuevo schema
};