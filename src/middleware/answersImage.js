const companyModel = require('../models/company.models')
const multer = require('multer');
const fs = require('fs');

// Multer configuration function with category parameter
function answersImageUploader() {
  const storage = multer.diskStorage({
    destination:async function (req, file, cb) {
      // Get the category from the query parameter or request body
      //console.log(req.user)
     

      // Check if the folder exists, and create it if it doesn't
      if (!fs.existsSync("answersImage")) {
        fs.mkdirSync("answersImage", { recursive: true });
      }

      cb(null,"answersImage");
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + "-" + Math.random() * 10 + "-" + file.originalname);
    }
  });

  function fileFilter(req, file, cb) {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }

  const upload = multer({ storage, fileFilter });
  return upload;
}

module.exports = { answersImageUploader };
