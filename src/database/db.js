var mongoose = require("mongoose");
require('dotenv').config()

var connectDB = function () {
    return mongoose.connect(process.env.DB_URL).then(function (res) {
        console.log("Connected with DB");
    }).catch(function (error) {
        console.log("fail to connect with DB..." + error);
    });
};

module.exports = connectDB;
