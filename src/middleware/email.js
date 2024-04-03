"use strict";
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: '10.100.26.21', 
  port: 25,
  secure: false,
  tls: {
    rejectUnauthorized: false,
  },
  auth: {
    user: "digitalfeedback@jawwal.ps",
  },
});

async function sendEmail(user_name, to, subject, subtitle, password) {
  const info = await transporter.sendMail({
    from: `"digitalfeedback@jawwal.ps"`,
    to: to,
    subject: subject,
    html: `
   <!DOCTYPE html>
   <html lang="en">

   <head>
     <meta charset="UTF-8">
     <meta http-equiv="X-UA-Compatible" content="IE=edge">
     <meta name="viewport" content="width=device-width, initial-scale=1.0">
     <title>Email Template</title>
   </head>

   <body>
   <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; padding: 20px;">
   <h1 style="color: #333; text-align: center;">🌐 Digital Feedback</h1>
   <p style="font-size: 16px;">Dear ${user_name},</p>
   <p style="font-size: 16px;">Thank you for choosing our service. As requested, we have generated a password for you to access your account.</p>
   <p style="font-size: 16px;">Your ${subtitle}: <strong>${password}</strong></p>
   <p style="font-size: 16px;">Please use the above password to login to your account.</p>
   <p style="font-size: 16px;">If you did not request this password or have any concerns, please contact us immediately.</p>
   <p style="font-size: 16px;">Best regards,</p>

</div>

   </body>

   </html>
 `,
  });
  return info;
}

module.exports = sendEmail;
