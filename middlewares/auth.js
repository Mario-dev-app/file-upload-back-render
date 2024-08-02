const jwt = require('jsonwebtoken');
const { SEED } = require('../config/config');

//==============================
// VERIFICAR SI TOKEN ES VALIDO
//==============================
const tokenIsValid = (req, res, next) => {
    let token = req.query.token;
    jwt.verify(token, SEED, (err, decoded) => {
        if (err) {
            return res.status(401).json({
                ok: false,
                message: 'Token no válido'
            });
        }

        req.user = decoded.data;
        next();
    });
}

//===============================
// VERIFICAR SI TIENE ADMIN ROLE
//===============================
const isAdminRole = (req, res, next) => {
    let user = req.user;
    if(user.role == 'admin'){
        next();
        return;
    }else{
        return res.status(400).json({
            ok: false,
            mensaje: 'No tiene permisos necesarios'
        });
    }
}

module.exports = {
    tokenIsValid,
    isAdminRole
}