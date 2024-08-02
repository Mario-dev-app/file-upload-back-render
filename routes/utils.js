const express = require('express');
const router = express.Router();
const Menu = require('../models/menu');
const menuItems = [
    {
        name: 'Subir documentos',
        url: '/upload',
        icon: 'faCloud',
        role: 'postulante'
    },
    {
        name: 'Archivos',
        url: '/dirs',
        icon: 'faFile',
        role: 'admin'
    },
    {
        name: 'Nuevos ingresos',
        url: '/users',
        icon: 'faUser',
        role: 'admin'
    },
    {
        name: 'Recursos',
        url: '/src-postulante',
        icon: 'faPaperclip',
        role: 'postulante'
    },
    {
        name: 'Configuración',
        url: '/config',
        icon: 'faGear',
        role: 'admin'
    },
    {
        name: 'Perfiles',
        url: '/profiles',
        icon: 'faUser',
        role: 'admin'
    }
    /* ,
    {
        name: 'Recursos',
        url: '/src-rrhh',
        icon: 'fa fa-paperclip',
        role: 'admin'
    } */
];

//===============================
// APLICAR CONFIGURACIÓN INICIAL
//===============================
router.get('/init-config', (req, res) => {
    menuItems.forEach( async (item) => {
        await Menu.create({
            name: item.name,
            url: item.url,
            icon: item.icon,
            role: item.role
        });
    });

    res.json({
        ok: true,
        message: 'La configuración inicial fue aplicada correctamente'
    });
});



module.exports = router;