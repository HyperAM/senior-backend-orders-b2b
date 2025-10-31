⚠️ Estado Actual de la Entrega
Estado General: La estructura del monorepo, los archivos de configuración (docker-compose.yml, .serverless.yml), y la definición de la base de datos (schema.sql y seed.sql) están completos.

Servicios Operacionales: La base de datos MySQL y los contenedores de las APIs se levantan correctamente con docker-compose up -d.

Punto de Bloqueo: El desarrollo se detuvo en la etapa de conexión inicial a la base de datos desde el servicio customers-api.

Notas: Se requiere una depuración fina de las variables de entorno (DB_HOST, DB_USER) y el driver de Node.js para MySQL dentro del contenedor de la customers-api.