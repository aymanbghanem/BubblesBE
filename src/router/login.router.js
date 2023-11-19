const express = require("express");
const router = express.Router();
const config = require('../../config')
const userModels = require("../models/user.models");
const {hashPassword,compareHashedPassword} = require('../helper/hashPass.helper')
const auth = require('../middleware/auth')
var jwt = require('jsonwebtoken');
require('dotenv').config()

router.post('/api/v1/login',async(req,res)=>{
      try {
         let {user_name,email_address,password} = req.body
         const existingUser = await userModels.findOne({
           user_name: user_name
        })
        if(existingUser){
            compareHashedPassword(password,existingUser.password,async (error, result) => {
                if (error) {
                  console.error(error);
                  res.json({message:"incorrect password"});
                } else {
                    let token = jwt.sign({ email: existingUser.email_address }, process.env.TOKEN_KEY);
                    let user = await userModels.findOneAndUpdate({ email_address: existingUser.email_address }, { token }, { new: true });
                    let response = {
                      message: "successfully added",
                      token: user.token,
                      user_role: user.user_role,
                      email_address: user.email_address,
                  };
                  res.json({ response });
                 
                }
              });
        }
        else{
            res.json({message:"Incorrect user name or password"})
        }
      } catch (error) {
        
      }
})

router.patch("/api/v1/logout", auth, async (req, res) => {
  try {
    let id = req.user._id;
    let user = await userModels.findByIdAndUpdate({ _id: id }, { token: null }, { new: true });
    let token = user.token
    res.json({ message: "token is null", token });
  } catch (error) {
    res.status(500).json({ message: "catch error " + error });
  }
});

module.exports = router
