Prueba Técnica – Backoffice de Pedidos B2B (Senior Backend)
Sistema de microservicios Serverless para la gestión B2B de Clientes y Pedidos. El proyecto valida la creación y confirmación de órdenes de forma transaccional e idempotente, orquestada por una función Lambda.

1. Arquitectura del Proyecto (Monorepo)
El proyecto está organizado como un Monorepo que aloja tres servicios principales y una base de datos centralizada, todos orquestados mediante Docker Compose para el desarrollo local.

2. Requisitos e Instalación
Requisitos Previos
Asegúrate de tener instalado y configurado lo siguiente:

Node.js v22.x

npm (incluido con Node.js)

Docker y Docker Compose

Serverless Framework CLI: Instálalo globalmente:

Pasos de Instalación
Clonar el Repositorio:

Configurar Variables de Entorno: Crea un archivo llamado .env en la raíz de cada servicio (customers-api, orders-api, lambda-orchestrator) y rellena según los siguientes ejemplos.

Instalar Dependencias:

3. Levantamiento Local y Comandos Útiles
El flujo de levantamiento local inicia la base de datos y las APIs.

Comandos de Levantamiento
Verificación y Scripts NPM
Las APIs estarán disponibles en:

Customers API (Health Check): http://localhost:3001/health

Orders API (Health Check): http://localhost:3002/health

Scripts de utilidad: | Servicio | Script | Descripción | | :--- | :--- | :--- | | /db (o desde root) | npm run migrate | Ejecuta las migraciones de schema.sql. | | /db (o desde root) | npm run seed | Llena la base de datos con datos de prueba (seed.sql). | | /customers-api | npm test | Ejecuta las pruebas unitarias y de integración. |

4. Lambda Orquestador: Invocación
El Orquestador es el punto clave del caso de uso.

4.1. Ejecución Local (serverless-offline)
Ejecutar la Lambda en un entorno local simula el API Gateway de AWS, permitiendo probar la orquestación.

La Lambda estará disponible localmente en http://localhost:3000 (o el puerto configurado en serverless.yml).

4.2. Invocación al Endpoint de Orquestación
Invocar desde Postman/Insomnia o cURL al endpoint del Lambda para probar el flujo completo: Validación de Cliente → Creación de Orden (CREATED, stock descontado) → Confirmación de Orden (CONFIRMED, idempotente).

Cuerpo de la Solicitud (JSON de Ejemplo):

Respuesta Esperada (JSON Consolidado 201):

4.3. Despliegue en AWS
Asegúrate de que tus credenciales de AWS estén configuradas y que las variables CUSTOMERS_API_BASE y ORDERS_API_BASE en el .env del Lambda apunten a las URLs públicas de tus APIs desplegadas.

5. Criterios de Implementación Senior
Se han implementado las siguientes características avanzadas:

Idempotencia: La ruta POST /orders/:id/confirm utiliza el header X-Idempotency-Key y la tabla idempotency_keys para asegurar que las operaciones repetidas devuelvan el mismo resultado sin doble procesamiento.

Transacciones en Pedidos: La creación de una orden (POST /orders) valida el cliente de forma externa, verifica el stock y descuenta el stock dentro de una única transacción de base de datos.

Validación de Clientes Interna: Orders API valida clientes mediante el endpoint /internal/customers/:id de Customers API, asegurado con un SERVICE_TOKEN para la comunicación entre servicios.

Paginación: Las rutas de búsqueda (GET /customers, GET /products, GET /orders) soportan cursor y limit para una paginación eficiente.

6. Documentación
La especificación completa de las APIs se encuentra en formato OpenAPI 3.0 en los siguientes archivos:

customers-api/openapi.yaml

orders-api/openapi.yaml
