const express = require("express");
const auth = require("../middleware/auth");
const locationModels = require("../models/location.models");
const surveyModels = require("../models/survey.models");
const { create } = require("../models/user.models");
const urlModel = require("../models/url.model");
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const companyModels = require("../models/company.models");
require('dotenv').config()

const storage = multer.memoryStorage(); // Use memory storage for reading the file buffer
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Please upload an Excel file.'), false);
    }
};

const upload = multer({ storage, fileFilter });

router.post(`${process.env.BASE_URL}/addURL`, auth, async (req, res) => {
    try {
        let role = req.user.user_role
        let created_by = req.user._id
        let location_id = req.headers['location_id']
        let survey_id = req.headers['survey_id']
        let { link } = req.body
        if (role == "admin") {
            let company_id = req.user.company_id
            let company = await companyModels.findOne({ _id: company_id, active: 1, url_builder: 1 })
            if (company) {
                let existingLocation = await locationModels.findOne({ _id: location_id, active: 1 })
                let existingSurvey = await surveyModels.findOne({ _id: survey_id, active: 1 })
                if (existingLocation && existingSurvey) {
                    let url = await urlModel.create({
                        location_id: location_id,
                        survey_id: survey_id,
                        created_by: created_by,
                        link: link
                    });
                     let updateSurvey = await surveyModels.findOneAndUpdate({ _id: survey_id, active: 1  },{updated:0})
                    if (url) {
                        res.json({ message: "The URL code link was successfully added", type: 1 });
                    } else {
                        res.json({ message: "Failed to store the URL", type: 0 });
                    }
                }
                else {
                    res.json({ message: "The survey or the location does not exist", type: 0 })
                }
            }
            else {
                res.json({ message: "Apologies, but your company currently lacks the necessary access for this operation.", type: 0 });
            }
        }
        else {
            res.json({ message: "sorry, you are unauthorized", type: 0 })
        }
    } catch (error) {
        res.json({ message: "catch error " + error })
    }
})

router.get(`${process.env.BASE_URL}/getURL`, auth, async (req, res) => {
    try {
        let role = req.user.user_role;

        if (role == 'admin') {
            let company_id = req.user.company_id
            let company = await companyModels.findOne({ _id: company_id, active: 1, url_builder: 1 })
            if (company) {
                // Assuming you have a model called urlModel for handling URL data
                let urls = await urlModel.aggregate([
                    {
                        $match: { created_by: req.user._id, active: 1 }
                    },
                    {
                        $lookup: {
                            from: 'locations', // Assuming your location model is named 'locations'
                            localField: 'location_id',
                            foreignField: '_id',
                            as: 'location'
                        }
                    },
                    {
                        $lookup: {
                            from: 'surveys', // Assuming your survey model is named 'surveys'
                            localField: 'survey_id',
                            foreignField: '_id',
                            as: 'survey'
                        }
                    },
                    {
                        $unwind: '$location'
                    },
                    {
                        $unwind: '$survey'
                    },
                    {
                        $project: {
                            _id: 1,
                            active: 1,
                            link: 1,
                            location_name: '$location.location_name',
                            survey_title: '$survey.survey_title',
                            created_by: 1,
                            createdAt: 1,
                            updatedAt: 1,
                            __v: 1
                        }
                    }
                ]);

                res.json({ urls, type: 2 });
            }
            else{
                res.json({ message: "Apologies, but your company currently lacks the necessary access for this operation.", type: 0 }); 
            }
        } else {
            res.json({ message: "Sorry, you are unauthorized", type: 0 });
        }
    } catch (error) {
        res.json({ message: "Catch error: " + error });
    }
});

router.post(`${process.env.BASE_URL}/excelBuilder`, auth, upload.single('file'), async (req, res) => {
    try {
        let id = req.user._id;
        let role = req.user.user_role;
        let url_id = req.headers['url_id'];

        if (role === "admin") {
            let company_id = req.user.company_id
            let company = await companyModels.findOne({ _id: company_id, active: 1, url_builder: 1 })
            if(company){
                let url = await urlModel.findOne({ _id: url_id, active: 1 }).select('link -_id');

                if (url) {
                    // Assuming the file is named 'file' in the request
                    const file = req.file;
    
                    if (!file) {
                        return res.json({ message: 'No file uploaded', type: 0 });
                    }
    
                    // Read the Excel file
                    const workbook = xlsx.read(file.buffer, { type: 'buffer' });
    
                    // Get the sheet names
                    const sheetNames = workbook.SheetNames;
    
                    // Assuming there is only one sheet (modify if you have multiple sheets)
                    const sheet = workbook.Sheets[sheetNames[0]];
    
                    // Extract column names dynamically from the first column
                    const columnNames = [];
                    for (const key in sheet) {
                        if (key[0] === '!' || key.substring(1) !== '1') {
                            continue; // Skip non-data rows
                        }
                        columnNames.push(sheet[key].v);
                    }
    
                    // Convert the sheet data to JSON
                    const data = xlsx.utils.sheet_to_json(sheet);
    
                    // Concatenate the dynamic column with the URL link
                    const result = data.map((row) => {
                        const dynamicColumnName = columnNames[0]; // Assuming the first column is dynamic
                        return {
                            dynamicColumn: row[dynamicColumnName],
                            concatenatedLink: url.link + '/' + row[dynamicColumnName]
                        };
                    });
    
                    // Create a new workbook
                    const newWorkbook = xlsx.utils.book_new();
                    const newSheet = xlsx.utils.json_to_sheet(result);
    
                    // Add the new sheet to the workbook
                    xlsx.utils.book_append_sheet(newWorkbook, newSheet, 'ConcatenatedData');
    
                    // Write the workbook to a buffer
                    const excelBuffer = xlsx.write(newWorkbook, { bookType: 'xlsx', type: 'buffer' });
    
                    // Send the Excel file as a response
                    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                    res.setHeader('Content-Disposition', 'attachment; filename=concatenated_data.xlsx');
                    res.send(excelBuffer);
                } else {
                    res.json({ message: "No data found", type: 0 });
                }
            }
            else{
               res.json({ message: "Apologies, but your company currently lacks the necessary access for this operation.", type: 0 }); 
            }
        } else {
            res.json({ message: "Sorry, you are unauthorized" });
        }
    } catch (error) {
        res.json({ message: "Catch error: " + error });
    }
});

module.exports = router
