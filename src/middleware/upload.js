let multer = require('multer');

const HME = (error,req,res,next)=>{
    if(error){
           res.status(400).json({message:"multer error",error})
    }else{
        next()
    }
}

function myMulter(){
    const storage = multer.diskStorage({
        //diskStorage : the file + where i want to store it
        destination: function (req, file, cb) {
          cb(null, 'logo')
          //cb:take two arr ,the first one is the error and the other is the folder where i want to store the files
        },
        //file name
        filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + Math.random() * 10 + "-" + file.originalname);
        }
      })
    function fileFilter(req, file, cb) {
        if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/") ||
            file.mimetype.startsWith("application/") || file.mimetype.startsWith("text/")) {
            //to filter the type of the input (pdf or image ...etc)
            cb(null, true);
        } else {
            cb(null, false);
        }
    }
      //dest:upload from where he should start
      const upload = multer({ storage, fileFilter }) //upload here is a var 
      return upload;
}
module.exports= {myMulter,HME}