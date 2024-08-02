const express = require('express');
const router = express.Router();
const Perfiles = require('../models/perfiles');
const { tokenIsValid, isAdminRole } = require('../middlewares/auth');

//=============================
// OBTENER TODOS LOS PERFILES
//=============================
router.get('/perfiles', [tokenIsValid, isAdminRole], (req, res) => {
    Perfiles.find({})
        .exec((err, result) => {
            if(err) {
                return res.status(500).json({
                    ok: false,
                    err,
                    message: 'Ocurrió un error al buscar los perfiles'
                });
            }

            if(!result){
                return res.status(400).json({
                    ok: false,
                    message: 'No se econtraron perfiles registrados'
                });
            }

            res.json({
                ok: true,
                result
            });
        });
});

//=====================
// CREAR NUEVO PERFIL
//=====================
router.post('/perfil', [tokenIsValid, isAdminRole], (req, res) => {
    let body = req.body;
    let nombre = body.nombre;
    Perfiles.create({ nombre: nombre })
        .then((perfil) => {
            res.json({
                ok: true,
                perfil,
                message: 'Perfil creado correctamente'
            });
        }).catch((err) => {
            res.status(500).json({
                ok: false,
                message: err.message
            });
        });
});

//=================================
// EDITAR ARCHIVOS DEL PERFIL
//=================================
router.put('/perfil-archivos', [tokenIsValid, isAdminRole], (req, res) => {
    let body = req.body;
    let tipo = body.tipo;
    let idPerfil = body.idPerfil;
    let nombresArchivos = body.nombresArchivos;

    if(tipo.trim() === 'Planilla'){
        console.log('Entró');
        /* ES PARA PLANILLA */
        Perfiles.findByIdAndUpdate(
            { _id: idPerfil },
            { $set: {[`subperfiles.${0}.nombreArchivos`]: nombresArchivos}},
            (err, result) => {
                if(err) {
                    return res.status(500).json({
                        ok: false,
                        err,
                        message: 'Ocurrió un error al actualizar el perfil'
                    });
                }

                if(!result){
                    return res.status(400).json({
                        ok: false,
                        message: 'No se econtraron perfiles con ese ID'
                    });
                }

                res.json({
                    ok: true,
                    message: 'Se actualizó el perfil correctamente'
                });
            }
        )
    }else{
        /* ES PARA PRACTICANTE */
        Perfiles.findByIdAndUpdate(
            { _id: idPerfil },
            { $set: {[`subperfiles.${1}.nombreArchivos`]: nombresArchivos}},
            (err, result) => {
                if(err) {
                    return res.status(500).json({
                        ok: false,
                        err,
                        message: 'Ocurrió un error al actualizar el perfil'
                    });
                }

                if(!result){
                    return res.status(400).json({
                        ok: false,
                        message: 'No se econtraron perfiles con ese ID'
                    });
                }

                res.json({
                    ok: true,
                    message: 'Se actualizó el perfil correctamente'
                });
            }
        )
    }
});

//==========================
// EDITAR NOMBRE DE PERFIL
//==========================
router.put('/perfil-nombre/:id', [tokenIsValid, isAdminRole], (req, res) => {
    let body = req.body;
    let id = req.params.id;
    Perfiles.findByIdAndUpdate({_id: id}, {nombre: body.nombre})
        .exec((err, result) => {
            if(err) {
                return res.status(500).json({
                    ok: false,
                    err,
                    message: 'Ocurrió un error al actualizar el perfil'
                });
            }

            if(!result){
                return res.status(400).json({
                    ok: false,
                    message: 'No se econtraron perfiles con ese ID'
                });
            }

            res.json({
                ok: true,
                message: 'Se actualizó correctamente el perfil'
            });
        });
});

//===================
// ELIMINAR PERFIL
//===================
router.delete('/perfil/:id', [tokenIsValid, isAdminRole], (req, res) => {
    let id = req.params.id;
    Perfiles.findByIdAndDelete({_id: id})
        .exec((err, result) => {
            if(err) {
                return res.status(500).json({
                    ok: false,
                    err,
                    message: 'Ocurrió un error al eliminar el perfil'
                });
            }

            if(!result){
                return res.status(400).json({
                    ok: false,
                    message: 'No se econtraron perfiles con ese ID'
                });
            }

            res.json({
                ok: true,
                message: 'Se eliminó perfil correctamente'
            });
        });
});

module.exports = router;