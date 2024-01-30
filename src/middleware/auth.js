const jwt = require("jsonwebtoken");
const User = require("../models/user.models");
require('dotenv').config()

const auth = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header missing");
    }
 
    const token = authHeader.replace("Bearer Digital_Feedback_token@", "");

    jwt.verify(token, process.env.TOKEN_KEY, async function (err, decode) {
      if (err) {
        res.json({ message: "Your session has expired. Please log in again to continue.",type:0 });
      } else {
        
        const user = await User.findOne({
          user_name: decode.user_name,
          active: 1,
        });
        if (!user) {
          res.json({message:"user authentication failed",type:0});
        }
        else{
          req.user = user;
          next();
        }
       
      }
    });
  } catch (e) {
    
    res.send({ error: "Please Authenticate",type:0 });
  }
};

module.exports = auth;
