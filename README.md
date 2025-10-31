Prueba Técnica – Backoffice de Pedidos B2B (Senior Backend)

Sistema de microservicios Serverless para la gestión B2B de Clientes y Pedidos.
El proyecto valida la creación y confirmación de órdenes de forma transaccional e idempotente, orquestada por una función AWS Lambda.


---

Arquitectura del Proyecto (Monorepo)

El proyecto está organizado como un Monorepo que aloja tres servicios principales y una base de datos centralizada, todos orquestados mediante Docker Compose para desarrollo local:

customers-api → Gestión de clientes

orders-api → Gestión de órdenes y stock

lambda-orchestrator → Función que coordina el flujo de creación y confirmación de pedidos

db → Servicio MySQL con esquema y datos iniciales



---

Requisitos e Instalación

Requisitos Previos

Asegúrate de tener instalado y configurado lo siguiente:

Node.js v22.x

npm (incluido con Node.js)

Docker y Docker Compose

Serverless Framework CLI


Instalación global del CLI:

npm install -g serverless


---

Pasos de Instalación

1. Clonar el repositorio

git clone <url-del-repo>
cd prueba-integracion-senior


2. Configurar variables de entorno
Crea un archivo llamado .env en la raíz de cada servicio (customers-api, orders-api, lambda-orchestrator) y completa los valores según los ejemplos proporcionados.


3. Instalar dependencias

npm install




---

Levantamiento Local y Comandos Útiles

El flujo de levantamiento local inicia la base de datos y las APIs con:

docker-compose up -d

Verificación de Servicios

Customers API (Health Check): http://localhost:3001/health

Orders API (Health Check): http://localhost:3002/health



---

Scripts de Utilidad

Servicio	Script	Descripción

/db (o root)	npm run migrate	Ejecuta las migraciones definidas en schema.sql.
/db (o root)	npm run seed	Llena la base de datos con datos de prueba (seed.sql).
/customers-api	npm test	Ejecuta las pruebas unitarias y de integración.



---

Lambda Orquestador: Invocación

4.1 Ejecución Local (serverless-offline)

Permite simular el entorno de AWS API Gateway de forma local:

serverless offline

La Lambda estará disponible en:

http://localhost:3003/dev/orchestrator/create-and-confirm-order

4.2 Invocación al Endpoint

Ejemplo de solicitud desde PowerShell o Postman:

Invoke-RestMethod -Uri "http://localhost:3003/dev/orchestrator/create-and-confirm-order" `
-Method POST -ContentType "application/json" `
-Body '{"customer_id":1,"items":[{"product_id":1,"qty":1}],"idempotency_key":"unique-test-key-056"}'

El flujo esperado es:

Validación de Cliente → Creación de Orden → Confirmación de Orden (idempotente)


---

Despliegue en AWS

Configura tus credenciales y asegúrate de que las variables:

CUSTOMERS_API_BASE
ORDERS_API_BASE

apunten a las URLs públicas de tus APIs desplegadas.


---

Criterios de Implementación Senior

Idempotencia:
POST /orders/:id/confirm usa el header X-Idempotency-Key para evitar reprocesos.

Transacciones:
La creación de órdenes valida el cliente, verifica y descuenta el stock en una única transacción.

Autenticación entre servicios:
Comunicación interna mediante SERVICE_TOKEN entre orders-api y customers-api.

Paginación eficiente:
Rutas como GET /customers, GET /orders soportan cursor y limit.

Documentación:
Especificaciones OpenAPI 3.0 disponibles en:

customers-api/openapi.yaml

orders-api/openapi.yaml




---

Estado Actual / Problemas Detectados

🔸 Estado General

La estructura del monorepo y los archivos de configuración (docker-compose.yml, .serverless.yml) están completos.

La base de datos y los contenedores se levantan correctamente con docker-compose up -d.


Puntos de Bloqueo

1. Conexión inicial de customers-api a la base de datos:
Persisten errores de conexión. Se requiere depurar las variables (DB_HOST, DB_USER) y la configuración del driver de MySQL.


2. Error en lambda-orchestrator al llamar a la API de órdenes:
El servicio orquestador genera una ruta incorrecta al intentar crear una orden:

http://localhost:3002/dev/orders/orders

en lugar de:

http://localhost:3002/dev/orders

Resultado: 404 Not Found
Causa probable: duplicación del segmento /orders por una configuración inconsistente en la variable ORDERS_API_URL.
Estado: 🔴 No resuelto