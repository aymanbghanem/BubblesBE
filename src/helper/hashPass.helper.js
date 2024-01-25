const bcrypt = require('bcryptjs');
require('dotenv').config();

const saltRounds = parseInt(process.env.SALT_ROUND);

async function hashPassword(password) {
    try {
        const salt = await bcrypt.genSalt(saltRounds);
        const hash = await bcrypt.hash(password, salt);
      //  console.log('Hashed Password:', hash);
        return hash;
    } catch (error) {
        console.error(error);
        throw error; // Rethrow the error to be caught by the caller
    }
}

function compareHashedPassword(user_input_password, hashed_password, callback) {
    bcrypt.compare(user_input_password, hashed_password, (err, result) => {
        if (err) {
          //  console.error(err);
            callback(err, null);
        } else if (result) {
            callback(null, result);
        } else {
            callback('Password is incorrect', null);
        }
    });
}

module.exports = { hashPassword, compareHashedPassword };
