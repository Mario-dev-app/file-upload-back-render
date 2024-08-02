const express = require('express');
const app = express();
const {router} = require('./postulante');

//============================
// IMPORTACIÓN DE RUTAS
//============================
app.use(require('./upload-file'));
app.use(require('./user'));
app.use(require('./utils'));
app.use(router);
app.use(require('./documentos'));
app.use(require('./perfiles'));

module.exports = app;