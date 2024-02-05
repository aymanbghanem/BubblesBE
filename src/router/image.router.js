const express = require("express");
const router = express.Router();
const {myMulter} = require('../middleware/upload');
const {answersImageUploader} = require('../middleware/answersImage')
const auth = require('../middleware/auth')
require('dotenv').config()

router.post(`${process.env.BASE_URL}/uploadImage`,auth,myMulter().single('image'),async(req,res)=>{
    try {
        let logo=req.file.filename;
        if (req.file) {
          if (req.file.mimetype.startsWith("image/")) {
            res.json(logo);
          } 
          else {
            try {
              const filePath = path.resolve(__dirname, '..', '..', 'logo', req.file.filename);
              fs.unlink(filePath, (error) => {
                if (error) {
                  res.json(`An error occurred while trying to delete the file: ${error}`);
                } else {
                  res.json(`wrong image type 1`);
                }
              });
            } catch (error) {
              res.json({ message: "catch error " + error });
            }
          }
        }
      } catch (error) {
        res.json("wrong image type "+error);
      }
})

router.post(`${process.env.BASE_URL}/uploadAnswersImage`,answersImageUploader().single('image'),async(req,res)=>{
  try {
      let logo=req.file.filename;
      if (req.file) {
        if (req.file.mimetype.startsWith("image/")) {
          res.json(logo);
        } 
        else {
          try {
            const filePath = path.resolve(__dirname, '..', '..', 'answersImage', req.file.filename);
            fs.unlink(filePath, (error) => {
              if (error) {
                res.json(`An error occurred while trying to delete the file: ${error}`);
              } else {
                res.json(`wrong image type 1`);
              }
            });
          } catch (error) {
            res.json({ message: "catch error " + error });
          }
        }
      }
    } catch (error) {
      res.json("wrong image type "+error);
    }
})
module.exports = router
