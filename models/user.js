const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const User = mongoose.model('User', new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
    },
    correo: {
        type: String,
        required: false
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['admin', 'postulante'],
        default: 'postulante'
    },
    active: {
        type: Boolean,
        default: true
    },
    postulanteId: {
        type: Schema.Types.ObjectId,
        ref: 'Postulante',
        required: false
    },
    regDate: {
        type: Date,
        default: Date.now()
    }
}));

module.exports = User;