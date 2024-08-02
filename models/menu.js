const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Menu = mongoose.model('Menu', new Schema({
    name: {
        type: String,
        required: true
    },
    url: {
        type: String,
        required: true
    },
    icon: {
        type: String,
        required: true
    },
    role: {
        type: String,
        required: true
    }
}));

module.exports = Menu;