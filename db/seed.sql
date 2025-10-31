-- Crear un cliente de ejemplo
INSERT INTO customers (name, email, phone) 
VALUES ('Cliente de Prueba ACME', 'ops@acme.com', '0991234567');

-- Crear otro cliente
INSERT INTO customers (name, email, phone) 
VALUES ('Cliente Fantasma S.A.', 'contacto@fantasma.com', '0987654321');

-- Crear productos de ejemplo
INSERT INTO products (sku, name, price_cents, stock) 
VALUES 
('PROD-001', 'Widget Básico', 1500, 100), -- $15.00
('PROD-002', 'Widget Premium', 4500, 50); -- $45.00