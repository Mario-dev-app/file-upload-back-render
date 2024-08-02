const FILES_URL = './files';
const SRC_URL = './recursos-nuevo-ingreso';
const SEED = 'M4rC0P3ru4n4';
const PORT = 3000;
const ENLACE_WEB = 'http://54.208.87.50:4200';
const MONGODB = 'mongodb://127.0.0.1:27017/proyectoRRHH';
const mailParams = {
    host: "smtp-mail.outlook.com", // hostname
    secureConnection: false, // TLS requires secureConnection to be false
    port: 587, // port for secure SMTP
    auth: {
        user: "mperaltaw@outlook.com",
        pass: process.env.PASS_CORREO
    },
    tls: {
        ciphers:'SSLv3'
    }
};

module.exports = {
    FILES_URL,
    SRC_URL,
    SEED,
    PORT,
    MONGODB,
    mailParams,
    ENLACE_WEB
}