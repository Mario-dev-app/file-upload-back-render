const express = require('express');
const router = express.Router();
const Documentos = require('../models/documentos');
const { tokenIsValid, isAdminRole } = require('../middlewares/auth');


//======================================
// CREAR REGISTRO DE DOCUMENTO NUEVO
//======================================
router.post('/docs', [tokenIsValid, isAdminRole], (req, res) => {
    const body = req.body;
    let nombreLargo = body.nombreLargo;
    
    let nombreCorto = nombreLargoToCorto(nombreLargo);

    Documentos.create({
        nombreLargo,
        nombreCorto
    }).then(() => {
        res.json({
            ok: true,
            message: 'Documento creado exitosamente'
        });
    }).catch((err) => {
        res.status(500).json({
            ok: false,
            message: err.message
        });
    });
    
});

//====================================================
// MÉTODO PARA CASTEAR EL NOMBRE LARGO A NOMBRE CORTO
//====================================================
const nombreLargoToCorto = (nombreLargo) => {
    let nombreArr = nombreLargo.split(' ');

    if(nombreLargo.trim().length < 1){
        return res.status(400).json({
            ok: false,
            message: 'No ha ingresado un nombre de documento válido'
        });
    }

    let newNombreArr = [];
    for (const nombre of nombreArr) {
        newNombreArr.push(nombre.toLowerCase());
    }

    let nombreCorto = '';
    if(newNombreArr.length > 1){

        for (let i = 0; i < newNombreArr.length; i++) {
            if(i !== 0){
                nombreCorto = nombreCorto + newNombreArr[i][0].toUpperCase() + newNombreArr[i].slice(1);
            }else{
                nombreCorto = nombreCorto + newNombreArr[i];
            }
            
        }
    }else{
        nombreCorto = newNombreArr[0];
    }
    
    return nombreCorto;
}


//=================================
// OBTENER TODOS LOS DOCUMENTOS
//=================================
router.get('/docs', [tokenIsValid, isAdminRole], (req, res) => {
    Documentos.find()
        .exec((err, result) => {
            if(err){
                return res.status(500).json({
                    ok: false,
                    message: 'Ocurrió un error al buscar los documentos'
                });
            }
    
            res.json({
                ok: true,
                documentos: result
            });
        })
});

//============================
// EDITAR DOCUMENTO POR ID
//============================
router.put('/doc/:id', [tokenIsValid, isAdminRole], (req, res) => {
    let id = req.params.id;
    let body = req.body;

    let nombreLargo = body.nombreLargo;
    let nombreCorto = nombreLargoToCorto(nombreLargo);

    Documentos.findOneAndUpdate({_id: id}, {
        nombreLargo,
        nombreCorto
    }).exec((err, result) => {
        if(err){
            return res.status(500).json({
                ok: false,
                message: 'Ocurrió un error al actualizar el documento'
            });
        }

        if(!result){
            return res.status(400).json({
                ok: false,
                message: 'No se encontró registro de documento con ese ID'
            });
        }

        res.json({
            ok: true,
            message: 'Documento actualizado correctamente'
        });
    });
});


//============================
// ELIMINAR DOCUMENTO POR ID
//============================
router.delete('/doc/:id', [tokenIsValid, isAdminRole], (req, res) => {
    let id = req.params.id;

    Documentos.findByIdAndDelete({_id: id})
        .exec((err, result) => {
            if(err){
                return res.status(500).json({
                    ok: false,
                    message: 'Ocurrió un error al eliminar el documento'
                });
            }
    
            if(!result){
                return res.status(400).json({
                    ok: false,
                    message: 'No se encontró registro de documento con ese ID'
                });
            }

            res.json({
                ok: true,
                message: 'Documento eliminado correctamente'
            });
        });
});

module.exports = router;