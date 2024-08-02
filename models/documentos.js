const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Documentos = mongoose.model('Documentos', new Schema({
    nombreLargo: {
        type: String,
        required: true
    },
    nombreCorto: {
        type: String,
        unique: true,
        required: true
    },
    activo: {
        type: Boolean,
        default: true
    }
}));

module.exports = Documentos;