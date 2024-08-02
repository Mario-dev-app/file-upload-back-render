const express = require('express');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const mongoose = require('mongoose');
const { PORT, MONGODB } = require('./config/config');
/* const cron = require('node-cron');
const { recordatorioDocumentosPendientes } = require('./routes/postulante'); */

const app = express();

app.use(express.json());

app.use(cors());

app.use(fileUpload());

app.use(require('./routes/routes'));

app.listen(process.env.PORT || PORT, '0.0.0.0', () => {
    console.log('Servidor levantado en el puerto ' + PORT);
});

mongoose.set("strictQuery", false);

mongoose.connect(process.env.MONGODB || MONGODB).then(() => {
    console.log('Base de datos ONLINE');
}).catch((err) => {
    console.log('Error al conectar con la BD: ' + err);
});

/* cron.schedule('59 13 * * *', () => {
    recordatorioDocumentosPendientes();
}); */

