const Joi = require('joi');

const orderItemSchema = Joi.object({
    product_id: Joi.number().integer().min(1).required(),
    qty: Joi.number().integer().min(1).required()
});

const createOrderSchema = Joi.object({
    customer_id: Joi.number().integer().min(1).required(),
    items: Joi.array().items(orderItemSchema).min(1).required()
});

module.exports = {
    createOrderSchema
};