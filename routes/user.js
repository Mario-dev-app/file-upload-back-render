const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const fs = require('fs');
const User = require('../models/user');
const Menu = require('../models/menu');
const { SEED, mailParams, ENLACE_WEB } = require('../config/config');
const { tokenIsValid, isAdminRole } = require('../middlewares/auth');

//========================
// REGISTRAR USUARIO ROOT
//========================
router.post('/root-user', (req, res) => {
    let rootPass = req.query.rootPass
    let body = req.body;
    let passwordEncode = bcrypt.hashSync(body.password, 10);
    if (rootPass == 'P4R4L3L3P1P3D0') {
        User.create({
            username: body.username,
            password: passwordEncode,
            correo: body.correo,
            role: 'admin'
        }).then((user) => {
            res.json({
                ok: true,
                user
            });
        }).catch((err) => {
            res.json({
                ok: false,
                message: err.message
            });
        });
    } else {
        res.json({
            ok: false,
            message: 'Enlace no válido'
        });
    }
});

//========
// LOGIN
//========
router.post('/login', (req, res) => {
    let username = req.body.username;
    let password = req.body.password;
    User.findOne({ username: username, active: true })
        .exec(async (err, resp) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    message: 'Ocurrió un error al iniciar sesión'
                });
            }

            if (!resp) {
                return res.status(400).json({
                    ok: false,
                    message: 'El usuario o la contraseña no son correctos'
                });
            }

            if (!bcrypt.compareSync(password, resp.password)) {
                return res.status(400).json({
                    ok: false,
                    message: 'El usuario o la contraseña no son correctos'
                });
            }

            const menu = await Menu.find({ role: resp.role });

            resp.password = '***';

            let token = jwt.sign({
                data: resp
            }, SEED, { expiresIn: '1h' });

            res.json({
                ok: true,
                user: resp,
                menu,
                token
            });

        });
});

//======================================
// OBTENER USUARIOS CON ROL POSTULANTE
//======================================
router.get('/users/postulantes', [tokenIsValid, isAdminRole], (req, res) => {
    User.find({ role: 'postulante' })
        .populate('postulanteId')
        .sort({regDate: 'desc'})
        .exec((err, result) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    message: 'Ocurrió un error al buscar los usuarios de tipo postulante'
                });
            }

            if (!result) {
                return res.status(400).json({
                    ok: false,
                    message: 'No se encontraron resultados de la búsqueda de usuarios de tipo postulante'
                });
            }

            res.json({
                ok: true,
                result
            });
        });
});


//============================================
// BUSCAR USUARIOS POR DNI CON ROL POSTULANTE
//============================================
router.get('/user/search', [tokenIsValid], (req, res) => {
    let search = req.query.search;
    User.find({"username": {$regex: '.*'+ search +'.*'}})
    .populate('postulanteId')
    .exec((err, result) => {
        if(err){
            return res.status(500).json({
                ok: false,
                message: 'Ocurrió un error al buscar al usuario'
            });
        }

        res.json({
            ok: true,
            postulante: result
        });
    });
});

//=================================================================
// ENVIAR CORREO DE CREDENCIALES A NUEVO INGRESO POR ID DE USUARIO
//=================================================================
router.post('/user/correo-cred/:id', [tokenIsValid, isAdminRole], (req, res) => {
    let id = req.params.id;
    let dni = req.body.dni;
    let numero = new Date().getHours() + new Date().getMinutes();
    let newPasswordEncode = bcrypt.hashSync(dni + numero, 10);
    User.findByIdAndUpdate({_id: id}, {password: newPasswordEncode})
        .populate('postulanteId')
        .exec((err, result) => {
            if(err){
                return res.status(500).json({
                    ok: false,
                    err,
                    message: 'Hubo un error al intentar buscar y modificar al usuario'
                });
            }
    
            if(!result){
                return res.status(400).json({
                    ok: false,
                    message: 'No se encontró usuario con ese ID'
                });
            }

            let html = `
                <p>Hola ${result.postulanteId.nombre} ${result.postulanteId.apellidos},</p>
                <p>Te saluda el equipo de Marco Peruana y queremos informarte que se han generado tus credenciales de acceso para adjuntar tu documentación en nuestra plataforma.</p>
                <p>Usuario: ${dni}</p>
                <p>Contraseña: ${dni + numero}</p>
                <p>Para acceder debes dar clic en el siguiente enlace: ${ENLACE_WEB}</p>
                <p>Es fundamental cumplir las siguientes instrucciones:</p>
                <ul>
                    <li>El formato para enviar los documentos es en PDF o Word (Otro formato no se aceptará).</li>
                    <li>La cuenta CTS debe ser vinculada con el RUC de la razón social a la que va a pertenecer: <br/>
                        Razón Social Mario Peruana S.A - RUC: 20100006538 <br/>
                        Razón Social Soluciones Pesqueras S.A. - RUC: 20604976112 <br/>
                        Razón Social RM Wear Tec S.A. - RUC: 20603925662 <br/>
                        Razón Social Soluciones Ultra Frío S.A. - RUC: 20607005282
                    </li>
                    <li>En el caso de Renta de Quinta, leer detenidamente el instructivo adjunto en el correo para el llenado correcto.</li>
                    <li>Para el documento DJ - Seguro de Vida. Este debe ser legalizado en notaría o juez de paz.</li>
                    <li>En el caso del Sistema Pensionario. Seguir el instructivo si aportas a la AFP o llenar el cargo si perteneces a la ONP. Para aquellas personas que aún no aporten a un sistema pensionario, llenar el formato de elección.</li>
                </ul>
                <p>Quedamos a tu disposición para cualquier consulta o asistencia que necesites.</p>
                <br>
                <p><b>Todos los documentos deben ser firmados a mano con lapicero azul y no pegar su firma. Es muy importante revisar el formato de C.V. adjunto, completarlo con su información y adjuntar todos sus certificados de estudios y trabajo.</b></p>
                <br>
                <p>Saludos,</p>
                <p>Marco Peruana</p>
                `;

                let attachments = [
                    {
                        filename: 'Instructivo - Renta de Quinta.pdf',
                        content: fs.createReadStream('assets/Instructivo - Renta de Quinta.pdf')
                      }
                ];

                enviarCorreo(result.postulanteId.correo, 'Creación de Credenciales - Adjuntar Documentación MARCO PERUANA', html, attachments);
        
                res.json({
                    ok: true,
                    message: 'Correo enviado correctamente'
                });
        });

});

//======================================================
// MODIFICAR ESTADO DE USUARIO POR DOCUMENTOS COMPLETOS
//======================================================
router.put('/user-state/:id', [tokenIsValid], (req, res) => {
    let body = req.body;
    let id = req.params.id;
    User.findOneAndUpdate({_id: id},{
        active: body.active,
    })
    .exec((err, result) => {
        if(err){
            return res.status(500).json({
                ok: false,
                err,
                message: 'Hubo un error al intentar buscar y modificar al usuario'
            });
        }

        if(!result){
            return res.status(400).json({
                ok: false,
                message: 'No se encontró usuario con ese ID'
            });
        }

        res.json({
            ok: true,
            message: 'Usuario actualizado correctamente'
        });
    });
});

//==============================
// ACTUALIZAR DATOS DE USUARIO
//==============================
router.put('/user/:id', [tokenIsValid, isAdminRole], (req, res) => {
    let body = req.body;
    let id = req.params.id;
    User.findOneAndUpdate({_id: id},{
        username: body.username,
        correo: body.correo,
        password: body.password,
        role: body.role,
        active: body.active,
        postulanteId: body.postulanteId
    })
    .exec((err, result) => {
        if(err){
            return res.status(500).json({
                ok: false,
                err,
                message: 'Hubo un error al intentar buscar y modificar al usuario'
            });
        }

        if(!result){
            return res.status(400).json({
                ok: false,
                message: 'No se encontró usuario con ese ID'
            });
        }

        res.json({
            ok: true,
            message: 'Usuario actualizado correctamente'
        });
    });
});


//==============================
// VERIFICAR SI TOKEN ES VALIDO
//==============================
router.get('/token-is-valid', (req, res) => {
    let token = req.query.token;
    jwt.verify(token, SEED, (err, decoded) => {
        if (err) {
            return res.json({
                ok: false,
                message: 'Token no válido'
            });
        }

        res.json({
            ok: true,
            message: 'Token válido'
        });
    });
});

//===========================
// MÉTODO PARA ENVIAR CORREO
//===========================
const enviarCorreo = (to, subject, html, attachments) => {
    const transporter = nodemailer.createTransport(mailParams);
    transporter.sendMail({
        from: 'mperaltaw@outlook.com',
        to: to,
        subject: subject,
        html: html,
        attachments: attachments
    }).then((resp) => {
        console.log(resp);
    }).catch((err) => {
        console.log(err);
    })
};


module.exports = router;