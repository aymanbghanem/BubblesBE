"use strict";
const nodemailer = require("nodemailer");
//reset your password
const transporter = nodemailer.createTransport({
  host: '10.100.26.21', 
  port: 25,
  secure: false, // Disabling TLS
  tls: {
    // Do not attempt to upgrade non-secure connections to secure
    rejectUnauthorized: false,
  },
  auth: {
    user: "digitalfeedback@jawwal.ps",
  },
});


async function sendNotificationEmail(user_name,to, subject,question,location,answer) {
  const info = await transporter.sendMail({
    from: `"digitalfeedback@jawwal.ps"`,
    to: to,
    subject: subject,
    // text: password,
   html: `
   <!DOCTYPE html>
   <html lang="en">

   <head>
     <meta charset="UTF-8">
     <meta http-equiv="X-UA-Compatible" content="IE=edge">
     <meta name="viewport" content="width=device-width, initial-scale=1.0">
     <title>Email Template</title>
   </head>

   <body  padding: 20px; ">

   <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; padding: 20px;">
 
     <h1 style="color: #333; text-align: center;">🌐 Digital Feedback</h1>
 
     <p style="font-size: 16px;">Dear ${user_name},</p>
 
     <p style="font-size: 16px;">We hope this email finds you well.</p>
 
     <p style="font-size: 16px;">User has answered the following question:</p>
 
     <p style="font-size: 16px;"><strong>${question}</strong></p>
 
     ${location != null ? `<p style="font-size: 16px;">For this location: <strong>${location}</strong></p>` : ''}
     
     ${answer != null ? `<p style="font-size: 16px;">with answer: <strong>${answer}</strong></p>` : ''}
 
     <p style="font-size: 16px;">Thank you for your attention!</p>
 
     <p style="font-size: 16px;">Best regards,</p>
 
     <p style="font-size: 18px; font-weight: bold; text-align: center;">Digital Support Team</p>
 
   </div>
 
 </body>
 

   </html>
 `,
  });

  return(info.messageId);
}

module.exports = sendNotificationEmail
