const express = require("express");
const router = express.Router();
const userModels = require("../models/user.models");
const departmentModel = require('../models/department.models')
const companyModel = require('../models/company.models')
const Location = require('../../src/models/location.models')
const surveyModel = require('../models/survey.models')
const { hashPassword } = require('../helper/hashPass.helper')
const config = require('../../config')
const auth = require('../middleware/auth')
var jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const locationModels = require("../../src/models/location.models");
require('dotenv').config()




// router.get('${process.env.BASE_URL}/getLocations', auth, async (req, res) => {
//     try {
//         let survey_id = req.headers['survey_id'];
//         let role = req.user.user_role;

//         if (role === "admin") {
//             let existingSurvey = await surveyModel.findOne({ _id: survey_id });

//             if (existingSurvey) {
//                 let locations = await locationModels.find({
//                     survey_id: survey_id,
//                     active: 1
//                 }).select('location_name _id');

//                 if (locations.length > 0) {
//                     const dynamicLinks = await Promise.all(locations.map(async (location) => {
//                         const dynamicLink = `http://localhost:2107/dynamic-link?location_id=${location._id}&survey_id=${survey_id}`;
//                         const qrCode = await qr.toDataURL(dynamicLink);
//                         return { location: location.location_name, dynamicLink, qrCode };
//                     }));

//                     res.json({ locations: dynamicLinks });
//                 } else {
//                     res.json({ message: "There are no locations for this survey" });
//                 }
//             } else {
//                 res.json({ message: "The survey you are looking for its locations does not exist" });
//             }
//         } else {
//             res.json({ message: "Sorry, you are unauthorized" });
//         }
//     } catch (error) {
//         res.json({ message: "Catch error " + error });
//     }
// });

// router.get('/dynamic-link', (req, res) => {
//     const location_id = req.query.location_id;
//     const survey_id = req.query.survey_id; // Include survey_id
//     res.redirect(`http://localhost:2107/location/${location_id}?survey_id=${survey_id}`);
// });

// router.get('${process.env.BASE_URL}/getLeafLocation', auth, async (req, res) => {
//     try {
//         let survey_id = req.headers['survey_id'];
//         let role = req.user.user_role;

//         if (role === "admin") {
//             let existingSurvey = await surveyModel.findOne({ _id: survey_id });

//             if (existingSurvey) {
//                 const mainRoots = await locationModels.find({
//                     survey_id: survey_id,
//                     parent_id: null,
//                     active: 1
//                 });

//                 const leafLocations = await Promise.all(mainRoots.map(async (root) => {
//                     return await getLeafLocations(root._id, survey_id);
//                 }));

//                 const flatLeafLocations = leafLocations.flat();
//                 const dynamicLinksAndQRCodes = await generateDynamicLinksAndQRCodes(flatLeafLocations);

//                 res.json({ message:dynamicLinksAndQRCodes });
//             } else {
//                 res.json({ message: "The survey you are looking for its locations does not exist" });
//             }
//         } else {
//             res.json({ message: "Sorry, you are unauthorized" });
//         }
//     } catch (error) {
//         res.json({ message: "Catch error " + error.message });
//     }
// });

// const getLeafLocations = async (parentId, survey_id) => {
//     const location = await locationModels.findOne({ _id: parentId, active: 1 });

//     if (!location) {
//         return null; // Return null if location is not found
//     }

//     const subLocations = await locationModels.find({ parent_id: parentId, active: 1 });
//     const leafLocations = await Promise.all(subLocations.map(async (subLocation) => {
//         return await getLeafLocations(subLocation._id, survey_id);
//     }));

//     // If location has no subLocations, or all its subLocations are leaf nodes, include it in the result
//     if (subLocations.length === 0 || leafLocations.every(leaf => leaf === null)) {
//         return [{
//             _id: location._id,
//             location_name: location.location_name,
//             parent_id: location.parent_id,
//             active: location.active,
//             description: location.location_description,
//             survey_id: survey_id,
//         }];
//     }

//     return leafLocations.filter(Boolean).flat();
// };

// const generateDynamicLinksAndQRCodes = async (leafLocations) => {
//     const dynamicLinksAndQRCodes = await Promise.all(leafLocations.map(async (leafLocation) => {
//         const dynamicLink = `http://localhost:2107/dynamic-link?location_id=${leafLocation._id}&survey_id=${leafLocation.survey_id}`;
//         const qrCode = await qr.toDataURL(dynamicLink);

//         return {
//             dynamicLink,
//             qrCode,
//             location: leafLocation.location_name,
//         };
//     }));

//     return dynamicLinksAndQRCodes;
// };

// router.post('${process.env.BASE_URL}/addLocation', auth, async (req, res) => {
//     try {
//         const { location_data, survey_title } = req.body;
//         const role = req.user.user_role;
//         const department = req.user.department_id;

//         if (role === 'admin') {
            
//                 const idToLocationMap = new Map();

//                 for (const locationData of flattenLocationData(location_data)) {
//                     const { id, location_name, location_description, parentId } = locationData;

//                     const location = new Location({
//                         location_name: location_name,
//                         department_id: department,
//                         id: id,
//                        // survey_id: existingSurvey._id,
//                         location_description: location_description
//                     });

//                     await location.save();

//                     // Store the MongoDB-generated ID for later reference
//                     locationData.mongoId = String(location._id);

//                     // Store the location in the map for potential parent references
//                     idToLocationMap.set(id, location);
//                 }

//                 // Assign parent references based on the provided parent IDs
//                 for (const locationData of flattenLocationData(location_data)) {
//                     const { id, parentId } = locationData;

//                     const location = idToLocationMap.get(id);
//                     const parent = parentId !== null ? idToLocationMap.get(parentId) : null;

//                     // Check if location and parent exist before updating the parent reference
//                     if (location) {
//                         await Location.updateOne({ _id: location._id }, { parent_id: parent ? parent._id : null });
//                     }
//                 }

//                 res.status(200).json({ message: 'Locations stored and parent references assigned successfully!' });
           
//         } else {
//             res.json({ message: "Sorry, you are unauthorized." });
//         }
//     } catch (error) {
//         res.status(500).json({ message: "Catch error " + error });
//     }
// });

function flattenLocationData(locationData, parentId = null) {
    let result = [];
    for (const item of locationData) {
        result.push({
            id: item.id,
            location_name: item.location_name,
            location_description: item.location_description || "",
            parentId: parentId !== null ? parentId : null,
        });
        if (item.subLocations && item.subLocations.length > 0) {
            result = result.concat(flattenLocationData(item.subLocations, item.id));
        }
    }
    return result;
}


router.get(`${process.env.BASE_URL}/getRootLocation`, auth, async (req, res) => {
    try {
        let role = req.user.user_role
        if (role == "admin") {
            let locations = await locationModels.find({
                department_id: req.user.department_id,
                active: 1,
                parent_id: null,
                clone:0,
            }).select('location_name ')
            if (locations.length != 0) {
                res.json({ message: locations,type:2 })
            }
            else {
                res.json({ message: 'no data found',type:0 })
            }
        }
        else {
            res.json({ message: "Sorry, you are unauthorized.",type:0 });
        }
    } catch (error) {
        res.json({ message: "catch error " + error })
    }
})

router.get(`${process.env.BASE_URL}/getLocationInfo`,async (req, res) => {
    try {
      
         let parentId = req.headers['location_id']
        const mainRoot = await locationModels.findOne({ _id: parentId, parent_id: null, active: 1 });
       
        if (mainRoot) {
            const locationTree = await getLocationsTree(mainRoot._id);
            res.json({ message: locationTree ,type:2 });
        } else {
            res.json({ message: "Main root not found",type:0 });
        }
    } catch (error) {
        res.json({ message: "catch error " + error });
    }
});

const getLocationsTree = async (parentId) => {
    const location = await locationModels.findOne({ _id: parentId, active: 1 });

    if (!location) {
        return null; // Return null if location is not found
    }

    const subLocations = await locationModels.find({ parent_id: parentId, active: 1 });
    const subTrees = await Promise.all(subLocations.map(async (subLocation) => {
        return await getLocationsTree(subLocation._id);
    }));

    return {
        id: location._id,
        location_name: location.location_name,
        parentId: location.parent_id,
        active: location.active,
        location_description: location.location_description,
        sublocations: subTrees.filter(Boolean), // Remove null values
    };
};

router.get(`${process.env.BASE_URL}/getLocations`, auth, async (req, res) => {
    try {
        let survey_id = req.headers['survey_id'];
        let role = req.user.user_role;

        if (role == "admin" || role == "owner" || role == "survey-reader") {
            let existingSurvey = await surveyModel.findOne({ _id: survey_id, active:1});

            if (existingSurvey) {
                let locations = await locationModels.find({
                    survey_id: survey_id,
                    active: 1
                }).select('_id location_name parent_id');

                if (locations.length > 0) {
                    const locationTree = await buildLocationTree(locations);

                    res.json({ message: locationTree,type:2 });
                } else {
                    res.json({ message: "No locations found for this survey.", type: 0 });
                }
            } else {
                res.json({ message: "The survey you are looking for does not exist.", type: 0 });
            }
        } else {
            res.json({ message: "Sorry, you are unauthorized",type:0 });
        }
    } catch (error) {
        res.json({ message: "Catch error " + error });
    }
});

const buildLocationTree = async (locations) => {
    const locationTree = [];

    const getLocationPath = async (locationId) => {
        const path = [];
        let currentLocation = await locationModels.findOne({ _id: locationId, active: 1 });

        while (currentLocation) {
            path.unshift(currentLocation.location_name);
            currentLocation = await locationModels.findOne({ _id: currentLocation.parent_id, active: 1 });
        }

        return path.join('/');
    };

    for (const location of locations) {
        const path = await getLocationPath(location._id);
        locationTree.push({ _id:location._id,location_name: location.location_name, location_path: path });
    }

    return locationTree;
};

router.get(`${process.env.BASE_URL}/getLeafLocation`, auth, async (req, res) => {
    try {
        let survey_id = req.headers['survey_id'];
        let role = req.user.user_role;

        if (role == "admin") {
            let existingSurvey = await surveyModel.findOne({ _id: survey_id });

            if (existingSurvey) {
                const mainRoots = await locationModels.find({
                    survey_id: survey_id,
                    parent_id: null,
                    active: 1
                });

                const leafLocations = await Promise.all(mainRoots.map(async (root) => {
                    return await getLeafLocations(root._id, root.location_name);
                }));

                res.json({ message: leafLocations.flat() ,type:2}); // Flattening the result array
            } else {
                res.json({ message: "The survey you are looking for its locations does not exist",type:0 });
            }
        } else {
            res.json({ message: "Sorry, you are unauthorized",type:0 });
        }
    } catch (error) {
        res.json({ message: "Catch error " + error.message });
    }
});

const getLeafLocations = async (parentId, parentPath) => {
    const location = await locationModels.findOne({ _id: parentId, active: 1 });

    if (!location) {
        return null; // Return null if location is not found
    }

    const subLocations = await locationModels.find({ parent_id: parentId, active: 1 });
    const leafLocations = [];

    for (const subLocation of subLocations) {
        const subLocationPath = parentPath ? `${parentPath.replace(/\s+/g, '')}/${subLocation.location_name}` : subLocation.location_name;
        const subLocationLeaf = await getLeafLocations(subLocation._id, subLocationPath);
        leafLocations.push(...subLocationLeaf);
    }

    // If location has no subLocations, include it in the result
    if (subLocations.length === 0) {
        return [{
            _id: location._id,
            location_name: location.location_name,
            parentId: location.parent_id,
            active: location.active,
            description: location.location_description,
            location_path: parentPath ? `${parentPath.replace(/\s+/g, '')}` : location.location_name,
        }];
    }

    // Return the array of leaf locations for the current path
    return leafLocations.filter(Boolean);
};


// router.put('${process.env.BASE_URL}/updateLocation', auth, async(req, res) => {
//     try {
//         let role = req.user.user_role;
        
//         if (role === 'admin') {
//             const { location_updates } = req.body;

//             // Check if location_updates is an array
//             if (!Array.isArray(location_updates)) {
//                 return res.json({ message: 'Invalid input. location_updates must be an array.' });
//             }

//             // Iterate through each location update
//             for (const update of location_updates) {
//                 const {id, name,active } = update;

//                 // Check if the provided location_id exists
//                 const existingLocation = await locationModels.findOne({ _id:id, active: 1 });

//                 if (!existingLocation) {
//                     return res.status(404).json({ message: `Location with ID ${id} not found` });
//                 }

//                 // Update the location name
//                 await locationModels.updateOne({ _id:id }, { location_name: name,active:active,location_description:description });
//             }

//             res.status(200).json({ message: 'Locations updated successfully!' });
//         } else {
//             res.status(403).json({ message: 'Unauthorized access' });
//         }
//     } catch (error) {
//         res.status(500).json({ message: 'Catch error ' + error });
//     }
// });


module.exports = router

