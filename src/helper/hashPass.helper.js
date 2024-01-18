// const bcrypt = require('bcrypt');
// require('dotenv').config();

 
// const saltRounds = parseInt(process.env.SALT_ROUND);

// function hashPassword(password, callback) {
//   bcrypt.genSalt(saltRounds, (err, salt) => {
//     if (err) {
//       console.error(err);
//     } else {
//       // Hash the password with the generated salt
//       bcrypt.hash(password, salt, (err, hash) => {
//         if (err) {
//           console.error(err);
//         } else {
//           console.log('Hashed Password:', hash);
//           callback(hash); // Pass the hashed password to the callback function
//         }
//       });
//     }
//   });
// }



// function compareHashedPassword(user_input_password, hashed_password, callback) {
//   bcrypt.compare(user_input_password, hashed_password, (err, result) => {
//     if (err) {
//       console.error(err);
//       callback(err, null);
//     } else if (result) {
//       callback(null, result);
//     } else {
//       callback('Password is incorrect', null);
//     }
//   });
// }



// module.exports = {hashPassword,compareHashedPassword};
