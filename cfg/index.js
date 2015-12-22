module.exports = {
    email: {
        enabled: process.env.EMAIL_ENABLED || true,
        enableSMTP: process.env.EMAIL_SMTP || false,
        transporter: {
            host: process.env.TRANSPORTER_HOST,
            port: process.env.TRANSPORTER_PORT,
            auth: {
                user: process.env.TRANSPORTER_AUTH_USER,
                pass: process.env.TRANSPORTER_AUTH_PASS
            }
        },
        sendMail: {
            from: 'pass@copaseguridad.com',
            replyTo: 'pass@copaair.com',
            bcc: 'mike.aaron@gmail.com',
            subject: 'Copaair Portal account',
            loginUrl: 'http://www.copaseguridad.com/portal/site/en/login.html'
        }
    },
    mongo: process.env.MONGO_URL || 'mongodb://korean:EntranceGranted1234@ds035485.mongolab.com:35485/korean-air-reports',
    port: process.env.PORT || 5855
};
