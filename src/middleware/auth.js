const jwt = require("jsonwebtoken");
const User = require("../models/user.models");
require('dotenv').config();

const auth = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");

    if (!authHeader) {
      throw new Error("Authorization header is missing");
    }
    const token = authHeader.replace("Bearer Digital_Feedback_token@", "");
    jwt.verify(token, process.env.TOKEN_KEY, async function (err, decode) {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          res.json({ message: "Your session has expired. Please log in again to continue.", type: 0 });
        } else {
          res.json({ message: "Invalid token format. Please provide a valid token.", type: 0 });
        }
      } else {
        const user = await User.findOne({
          user_name: decode.user_name,
          active: 1,
        });

        if (!user) {
          res.json({ message: "User authentication failed. Please check your credentials.", type: 0 });
        } else {
          req.user = user;
          next();
        }
      }
    });
  } catch (e) {
    res.json({ error: "Please authenticate.", type: 0 });
  }
};

module.exports = auth;
