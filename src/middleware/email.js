"use strict";
var nodemailer = require("nodemailer");
require('dotenv').config();

function sendEmail(password, dest, subject, message) {
    return nodemailer.createTestAccount().then(function (testAccount) {
        var transporter = nodemailer.createTransport({
            host: "misk.sawalha@jawwal.ps", // Replace with your company's SMTP server
            port: 25, // Replace with the appropriate port for your company's SMTP server
            secure: false, // Set to true if your company's server requires a secure connection (SSL/TLS)
            auth: {
                user: "misk.sawalha@jawwal.ps", // Replace with your company's email address
                pass: "11821074Mesho2000", // Replace with your company's email password
            },
        });

        return transporter.sendMail({
            from: "misk.sawalha@jawwal.com", // Replace with your company's email address
            to: "misksawallha@gmail.com",
            subject: "subject",
            text: "message",
            html: `<b>"{message}"${password}</b>`,
        }).then(function (info) {
            console.log(info);
            return info;
        });
    });
}

module.exports = sendEmail;
