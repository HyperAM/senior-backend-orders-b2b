const Joi = require('joi');

const createProductSchema = Joi.object({
    sku: Joi.string().trim().required(),
    name: Joi.string().trim().required(),
    price_cents: Joi.number().integer().min(0).required(),
    stock: Joi.number().integer().min(0).required()
});

const updateProductSchema = Joi.object({
    price_cents: Joi.number().integer().min(0),
    stock: Joi.number().integer().min(0)
}).min(1); // Requiere al menos un campo para actualizar

module.exports = {
    createProductSchema,
    updateProductSchema
};