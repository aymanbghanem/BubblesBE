const  express = require('express')
const router = express.Router()
const sendEmail = require('../middleware/contact')
require('dotenv').config()

router.post(`${process.env.BASE_URL}/contactUs`, async (req, res) => {
    try {
      let { name, number, subject, email, message } = req.body;
  
      await sendEmail(name, number, email, subject, message);
  
      res.json({ message: 'Email sent successfully' });
    } catch (error) {
      res.json({ message: 'Catch error: ' + error });
    }
  });
module.exports = router