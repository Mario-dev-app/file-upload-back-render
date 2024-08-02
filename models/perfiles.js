const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Perfiles = mongoose.model('Perfiles', new Schema({
    nombre: {
        type: String,
        required: true
    },
    subperfiles: {
        type: Schema.Types.Mixed,
        default: [
            {
                nombre: 'Planilla',
                nombreArchivos: [String]
            },
            {
                nombre: 'Practicante',
                nombreArchivos: [String]
            }
        ]
    }
}));

module.exports = Perfiles;