Estado Actual de la Entrega

Estado General:
La estructura del monorepo, los archivos de configuración (docker-compose.yml, .serverless.yml) y la definición de la base de datos (schema.sql, seed.sql) están completos.

Servicios Operacionales:
La base de datos MySQL y los contenedores de las APIs se levantan correctamente con docker-compose up -d.

Puntos de Bloqueo:

1. Conexión a la base de datos desde customers-api:
El desarrollo se encuentra detenido en la etapa de conexión inicial a la base de datos. Se requiere una depuración detallada de las variables de entorno (DB_HOST, DB_USER) y del driver de Node.js para MySQL dentro del contenedor del servicio customers-api.


2. Error en lambda-orchestrator:
El orquestador presenta un error al intentar comunicarse con la API de órdenes.
En los logs se observa que realiza una llamada a una URL incorrecta:

http://localhost:3002/dev/orders/orders

en lugar de:

http://localhost:3002/dev/orders

Lo que genera un 404 Not Found.
La causa probable es una duplicación del segmento /orders al concatenar la variable de entorno ORDERS_API_URL con el endpoint dentro del código del orquestador.
Este problema aún no ha sido resuelto.



Notas:

Es necesario revisar las variables de entorno del lambda-orchestrator y validar la construcción dinámica de las URLs para las llamadas HTTP internas.

Una vez solucionados los puntos de conexión, el flujo de creación y confirmación de órdenes podrá completarse correctamente.