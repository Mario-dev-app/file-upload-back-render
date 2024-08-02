const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const ExcelJS = require('exceljs');
const fs = require('fs');
const User = require('../models/user');
const Postulante = require('../models/postulante');
const Perfiles = require('../models/perfiles');
const Documentos = require('../models/documentos');
const { tokenIsValid, isAdminRole } = require('../middlewares/auth');
const { FILES_URL, mailParams, ENLACE_WEB } = require('../config/config');


//======================================
// REGISTRAR POSTULANTE Y CREAR USUARIO
//======================================
router.post('/postulante', [tokenIsValid, isAdminRole], (req, res) => {
    let body = req.body;
    let numero = new Date().getHours() + new Date().getMinutes();
    let documentosPerfil = [];
    if (body.perfil) {
        Perfiles.findOne({ _id: body.perfil })
            .exec((err, result) => {
                if (err) {
                    return res.status(500).json({
                        ok: false,
                        err,
                        message: 'Ocurrió un error al buscar el perfil'
                    });
                }

                if (!result) {
                    return res.status(400).json({
                        ok: false,
                        message: 'No se encontró perfil con ese ID'
                    });
                }

                if (body.subperfil === 'Planilla') {
                    result.subperfiles[0].nombreArchivos.forEach((doc) => {
                        documentosPerfil.push(doc);
                    })
                } else {
                    result.subperfiles[1].nombreArchivos.forEach((doc) => {
                        documentosPerfil.push(doc);
                    })
                }

                Postulante.create({
                    nombre: body.nombre,
                    apellidos: body.apellidos,
                    puesto: body.puesto,
                    dni: body.dni,
                    correo: body.correo,
                    documentos: body.documentos,
                    recursos: documentosPerfil
                }).then((postulante) => {
                    console.log(postulante);
                    let passwordEncode = bcrypt.hashSync(postulante.dni + numero, 10);
                    User.create({
                        username: postulante.dni,
                        password: passwordEncode,
                        role: 'postulante',
                        postulanteId: postulante._id
                    }).then((user) => {
                        fs.mkdir(`${FILES_URL}/${postulante.dni}`, async (err) => {
                            if (err) {
                                await Postulante.deleteOne({ dni: body.dni });
                                await User.deleteOne({ username: body.dni });
                                console.log(err);
                                return res.status(500).json({
                                    ok: false,
                                    message: 'Hubo un error al intentar crear la carpeta',
                                    err
                                });
                            }

                            let html = `
                            <p>Hola ${postulante.nombre} ${postulante.apellidos},</p>
                            <p>Te saluda el equipo de Marco Peruana y queremos informarte que se han generado tus credenciales de acceso para adjuntar tu documentación en nuestra plataforma.</p>
                            <p>Usuario: ${postulante.dni}</p>
                            <p>Contraseña: ${postulante.dni + numero}</p>
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

                            enviarCorreo(postulante.correo, 'Creación de Credenciales - Adjuntar Documentación MARCO PERUANA', html, attachments);

                            res.json({
                                ok: true,
                                message: 'Nuevo ingreso registrado correctamente'
                            });
                        });
                    }).catch(async (err) => {
                        await Postulante.deleteOne({ dni: body.dni });
                        res.status(500).json({
                            ok: false,
                            message: err.message
                        });
                    });

                }).catch((err) => {
                    res.status(500).json({
                        ok: false,
                        message: err.message
                    });
                });
            });
    } else {
        Postulante.create({
            nombre: body.nombre,
            apellidos: body.apellidos,
            dni: body.dni,
            correo: body.correo,
            documentos: body.documentos,
            recursos: body.recursos,
            puesto: body.puesto
        }).then((postulante) => {
            let passwordEncode = bcrypt.hashSync(postulante.dni + numero, 10);
            User.create({
                username: postulante.dni,
                password: passwordEncode,
                role: 'postulante',
                postulanteId: postulante._id
            }).then((user) => {
                fs.mkdir(`${FILES_URL}/${postulante.dni}`, async (err) => {
                    if (err) {
                        await Postulante.deleteOne({ dni: body.dni });
                        await User.deleteOne({ username: body.dni });
                        console.log(err);
                        return res.status(500).json({
                            ok: false,
                            message: 'Hubo un error al intentar crear la carpeta',
                            err
                        });
                    }

                    let html = `
                    <p>Hola ${postulante.nombre} ${postulante.apellidos},</p>
                    <p>Te saluda el equipo de Marco Peruana y queremos informarte que se han generado tus credenciales de acceso para adjuntar tu documentación en nuestra plataforma.</p>
                    <p>Usuario: ${postulante.dni}</p>
                    <p>Contraseña: ${postulante.dni + numero}</p>
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

                    enviarCorreo(postulante.correo, 'Creación de Credenciales - Adjuntar Documentación MARCO PERUANA', html, attachments);

                    res.json({
                        ok: true,
                        message: 'Nuevo ingreso registrado correctamente'
                    });
                });
            }).catch(async (err) => {
                await Postulante.deleteOne({ dni: body.dni });
                res.status(500).json({
                    ok: false,
                    message: err.message
                });
            });

        }).catch((err) => {
            res.status(500).json({
                ok: false,
                message: err.message
            });
        });
    }

});


//=====================
// OBTENER POSTULANTES
//=====================
router.get('/postulantes', [tokenIsValid, isAdminRole], (req, res) => {
    Postulante.find()
        .exec((err, result) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    message: 'Ocurrió un error al buscar a los postulantes'
                });
            }

            res.json({
                ok: true,
                postulantes: result
            });
        });
});

//==============================
// BUSCAR POSTULANTE POR FILTRO
//==============================
router.get('/postulante', [tokenIsValid], (req, res) => {
    let search = req.query.search;
    Postulante.find({
        $or: [
            { "dni": { $regex: '.*' + search + '.*' } },
            { "nombre": { $regex: '.*' + search + '.*' } },
            { "apellidos": { $regex: '.*' + search + '.*' } },
        ]
    })
        .exec((err, result) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    message: 'Ocurrió un error al buscar al postulante'
                });
            }

            res.json({
                ok: true,
                postulante: result
            });
        });
});

//==========================
// BUSCAR POSTULANTE POR ID
//==========================
router.get('/postulante/:id', [tokenIsValid, isAdminRole], (req, res) => {
    let id = req.params.id;
    Postulante.findById({ _id: id })
        .exec((err, result) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    message: 'Ocurrió un error al buscar al postulante'
                });
            }

            if (!result) {
                return res.status(400).json({
                    ok: false,
                    message: 'No se encontró ningún postulante con ese ID'
                });
            }

            res.json({
                ok: true,
                message: 'Postulante encontrado',
                postulante: result
            });
        });
});


//=========================
// MODIFICAR UN POSTULANTE
//=========================
router.put('/postulante/:id', [tokenIsValid, isAdminRole], (req, res) => {
    let body = req.body;
    let id = req.params.id;
    Postulante.findByIdAndUpdate({ _id: id }, {
        nombre: body.nombre,
        apellidos: body.apellidos,
        puesto: body.puesto,
        dni: body.dni,
        correo: body.correo,
        documentos: body.documentos,
        recursos: body.recursos
    })
        .exec(async (err, result) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    err,
                    message: 'Hubo un error al intentar buscar y modificar al postulante'
                });
            }

            if (!result) {
                return res.status(400).json({
                    ok: false,
                    message: 'No se encontró nuevo ingreso con ese ID'
                });
            }

            if (result.dni != body.dni) {
                let passwordEncode = bcrypt.hashSync(body.dni, 10);

                await User.findOneAndUpdate(
                    { username: result.dni },
                    {
                        username: body.dni,
                        password: passwordEncode
                    });

                fs.rename(`${FILES_URL}/${result.dni}`, `${FILES_URL}/${body.dni}`, (err) => {
                    if (err) {
                        return res.status(500).json({
                            ok: false,
                            message: 'Hubo un error al intentar modificar el nombre de la carpeta'
                        });
                    }
                });
            }

            res.json({
                ok: true,
                message: 'Se modificó correctamente al nuevo ingreso'
            });
        });
});

//==================================
// OBTENER RECURSOS DEL POSTULANTE
//==================================
router.get('/recursos-postulante', [tokenIsValid], (req, res) => {
    let dni = req.query.dni;
    Postulante.findOne({ dni: dni }, ['recursos'])
        .exec((err, result) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    message: 'Ocurrió un error al buscar el recurso'
                });
            }

            if (!result) {
                return res.status(400).json({
                    ok: false,
                    message: 'No se encontró registro con ese DNI'
                });
            }

            res.json({
                ok: true,
                recursos: result
            });
        });
});

//========================
// ELIMINAR UN POSTULANTE
//========================
router.delete('/postulante/:dni', (req, res) => {

});

//=============================================
// OBTENER REPORTE DE AVANCE POR NUEVO INGRESO
//=============================================
router.get('/nuevo-ingreso/avance/:id', [tokenIsValid, isAdminRole], (req, res) => {
    let id = req.params.id;
    Postulante.findById({ _id: id })
        .exec((err, result) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    message: 'Ocurrió un error al buscar nuevo ingreso'
                });
            }

            if (!result) {
                return res.status(400).json({
                    ok: false,
                    message: 'No se encontró registro con ese ID'
                });
            }

            res.json({
                ok: true,
                nuevoIngreso: result
            });
        });
});

//=========================================================
// RECORDATORIO DE DOCUMENTOS PENDIENTES POR NUEVO INGRESO
//=========================================================
router.get('/nuevo-ingreso/recordatorio/:id', [tokenIsValid, isAdminRole], (req, res) => {
    let id = req.params.id;
    User.findById({ _id: id })
        .populate('postulanteId')
        .exec((err, result) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    message: 'Ocurrió un error al buscar al usuario'
                });
            }

            if (!result) {
                return res.status(400).json({
                    ok: false,
                    message: 'No se encontró usuario con ese ID'
                });
            }

            let documentosPendientes = [];
            result.postulanteId.documentos.forEach((doc) => {
                if (doc.nombreArchivo.trim().length === 0) {
                    documentosPendientes.push(doc);
                }
            })

            if (documentosPendientes.length !== 0) {

                let mensaje = 'Queremos recordarte que aún falta subir el/los documento(s) ';
                documentosPendientes.forEach((doc, i) => {
                    let tempArr = doc.nombreDocumento.split(/(?=[A-Z])/);
                    let newValue = '';
                    tempArr.forEach(val => {
                        newValue = `${newValue} ${val.toLowerCase()}`;
                    });
                    if (i === 0) {
                        mensaje = mensaje + newValue.trim();
                    } else if (documentosPendientes.length - 1 === i) {
                        mensaje = mensaje + ' y ' + newValue.trim();
                    } else {
                        mensaje = mensaje + ', ' + newValue.trim();
                    }
                });

                let html = `
                <p>Hola ${result.postulanteId.nombre} ${result.postulanteId.apellidos},</p>
                <p>${mensaje} para poder continuar con tu proceso de ingreso en la empresa.</p>
                <p>Puede subir la documentación faltante haciendo click <a href="${ENLACE_WEB}">aquí</a></p>
                <br>
                <p>Saludos,</p>
                <p>Marco Peruana</p>
                `;

                enviarCorreo(result.postulanteId.correo, 'Recordatorio: Documentos Pendientes para Incorporación MARCO PERUANA', html, null);

            }

            res.json({
                ok: true,
                message: 'Se envió recordatorio correctamente'
            });
        });
});

//============================================
// MÉTODO PARA RECORDAR DOCUMENTOS PENDIENTES
//============================================
const recordatorioDocumentosPendientes = () => {
    User.find({ active: true, role: 'postulante' })
        .populate('postulanteId')
        .exec((err, result) => {
            if (err) {
                return console.log(err);
            }

            if (!result) {
                return console.log('No se encontró registro de usuarios activos');
            }

            result.forEach((user) => {
                let documentosPendientes = [];
                user.postulanteId.documentos.forEach((doc) => {
                    if (doc.nombreArchivo.trim().length === 0) {
                        documentosPendientes.push(doc);
                    }
                });

                if (documentosPendientes.length !== 0) {

                    let mensaje = 'Queremos recordarte que aún falta subir el/los documento(s) ';
                    documentosPendientes.forEach((doc, i) => {
                        let tempArr = doc.nombreDocumento.split(/(?=[A-Z])/);
                        let newValue = '';
                        tempArr.forEach(val => {
                            newValue = `${newValue} ${val.toLowerCase()}`;
                        });
                        if (i === 0) {
                            mensaje = mensaje + newValue.trim();
                        } else if (documentosPendientes.length - 1 === i) {
                            mensaje = mensaje + ' y ' + newValue.trim();
                        } else {
                            mensaje = mensaje + ', ' + newValue.trim();
                        }
                    });

                    let html = `
                    <p>Hola ${user.postulanteId.nombre} ${user.postulanteId.apellidos},</p>
                    <p>${mensaje} para poder continuar con tu proceso de ingreso en la empresa.</p>
                    <p>Puede subir la documentación faltante haciendo click <a href="${ENLACE_WEB}">aquí</a></p>
                    <br>
                    <p>Saludos,</p>
                    <p>Marco Peruana</p>
                    `;

                    enviarCorreo(user.postulanteId.correo, 'Recordatorio: Documentos Pendientes para Incorporación MARCO PERUANA', html, null);

                }
            });

        });
}

//=================================
// HABILITAR REENVÍO DE DOCUMENTO
//=================================
router.put('/habilitar-reenvio/:id', [tokenIsValid, isAdminRole], (req ,res) => {
    let id = req.params.id;
    let body = req.body;

    Postulante.findById({_id: id})
        .exec((err, result) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    message: 'Ocurrió un error al buscar al postulante'
                });
            }

            if (!result) {
                return res.status(400).json({
                    ok: false,
                    message: 'No se encontró ningún postulante con ese ID'
                });
            }

            result.documentos.forEach((doc) => {
                if(doc.nombreDocumento === body.nombreDocumento){
                    doc.nombreArchivo = '';
                }
            });

            result.save((err, newPostulante) => {
                if (err) {
                    return res.status(500).json({
                        ok: false,
                        message: 'Ocurrió un error al actualizar al postulante'
                    });
                }

                User.findOneAndUpdate({username: result.dni}, {active: true})
                    .exec((err, result) => {
                        if (err) {
                            return res.status(500).json({
                                ok: false,
                                message: 'Ocurrió un error al buscar al usuario'
                            });
                        }
            
                        if (!result) {
                            return res.status(400).json({
                                ok: false,
                                message: 'No se encontró ningún usuario con ese dni'
                            });
                        }

                        res.json({
                            ok: true,
                            message: 'Se actualizó al nuevo ingreso correctamente'
                        });
                    })
                    
            })
        })

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
        attachments: attachments,
    }).then((resp) => {
        console.log(resp);
    }).catch((err) => {
        console.log(err);
    })
};

//===================================
// OBTENER EXCEL DE NUEVOS INGRESOS
//===================================
router.get('/excel/nuevos-ingresos', [tokenIsValid, isAdminRole], (req, res) => {
    Postulante.find({})
        .exec(async (err, result) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    message: 'Ocurrió un error al buscar nuevos ingresos'
                });
            }

            if (!result) {
                return res.status(400).json({
                    ok: false,
                    message: 'No se encontraron registros'
                });
            }

            let meses = [
                {
                    key: 0,
                    value: 'Enero'
                },
                {
                    key: 1,
                    value: 'Febrero'
                },
                {
                    key: 2,
                    value: 'Marzo'
                },
                {
                    key: 3,
                    value: 'Abril'
                },
                {
                    key: 4,
                    value: 'Mayo'
                },
                {
                    key: 5,
                    value: 'Junio'
                },
                {
                    key: 6,
                    value: 'Julio'
                },
                {
                    key: 7,
                    value: 'Agosto'
                },
                {
                    key: 8,
                    value: 'Septiembre'
                },
                {
                    key: 9,
                    value: 'Octubre'
                },
                {
                    key: 10,
                    value: 'Noviembre'
                },
                {
                    key: 11,
                    value: 'Diciembre'
                }
            ];
            const workbook = new ExcelJS.Workbook();
            let documentos = await Documentos.find();
            meses.forEach((mes) => {
                let regPorMes = [];
                result.forEach((registro) => {
                    if(registro.regDate.getMonth() === mes.key) {
                        regPorMes.push(registro);
                    }
                });

                let fila = 0;
                if(regPorMes.length !== 0) {
                    fila++;
                    const sheet = workbook.addWorksheet(mes.value);
                    let row1 = ['Puesto'];
                    let row2 = ['Nombre'];
                    regPorMes.forEach((registro) => {
                        row1.push(`${registro.puesto}`);
                        row2.push(`${registro.nombre} ${registro.apellidos}`);
                    });
                    
                    let cabecera1 = sheet.addRow(row1);
                    cabecera1.eachCell((celda) => {
                        celda.style = {
                            font: { bold: true }, // Establece la fuente en negrita
                            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'ADCFE5 ' } }, // Establece el fondo de color amarillo
                            border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }
                            // Puedes agregar más estilos según tus necesidades
                        };
                    });
                    
                    let cabecera2 = sheet.addRow(row2);
                    cabecera2.eachCell((celda) => {
                        celda.style = {
                            font: { bold: true }, // Establece la fuente en negrita
                            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'ADCFE5 ' } }, // Establece el fondo de color amarillo
                            border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }
                            // Puedes agregar más estilos según tus necesidades
                        };
                    });

                    documentos.forEach((doc, i) => {
                        let newRow = [];
                        newRow.push(doc.nombreLargo);

                        regPorMes.forEach((reg) => {
                            reg.documentos.forEach((docDeReg) => {
                                if(doc.nombreCorto === docDeReg.nombreDocumento){
                                    if(docDeReg.nombreArchivo.length > 0) {
                                        newRow.push('Subido');
                                    }else{
                                        newRow.push('Pendiente');
                                    }
                                }
                            });
                        });
                        sheet.addRow(newRow);
                    });

                    sheet.addRow(['Inducción']);
                    sheet.addRow(['Prueba psicolaboral']);
                    sheet.addRow(['Examen médico']);

                    sheet.columns.forEach((columna) => {
                        let maxLength = 0;
                        columna.eachCell({ includeEmpty: true }, (celda) => {
                            const length = celda.value ? celda.value.toString().length : 10;
                            if (length > maxLength) {
                                maxLength = length;
                            }
                        });
                        columna.width = maxLength < 10 ? 10 : maxLength + 2; // Ajusta el ancho mínimo de la columna
                    });

                    sheet.eachRow({ includeEmpty: true }, (fila) => {
                        fila.eachCell({ includeEmpty: true }, (celda) => {
                            celda.alignment = { horizontal: 'center', vertical: 'middle' };
                        });
                    });
                    
                }
            });

            const nombreArchivo = 'reporte-nuevos-ingresos.xlsx';
            const rutaTemporal = `./temp/${nombreArchivo}`;
            await workbook.xlsx.writeFile(rutaTemporal);

            res.download(rutaTemporal, (err) => {
                if(err) {
                    res.json({
                        ok: false,
                        err,
                        message: 'Ocurrió un error al descargar el reporte'
                    });
                }else{
                    fs.unlinkSync(rutaTemporal);
                }
            });
        });
});

module.exports = { router, recordatorioDocumentosPendientes };