"use strict";
const nodemailer = require("nodemailer");
require('dotenv').config()
// reset your password
const transporter = nodemailer.createTransport({
    host: '10.100.26.21',
    port: 25,
    secure: false, // Disabling TLS
    tls: {
        // Do not attempt to upgrade non-secure connections to secure
        rejectUnauthorized: false,
    },
});
// await sendEmail(name, number, email, subject, message);
async function sendEmail(first_name,last_name, number, from, subject, message) {
    const info = await transporter.sendMail({
        from: `${from}`,
        to: process.env.TO_EMAIL,
        cc: process.env.CC_EMAIL,  // Add CC recipients (can be an array of email addresses)
        bcc:process.env.BCC_EMAIL,
        subject: `New Contact Inquiry - ${subject}`,
        html: `
        <!DOCTYPE html>
        <html lang="en">
        
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Email Template</title>
        </head>
        
        <body style="max-width: 600px; margin: 0 auto; font-family: 'Arial', sans-serif; padding: 20px;">
        
            <div style="padding: 15px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);">
        
                <h1 style="color: #333; text-align: center; margin-bottom: 15px;">🌐 Digital Feedback</h1>
        
                <p style="font-size: 16px; line-height: 1.4; margin-bottom: 10px;">Hello,</p>
                <p style="font-size: 16px; line-height: 1.4; margin-bottom: 10px;">You have a new contact inquiry from:</p>
                <p style="margin-bottom: 5px;"><strong>${first_name} ${last_name}</strong> can be reached at <strong>${number}</strong> for further communication.</p>
                <p style="font-size: 16px;"><strong>Message:</strong></p>
                <p style="font-size: 16px; ">${message}</p>
        
            </div>
        
            <p style="font-size: 16px; margin-bottom: 5px;">Best regards,</p>
            <p style="font-size: 18px; font-weight: bold; text-align: center; margin-top: 15px;">Digital Support Team</p>
        
        </body>
        
        </html>
        
 `,
    });

    return info;
}

module.exports = sendEmail;
