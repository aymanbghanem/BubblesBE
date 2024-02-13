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


/*



const fetchData = async () => {
  try {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX25hbWUiOiJzdXBlcmFkbWluIiwiaWF0IjoxNzA3ODEwODA4fQ.8c-FN9m4pympYgWDohsbbrpoWQdON3eSP7LwtnzaJlg';  // Replace with your actual JWT token

    const response = await fetch('http://localhost:2107/api/v1/getReport', {
      method: 'GET',  // or 'POST', 'PUT', etc., depending on your API
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorMessage = await response.json();
      console.error(errorMessage);  // Handle the error on the frontend as needed
    } else {
      const data = await response.json();
      console.log(data);  // Handle the successful response data
    }
  } catch (error) {
    console.error('An error occurred while fetching data:', error);
  }
};

fetchData();




*/