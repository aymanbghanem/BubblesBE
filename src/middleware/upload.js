// let multer = require('multer');

// const HME = (error,req,res,next)=>{
//     if(error){
//            res.status(400).json({message:"multer error",error})
//     }else{
//         next()
//     }
// }

// function myMulter(){
//     const storage = multer.diskStorage({
//         //diskStorage : the file + where i want to store it
//         destination: function (req, file, cb) {
//           cb(null, 'logo/')
//           //cb:take two arr ,the first one is the error and the other is the folder where i want to store the files
//         },
//         //file name
//         filename: function (req, file, cb) {
//         cb(null, Date.now() + "-" + Math.random() * 10 + "-" + file.originalname);
//         }
//       })
//     function fileFilter(req, file, cb) {
//         if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/") ||
//             file.mimetype.startsWith("application/") || file.mimetype.startsWith("text/")) {
//             //to filter the type of the input (pdf or image ...etc)
//             cb(null, true);
//         } else {
//             cb(null, false);
//         }
//     }
//       //dest:upload from where he should start
//       const upload = multer({ storage, fileFilter }) //upload here is a var 
//       return upload;
// }
// module.exports= {myMulter,HME}

const multer = require('multer');
const fs = require('fs');

// Multer configuration function with category parameter
function myMulter(category) {
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      // Get the category from the query parameter or request body
      const selectedCategory = req.query.company || 'spam';
      const categoryFolder = `logo/${selectedCategory}/`;

      // Check if the folder exists, and create it if it doesn't
      if (!fs.existsSync(categoryFolder)) {
        fs.mkdirSync(categoryFolder, { recursive: true });
      }

      cb(null, categoryFolder);
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

module.exports = { myMulter };
