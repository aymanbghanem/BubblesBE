const express = require("express");
const router = express.Router();
const config = require('../../config')
const userModels = require("../models/user.models");
const { hashPassword, compareHashedPassword } = require('../helper/hashPass.helper')
const auth = require('../middleware/auth')
var jwt = require('jsonwebtoken');
require('dotenv').config()

router.post('/api/v1/login', async (req, res) => {
  try {
    let { user_name, email_address, password } = req.body
    
    user_name = user_name.toLowerCase()
    const existingUser = await userModels.findOne({
      user_name: user_name
    })

    if (existingUser) {
     // compareHashedPassword(password, existingUser.password,async (err, result) => {
      //  if (err) {
          //res.json({ message: "Incorrect password" });
      //  } else if (result) {
        //,{ expiresIn: '10m' }
        let token = jwt.sign({ user_name: existingUser.user_name }, process.env.TOKEN_KEY);
        let user = await userModels.findOneAndUpdate({ user_name: existingUser.user_name ,active:1}, { token }, { new: true });
        let response = {
          message: "login successfully",
          token: user.token,
      };
        res.json({ message:response});
       // } else {
        //  res.json({ message: "Incorrect password" });
       // }
   //   });
    } else {
      res.status(200).json({ message: "Incorrect user name" });
    }
  } catch (error) {
    // Handle errors
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.patch("/api/v1/logout", auth, async (req, res) => {
  try {
    let id = req.user._id;
    let user = await userModels.findByIdAndUpdate({ _id: id }, { token: null }, { new: true });
    let token = user.token
    res.json({ message:token });
  } catch (error) {
    res.status(500).json({ message: "catch error " + error });
  }
});

module.exports = router
