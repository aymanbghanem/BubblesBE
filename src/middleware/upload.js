let multer = require('multer');
function myMulter() {
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'innovator');
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + "-" + Math.random() * 10 + "-" + file.originalname);
    }
  });

  function fileFilter(req, file, cb) {
    const allowedMimeTypes = [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }

  const upload = multer({ storage, fileFilter });
  return upload;
}

module.exports = myMulter;

module.exports= {myMulter}