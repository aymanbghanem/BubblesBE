const express = require("express");
const router = express.Router();
const userModels = require("../models/user.models");
const departmentModel = require('../models/department.models')
const companyModel = require('../models/company.models')
const Location = require('../../src/models/location.models')
const { hashPassword } = require('../helper/hashPass.helper')
const config = require('../../config')
const auth = require('../middleware/auth')
var jwt = require('jsonwebtoken');
require('dotenv').config()

router.post('/api/v1/addLocation', auth, async (req, res) => {
    try {
        const { location_tree } = req.body;
        const idToLocationMap = new Map();
        const role = req.user.user_role;

        if (role == 'admin') {
            // Store the MongoDB-generated IDs for each location
            for (const locationData of location_tree) {
                const { id, name, parentId } = locationData;

                const location = new Location({
                    location_name: name,
                    id: id,
                });

                await location.save();

                // Store the MongoDB-generated ID for later reference
                locationData.mongoId = String(location._id);

                // Store the location in the map for potential parent references
                // Store the whole object, use 'id' as the key consistently
                idToLocationMap.set(id, location);
            }

            // Assign parent references based on the provided parent IDs
            for (const locationData of location_tree) {
                const { id, parentId } = locationData;

                const location = idToLocationMap.get(id);
                const parent = parentId !== null ? idToLocationMap.get(parentId) : null;

                // Check if location and parent exist before updating the parent reference
                if (location) {
                    await Location.updateOne({ _id: location._id }, {  parent_id: parent ? parent._id : null });
                }
            }

            res.status(200).json({ message: 'Locations stored and parent references assigned successfully!' });
        } else {
            res.json({ message: "Sorry, you are unauthorized." });
        }
    } catch (error) {
        res.status(500).json({ message: "Catch error " + error });
    }
});




// router.post('/api/v1/addLocation',auth,async(req,res)=>{
//     try {
//         const role = req.user.user_role;
//         const {location_tree} = req.body
//         if(role=='admin'){

//         }
//         else{
//             res.json({ message: "Sorry, you are unauthorized." });
//         }
//     } catch (error) {
//         res.status(500).json({message:"catch error "})
//     }
// })

module.exports = router