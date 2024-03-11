const { Schema, model } = require('mongoose')

const settingSchema = new Schema({
    title_weight: {
        type: String
    },
    title_font_size: {
        type: String
    },
    description_font_size: {
        type: String
    },
    question_font_size: {
        type: String
    },
    active: {
        type: Number,
        default: 1
    },

    location_limitation:{
        type: Number,
        default: 5
    },
   
    range_limitation:{
        type: Number,
        default: 5
    },
    char_limitation:{
        type: Number,
        default: 120
    },

}, { timestamps: true })

settingSchema.statics.initializeSettings = async function () {
    try {
        const existingSettings = await this.find();
        if (existingSettings.length === 0) {
            await this.create({
                title_weight: 'bold',
                title_font_size: '16',
                description_font_size: '14',
                question_font_size: '18',
                location_limitation: 5,
                range_limitation: 5,
                char_limitation: 120,
            });
            console.log('Default settings inserted successfully.');
        }
    } catch (error) {
        console.error('Error initializing settings:', error);
    }
};

module.exports = model('Setting', settingSchema);