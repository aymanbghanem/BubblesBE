const express = require("express");
const auth = require("../middleware/auth");
const router = express.Router();



router.post('/api/v1/addQR',auth,async(req,res)=>{
    try {
        let role = req.user.user_role
        let location_id = req.headers['location_id']
        let survey_id = req.headers['survey_id']
        let {link} = req.body
        if(role=="admin"){
          
        }
        else{
            res.json({message:"sorry, you are unauthorized"})
        }
    } catch (error) {
        res.json({message:"catch error "+error})
    }
})

module.exports = router