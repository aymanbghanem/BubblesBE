const express = require('express')
const router = express.Router()
const sendEmail = require('../middleware/contact')
require('dotenv').config()

const validateEmail = (email) => {
  const emailRegex = /^[a-zA-Z][a-zA-Z0-9_.]*@[^\s@]+\.[a-zA-Z]{1,}$/;
  return emailRegex.test(email);
};

router.post(`${process.env.BASE_URL}/contactUs`, async (req, res) => {
  try {
    let { first_name,last_name, number, subject, email, message } = req.body;

    if (!validateEmail(email)) {
      return res.json({ message: "Invalid email address", type: 0 });
    }
    else {
      // await sendEmail(first_name,last_name, number, email, subject, message,);

      res.json({ message: 'Email sent successfully', type: 1 });
    }

  } catch (error) {
    res.json({ message: 'Catch error: ' + error, type: 0 });
  }
});
module.exports = router