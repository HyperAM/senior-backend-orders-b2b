const Joi = require('joi');

const itemSchema = Joi.object({
    product_id: Joi.number().integer().positive().required(),
    qty: Joi.number().integer().positive().required()
});

const createOrderSchema = Joi.object({
    customer_id: Joi.number().integer().positive().required(),
    items: Joi.array().items(itemSchema).min(1).required()
});

module.exports = {
    createOrderSchema
};