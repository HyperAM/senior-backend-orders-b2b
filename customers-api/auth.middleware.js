const jwt = require('jsonwebtoken');

// Este es nuestro "guardia de seguridad"
const verifyServiceToken = (req, res, next) => {
    // 1. Buscar el token en los headers
    const authHeader = req.headers['authorization'];

    // El header debe ser "Bearer TU_TOKEN_LARGUISIMO"
    // Si no hay header, 'authHeader' será undefined
    const token = authHeader && authHeader.split(' ')[1]; // Separamos "Bearer" del token

    if (!token) {
        // 2. Si no hay token, lo rechazamos
        return res.status(401).json({ error: 'No autorizado: Token no provisto.' });
    }

    try {
        // 3. Intentar verificar el token con nuestro secreto
        jwt.verify(token, process.env.SERVICE_TOKEN_SECRET);

        // 4. Si el token es válido, dejamos pasar la petición
        next();

    } catch (err) {
        // 5. Si el token es inválido o expiró, lo rechazamos
        console.log('Error de token:', err.message);
        return res.status(403).json({ error: 'No autorizado: Token inválido.' });
    }
};

module.exports = verifyServiceToken;