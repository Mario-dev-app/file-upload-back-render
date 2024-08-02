const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const utf8 = require('utf8');
const nodemailer = require('nodemailer');
const archiver = require('archiver');
const { FILES_URL, SRC_URL, mailParams, ENLACE_WEB } = require('../config/config');
const { tokenIsValid, isAdminRole } = require('../middlewares/auth');
const Postulante = require('../models/postulante');
const User = require('../models/user');


//============================================
// SUBIR ARCHIVOS A LA CARPETA DEL POSTULANTE
//============================================
router.post('/upload/:dni', (req, res) => {
    let dni = req.params.dni;
    let tipoDeArchivo = req.query.tipoArchivo;
    let fileTUP = req.files.file;
    let type = fileTUP.mimetype.split('/');
    let formatosValidos = ['vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'pdf', 'vnd.openxmlformats-officedocument.wordprocessingml.document', 'jpeg', 'jpg'];
    let esValido = formatosValidos.indexOf(type[1]);
    if (esValido == -1) {
        return res.json({
            ok: false,
            message: 'El formato de archivo no es válido'
        });
    }

    fileTUP.mv(`${FILES_URL}/${dni}/${utf8.decode(fileTUP.name)}`, (err) => {
        if (err) {
            return res.status(500).json({
                ok: false,
                err
            });
        }

        /* MODIFICAMOS EL NOMBRE DEL ARCHIVO EN EL USUARIO SEGÚN EL TIPO DE DOCUMENTO SUBIDO */
        Postulante.findOne(
            {dni: dni}
            ).exec( async(err, result) => {
                if(err){
                    return res.status(500).json({
                        ok: false,
                        err
                    });
                }

                let totalDocumento = result.documentos.length;
                let nombreCompleto = `${result.nombre} ${result.apellidos}`;
    
                result.documentos.forEach(doc => {
                    if(doc.nombreDocumento === tipoDeArchivo){
                        doc.nombreArchivo = fileTUP.name;
                    }

                    if(doc.nombreArchivo.trim() !== ''){
                        totalDocumento--;
                    }
                });

                /* ENVIAMOS CORREO A LOS ADMINISTRADORES SI SE COMPLETARON LOS DOCUMENTOS */

                let archivosCompletos = false;
                if(totalDocumento === 0){
                    let adminUsers = await User.find({role: 'admin'});
                    adminUsers.forEach((user) => {
                        todosLosArchivosSubidos(nombreCompleto, dni, user.correo);
                    });
                    archivosCompletos = true;
                    let html = `
                    <p>Hola ${result.nombre} ${result.apellidos}</p>
                    <br>
                    <p>Nos complace informarte que tu documentación ha sido recibida y verificada, confirmamos que ha sido completada satisfactoriamente. Nos estaremos comunicando contigo para informarte sobre las siguientes etapas del proceso de incorporación.</p>
                    <p>Quedamos a tu disposición para cualquier consulta adicional que puedas tener.</p>
                    <br>
                    <p>Saludos,</p>
                    <p>Marco Peruana</p>
                    `;
                    enviarCorreo(result.correo, 'Confirmación de documentación completa', html);
                }

                result.save((err, postulanteSave) => {
                    if(err){
                        return res.status(500).json({
                            ok: false,
                            err
                        });
                    }
    
                    res.json({
                        ok :true,
                        postulanteSave,
                        archivosCompletos
                    });
                })
            });

    });
});

//=====================================================================================
// FUNCIÓN PARA ENVIAR CORREO CUANDO EL NUEVO INGRESO HAYA COMPLETADO SU DOCUMENTACIÓN
//=====================================================================================
const todosLosArchivosSubidos = (nombre, dni, correoTo) => {
    const transporter = nodemailer.createTransport(mailParams);
    transporter.sendMail({
        from: 'mperaltaw@outlook.com',
        to: correoTo,
        subject: `Alerta - ${nombre} ha completado su documentación`,
        html: `
        <p>Estimado administrador,</p>
        <p>El nuevo ingreso ${nombre} identificado con DNI ${dni} ya completó la subida de toda su documentación. Puede revisarla dando click <a href="${ENLACE_WEB}">aquí</a></p>
        <br>
        <p>Saludos cordiales,</p>
        <p>Plataforma de Gestión Documentaria - Marco Peruana</p>
        `
    }).then((resp) => {
        console.log(resp);
    })
    .catch((err) => {
        console.log(err);
    })
};


//====================
// CARGAR DIRECTORIOS
//====================
router.get('/dirs-name', [tokenIsValid, isAdminRole], (req, res) => {
    fs.readdir(FILES_URL, (err, result) => {
        if (err) {
            return res.status(500).json({
                ok: false,
                message: 'Error al leer las carpetas'
            });
        }

        res.json({
            ok: true,
            dirs: result
        });
    });
});

//==========================
// DESCARGAR ZIP DE CARPETA
//==========================
router.get('/download-dir/:dni', [tokenIsValid, isAdminRole], (req, res) => {
    let dni = req.params.dni;
    var output = fs.createWriteStream(`./zipped/${dni}.zip`);
    var archive = archiver('zip');
    output.on('close', function () {
        console.log(archive.pointer() + ' total bytes');
        console.log('Archivo zipeado correctamente');
    });
    archive.on('error', function(err){
        throw err;
    });
    archive.pipe(output);
    fs.readdir(`${FILES_URL}/${dni}`, (err, result) => {
        if(err){
            return res.status(500).json({
                ok: false,
                message: 'Ocurrió un error al recorrer los archivos'
            });
        }
        result.forEach((archivo) => {
            archive.append(fs.createReadStream(`${FILES_URL}/${dni}/${archivo}`), {name: `${archivo}`});
        });
        archive.finalize();
        res.writeHead(200, {
            'Content-Type': 'application/zip',
            'Content-disposition': `attachment; filename=${dni}.zip`
        });
        archive.pipe(res);
    });
});

//=================================
// CARGAR UN DIRECTORIO ESPECIFICO
//=================================
router.get('/specific-dir', [tokenIsValid, isAdminRole], (req, res) => {
    let search = req.query.search;
    fs.readdir(FILES_URL, (err, result) => {
        if (err) {
            return res.status(500).json({
                ok: false,
                message: 'Error al leer las carpetas'
            });
        }

        let specificDir = result.filter((dir) => {
            if(dir.trim().indexOf(search.trim()) > -1){
                return dir
            }
        });
        res.json({
            ok: true,
            dir: specificDir
        });
    });
});

//=====================================================================
// CARGAR ARCHIVOS DE DIRECTORIO ESPECÍFICO DENTRO DE LA CARPETA FILES
//=====================================================================
router.get('/files', [tokenIsValid, isAdminRole], (req, res) => {
    let dirname = req.query.dirname;
    fs.readdir(`${FILES_URL}/${dirname}`, (err, result) => {
        if (err) {
            return res.status(500).json({
                ok: false,
                message: 'Error al leer los archivos'
            });
        }

        res.json({
            ok: true,
            files: result
        });
    })
});

//=====================================================
// CARGAR ARCHIVOS DE LA CARPETA RECURSOS-POSTULANTE
//=====================================================
router.get('/src-postulante', [tokenIsValid], (req, res) => {
    fs.readdir(`${SRC_URL}/`, (err, result) => {
        if (err) {
            return res.status(500).json({
                ok: false,
                message: 'Error al leer los archivos'
            });
        }

        res.json({
            ok: true,
            files: result
        });
        
    })
});

//==================================================
// SUBIR ARCHIVOS A LA CARPETA RECURSOS-POSTULANTE
//==================================================
router.post('/src-postulante', [tokenIsValid, isAdminRole], (req, res) => {
    let fileTUP = req.files.file;
    let type = fileTUP.mimetype.split('/');
    let formatosValidos = ['pdf', 'vnd.openxmlformats-officedocument.wordprocessingml.document'];
    let esValido = formatosValidos.indexOf(type[1]);

    if (esValido == -1) {
        return res.json({
            ok: false,
            message: 'El formato de archivo no es válido'
        });
    }

    fileTUP.mv(`${SRC_URL}/${utf8.decode(fileTUP.name)}`, (err) => {
        if (err) {
            console.log(err);
            return res.status(500).json({
                ok: false,
                message: 'Ocurrió un error al intentar guardar el archivo'
            });
        }

        res.json({
            ok: true,
            message: 'Archivo subido correctamente'
        });

    });
});

//==========================================
// ELIMINAR ARCHIVO DE RECURSOS-POSTULANTE
//==========================================
router.delete('/src-postulante', [tokenIsValid, isAdminRole], (req, res) => {
    let nombreArchivo = req.query.nombreArchivo;
    fs.unlink(`${SRC_URL}/${nombreArchivo}`, (err) => {
        if(err){
            console.log(err);
            return res.status(500).json({
                ok: false,
                message: 'Ocurrió un error al intentar eliminar el archivo'
            });
        }

        res.json({
            ok: true,
            message: 'Archivo eliminado correctamente'
        });
    });
});



//=======================================================
// DESCARGAR ARCHIVO ESPECIFICO DENTRO DE CARPETA FILES
//=======================================================
router.get('/download-file/:file', [tokenIsValid, isAdminRole], (req, res) => {
    let dirname = req.query.dirname;
    let file = req.params.file;
    let fileLocation = path.join(`${FILES_URL}/${dirname}`, file);
    res.download(fileLocation, file);
});

//============================================================
// DESCARGAR ARCHIVO ESPECIFICO DENTRO DE RECURSOS-POSTULANTE
//============================================================
router.get('/download-src-postulante/:file', [tokenIsValid], (req, res) => {
    let file = req.params.file;
    let fileLocation = path.join(`${SRC_URL}`, file);
    res.download(fileLocation, file);
});

//===================================================
// DESCARGAR RECURSOS PARA EL POSTULANTE
//===================================================
router.get('/download-rsc/:file', (req, res) => {
    let file = req.params.file;
    let fileLocation = path.join(`./recursos-postulante/`, file);
    res.download(fileLocation, file);
});

/* router.get('/new-folder/:folder', (req, res) => {
    let folder = req.params.folder;
    fs.mkdir(`./files/${folder}`, (err) => {
        if (err) {
            return res.status(500).json({
                ok: false,
                message: 'Hubo un error al intentar crear la carpeta'
            });
        }

        res.json({
            ok: false,
            message: 'Se creó correctamente la carpeta'
        });
    });
}); */

//===========================
// MÉTODO PARA ENVIAR CORREO
//===========================
const enviarCorreo = (to, subject, html) => {
    const transporter = nodemailer.createTransport(mailParams);
    transporter.sendMail({
        from: 'mperaltaw@outlook.com',
        to: to,
        subject: subject,
        html: html
    }).then((resp) => {
        console.log(resp);
    }).catch((err) => {
        console.log(err);
    })
};

module.exports = router;
