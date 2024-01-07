"use strict";
const nodemailer = require("nodemailer");
//reset your password
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "misksawallha@gmail.com",
    pass: "fmyl ixbz pcik qsdb", 
  },
});

async function sendEmail(user_name,to, subject,password,message) {
  const info = await transporter.sendMail({
    from: `"Digital Feed Back "`,
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

   <body>
     <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; padding: 20px;">
       <h1 style="color: #333;">Digital Feed Back 👋</h1>
       <p style="color: #555;">Dear ${user_name},</p>
       <p style="color: #555;">This is an email ${message}.</p>
       <p style="color: #555;">Your new password : <strong>${password}</strong></p>
       <p style="color: #555;">Thank you for your attention!</p>
       <p style="color: #555;">Best regards,</p>
       <p style="color: #333;">Digital support</p>
     </div>
   </body>

   </html>
 `,
  });

  return(info.messageId);
}

module.exports = sendEmail
