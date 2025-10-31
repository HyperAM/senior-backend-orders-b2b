-- Usar una base de datos (Docker la creará, pero esto asegura que la usemos)
-- El nombre 'integration_db' lo definiremos luego en Docker.
-- REMOVER: USE integration_db;

-- Tabla de Clientes
CREATE TABLE customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Productos
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sku VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    price_cents INT NOT NULL, -- Guardar dinero como enteros (centavos)
    stock INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Órdenes
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    status ENUM('CREATED', 'CONFIRMED', 'CANCELED') NOT NULL,
    total_cents INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Tabla de Items de la Orden (tabla pivote)
CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    qty INT NOT NULL,
    unit_price_cents INT NOT NULL, -- Precio al momento de la compra
    subtotal_cents INT NOT NULL,
    
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Tabla de Idempotencia (La parte "diabólica")
-- Esta tabla guarda un registro de cada intento de confirmación.
CREATE TABLE idempotency_keys (
    idempotency_key VARCHAR(255) PRIMARY KEY,
    target_type VARCHAR(50) NOT NULL, -- Ej: 'order_confirmation'
    target_id VARCHAR(255) NOT NULL, -- Ej: el ID de la orden
    status VARCHAR(50) NOT NULL, -- Ej: 'PROCESSING', 'COMPLETED'
    response_body TEXT, -- Guarda el JSON de la respuesta exitosa
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL -- Para limpiar la tabla
);