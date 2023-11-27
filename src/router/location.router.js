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
const locationModels = require("../../src/models/location.models");
require('dotenv').config()


router.post('/api/v1/addLocation', auth, async (req, res) => {
    try {
        const { location_tree } = req.body;
        const role = req.user.user_role;
        const department = req.user.department_id;

        if (role == 'admin') {
                const idToLocationMap = new Map();

                // Iterate through each set of locations for a survey
                for (const locationsSet of location_tree) {
                    // Store the MongoDB-generated IDs for each location in the set
                    for (const locationData of locationsSet) {
                        const { id, name, parentId } = locationData;

                        const location = new Location({
                            location_name: name,
                            department_id: department,
                            id: id,
                           
                        });

                        await location.save();

                        // Store the MongoDB-generated ID for later reference
                        locationData.mongoId = String(location._id);

                        // Store the location in the map for potential parent references
                        // Store the whole object, use 'id' as the key consistently
                        idToLocationMap.set(id, location);
                    }

                    // Assign parent references based on the provided parent IDs for the current set
                    for (const locationData of locationsSet) {
                        const { id, parentId } = locationData;

                        const location = idToLocationMap.get(id);
                        const parent = parentId !== null ? idToLocationMap.get(parentId) : null;

                        // Check if location and parent exist before updating the parent reference
                        if (location) {
                            await Location.updateOne({ _id: location._id }, { parent_id: parent ? parent._id : null });
                        }
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

router.get('/api/v1/getRootLocation', auth, async (req, res) => {
    try {
        let role = req.user.user_role
        if (role == "admin") {
            let locations = await locationModels.find({
                department_id: req.user.department_id,
                active: 1,
                parent_id: null
            }).select('location_name ')
            if (locations.length != 0) {
                res.json({ message: locations })
            }
            else {
                res.json({ message: 'no data found' })
            }
        }
        else {
            res.json({ message: "Sorry, you are unauthorized." });
        }
    } catch (error) {
        res.json({ message: "catch error " + error })
    }
})

router.get('/api/v1/getLocationInfo', auth, async (req, res) => {
    try {
        let role = req.user.user_role;
        let { parentId } = req.body; // Assuming parentId is in the request body

        const mainRoot = await locationModels.findOne({ _id: parentId, parent_id: null, active: 1 });

        if (mainRoot) {
            const locationTree = await getLocationsTree(mainRoot._id);
            const result = {
                _id: mainRoot._id,
                id: mainRoot.id,
                name: mainRoot.location_name,
                sublocations: locationTree,
            };
            res.json({ location_tree: result });
        } else {
            res.json({ message: "Main root not found" });
        }
    } catch (error) {
        res.json({ message: "catch error " + error });
    }
});
const getLocationsTree = async (parentId) => {
    const locations = await locationModels.find({ parent_id: parentId });

    const tree = [];
    for (const location of locations) {
        const subLocations = await getLocationsTree(location._id);
        tree.push({
            _id: location._id,
            id: location.id,
            name: location.location_name,
            sublocations: subLocations,
        });
    }

    return tree;
};


module.exports = router

// // API for adding locations
// router.post('/api/v1/addLocation', auth, async (req, res) => {
//     try {
//         const { location_tree, survey_title } = req.body;
//         const role = req.user.user_role;
//         const department = req.user.department_id;

//         if (role == 'admin') {
//             let existingSurvey = await surveyModel.findOne({
//                 survey_title: survey_title,
//                 department_id: department,
//                 active: 1
//             });

//             if (!existingSurvey) {
//                 res.json({ message: "No survey exists for this department" });
//             } else {
//                 const idToLocationMap = new Map();

//                 // Iterate through each set of locations for a survey
//                 for (const locationsSet of location_tree) {
//                     // Store the MongoDB-generated IDs for each location in the set
//                     for (const locationData of locationsSet) {
//                         const { id, name, parentId } = locationData;

//                         const location = new Location({
//                             location_name: name,
//                             department_id: department,
//                             id: id,
//                             survey_id: existingSurvey._id
//                         });

//                         await location.save();

//                         // Store the MongoDB-generated ID for later reference
//                         locationData.mongoId = String(location._id);

//                         // Store the location in the map for potential parent references
//                         // Store the whole object, use 'id' as the key consistently
//                         idToLocationMap.set(id, location);
//                     }

//                     // Assign parent references based on the provided parent IDs for the current set
//                     for (const locationData of locationsSet) {
//                         const { id, parentId } = locationData;

//                         const location = idToLocationMap.get(id);
//                         const parent = parentId !== null ? idToLocationMap.get(parentId) : null;

//                         // Check if location and parent exist before updating the parent reference
//                         if (location) {
//                             await Location.updateOne({ _id: location._id }, { parent_id: parent ? parent._id : null });
//                         }
//                     }
//                 }

//                 res.status(200).json({ message: 'Locations stored and parent references assigned successfully!' });
//             }
//         } else {
//             res.json({ message: "Sorry, you are unauthorized." });
//         }
//     } catch (error) {
//         res.status(500).json({ message: "Catch error " + error });
//     }
// });

// // Function to clone a location
// const cloneLocation = async (sourceLocation) => {
//     const clonedLocation = new locationModels({
//         location_name: sourceLocation.location_name + "_Clone", // Example: Appending "_Clone" to the name
//         parent_id: null, // Set the parent_id of the cloned main root to null
//         survey_id: sourceLocation.survey_id,
//         department_id: sourceLocation.department_id,
//         active: 1, // Assuming the cloned location is active
//     });

//     const savedClonedLocation = await clonedLocation.save();
//     const locationTree = await cloneLocationTree(savedClonedLocation._id, sourceLocation._id);

//     return {
//         _id: savedClonedLocation._id,
//         id: savedClonedLocation.id,
//         name: savedClonedLocation.location_name,
//         sublocations: locationTree,
//     };
// };

// // Function to clone a location tree
// const cloneLocationTree = async (newParentId, oldParentId) => {
//     const locations = await locationModels.find({ parent_id: oldParentId });

//     const tree = [];
//     for (const location of locations) {
//         const subLocations = await cloneLocationTree(location._id, location._id);
//         tree.push({
//             _id: location._id,
//             id: location.id,
//             name: location.location_name,
//             sublocations: subLocations,
//         });
//     }

//     return tree;
// };

// // Function to store cloned location and its tree structure
// const storeClonedLocation = async (clonedLocation) => {
//     try {
//         const clonedLocationDocument = new locationModels({
//             location_name: clonedLocation.name,
//             department_id: clonedLocation.department_id,
//             survey_id: clonedLocation.survey_id,
//             // Add other fields that you want to clone with potential modifications

//             // Ensure parent_id is null for the cloned main root
//             parent_id: null,
//             active: 1, // Assuming the cloned location is active
//         });

//         const savedClonedLocation = await clonedLocationDocument.save();

//         // Store the cloned location's tree structure
//         await storeClonedLocationTree(savedClonedLocation._id, clonedLocation.sublocations);

//         return savedClonedLocation;
//     } catch (error) {
//         console.error("Error storing cloned location:", error);
//         throw error;
//     }
// };

// // Function to store cloned location tree recursively
// const storeClonedLocationTree = async (newParentId, tree) => {
//     try {
//         for (const location of tree) {
//             const clonedSubLocationDocument = new locationModels({
//                 location_name: location.name,
//                 department_id: location.department_id,
//                 survey_id: location.survey_id,
//                 // Add other fields that you want to clone with potential modifications

//                 // Set the parent_id to the new parent's ID
//                 parent_id: newParentId,
//                 active: 1, // Assuming the cloned location is active
//             });

//             const savedClonedSubLocation = await clonedSubLocationDocument.save();

//             // Recursively store the cloned sub-locations
//             if (location.sublocations && location.sublocations.length > 0) {
//                 await storeClonedLocationTree(savedClonedSubLocation._id, location.sublocations);
//             }
//         }
//     } catch (error) {
//         console.error("Error storing cloned location tree:", error);
//         throw error;
//     }
// };

// // Your existing API endpoint for cloning
// router.post('/api/v1/cloneLocation', auth, async (req, res) => {
//     try {
//         const { parentId } = req.body;
//         const mainRoot = await locationModels.findOne({ _id: parentId, parent_id: null, active: 1 });

//         if (mainRoot) {
//             const clonedLocation = await cloneLocation(mainRoot);
//             await storeClonedLocation(clonedLocation);
//             res.json({ message: 'Location cloned and stored as a new record successfully!' });
//         } else {
//             res.json({ message: "Main root not found" });
//         }
//     } catch (error) {
//         res.status(500).json({ message: "Catch error " + error });
//     }
// });



// // router.post('/api/v1/addLocation', auth, async (req, res) => {
// //     try {
// //         const { location_tree, survey_title } = req.body;
// //         const role = req.user.user_role;
// //         const department = req.user.department_id;

// //         if (role == 'admin') {
// //             let existingSurvey = await surveyModel.findOne({
// //                 survey_title: survey_title,
// //                 department_id: department,
// //                 active: 1
// //             });

// //             if (!existingSurvey) {
// //                 res.json({ message: "No survey exists for this department" });
// //             } else {
// //                 const idToLocationMap = new Map();

// //                 // Iterate through each set of locations for a survey
// //                 for (const locationsSet of location_tree) {
// //                     // Store the MongoDB-generated IDs for each location in the set
// //                     for (const locationData of locationsSet) {
// //                         const { id, name, parentId } = locationData;

// //                         const location = new Location({
// //                             location_name: name,
// //                             department_id: department,
// //                             id: id,
// //                             survey_id: existingSurvey._id
// //                         });

// //                         await location.save();

// //                         // Store the MongoDB-generated ID for later reference
// //                         locationData.mongoId = String(location._id);

// //                         // Store the location in the map for potential parent references
// //                         // Store the whole object, use 'id' as the key consistently
// //                         idToLocationMap.set(id, location);
// //                     }

// //                     // Assign parent references based on the provided parent IDs for the current set
// //                     for (const locationData of locationsSet) {
// //                         const { id, parentId } = locationData;

// //                         const location = idToLocationMap.get(id);
// //                         const parent = parentId !== null ? idToLocationMap.get(parentId) : null;

// //                         // Check if location and parent exist before updating the parent reference
// //                         if (location) {
// //                             await Location.updateOne({ _id: location._id }, { parent_id: parent ? parent._id : null });
// //                         }
// //                     }
// //                 }

// //                 res.status(200).json({ message: 'Locations stored and parent references assigned successfully!' });
// //             }
// //         } else {
// //             res.json({ message: "Sorry, you are unauthorized." });
// //         }
// //     } catch (error) {
// //         res.status(500).json({ message: "Catch error " + error });
// //     }
// // });

// router.get('/api/v1/getLocation', auth, async (req, res) => {
//     try {
//         let role = req.user.user_role
//         if (role == "admin") {
//             let locations = await locationModels.find({
//                 department_id: req.user.department_id,
//                 active: 1,
//                 parent_id: null
//             }).select('location_name ')
//             if (locations.length != 0) {
//                 res.json({ message: locations })
//             }
//             else {
//                 res.json({ message: 'no data found' })
//             }
//         }
//         else {
//             res.json({ message: "Sorry, you are unauthorized." });
//         }
//     } catch (error) {
//         res.json({ message: "catch error " + error })
//     }
// })



// // router.get('/api/v1/cloneLocation', auth, async (req, res) => {
// //     try {
// //         let role = req.user.user_role;
// //         let { parentId } = req.body; // Assuming parentId is in the request body

// //         const mainRoot = await locationModels.findOne({ _id: parentId, parent_id: null, active: 1 });

// //         if (mainRoot) {
// //             const clonedLocation = await cloneLocation(mainRoot);
// //             res.json({ cloned_location: clonedLocation });
// //         } else {
// //             res.json({ message: "Main root not found" });
// //         }
// //     } catch (error) {
// //         res.json({ message: "catch error " + error });
// //     }
// // });

// // const cloneLocation = async (sourceLocation) => {
// //     const clonedLocation = new locationModels({
// //         location_name: sourceLocation.location_name + "_Clone", // Example: Appending "_Clone" to the name
// //         parent_id: null, // Set the parent_id of the cloned main root to null
// //         survey_id: sourceLocation.survey_id,
// //         department_id: sourceLocation.department_id,
// //         active: 1, // Assuming the cloned location is active
// //     });

// //     const savedClonedLocation = await clonedLocation.save();
// //     const locationTree = await cloneLocationTree(savedClonedLocation._id, sourceLocation._id);

// //     return {
// //         _id: savedClonedLocation._id,
// //         id: savedClonedLocation.id,
// //         name: savedClonedLocation.location_name,
// //         sublocations: locationTree,
// //     };
// // };

// // const cloneLocationTree = async (newParentId, oldParentId) => {
// //     const locations = await locationModels.find({ parent_id: oldParentId });

// //     const tree = [];
// //     for (const location of locations) {
// //         const subLocations = await cloneLocationTree(location._id, location._id);
// //         tree.push({
// //             _id: location._id,
// //             id: location.id,
// //             name: location.location_name,
// //             sublocations: subLocations,
// //         });
// //     }

// //     return tree;
// // };







// /*

 
// /*
 
// {
//   "location_tree": [
//     [
//       { "id": "1", "name": "A", "parentId": null },
//       { "id": "2", "name": "B", "parentId": "1" },
//       { "id": "3", "name": "C", "parentId": "1" },
//       { "id": "4", "name": "D", "parentId": "2" },
//       { "id": "5", "name": "E", "parentId": "2" },
//       { "id": "6", "name": "F", "parentId": "3" },
//       { "id": "7", "name": "G", "parentId": "3" }
//     ],
//     [
//       { "id": "1", "name": "A", "parentId": null },
//       { "id": "2", "name": "B", "parentId": "1" },
//       { "id": "3", "name": "C", "parentId": "1" },
//       { "id": "4", "name": "D", "parentId": "2" },
//       { "id": "5", "name": "E", "parentId": "2" },
//       { "id": "6", "name": "F", "parentId": "3" },
//       { "id": "7", "name": "G", "parentId": "3" }
//     ]
//   ]
// }
 

// */