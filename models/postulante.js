const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Postulante = mongoose.model('Postulante', new Schema({
    nombre: {
        type: String,
        required: true
    },
    apellidos: {
        type: String,
        required: true,
    },
    puesto: {
        type: String,
        required: true
    },
    dni: {
        type: String,
        required: true,
        unique: true
    },
    correo: {
        type: String,
        required: true
    },
    recursos: {
        type: [String],
        default: []
    },
    documentos: {
        type: [{activo: Boolean, nombreArchivo: String, nombreDocumento: String}],
        default: []
    },
    regDate: {
        type: Date,
        default: Date.now()
    }
}));

module.exports = Postulante;