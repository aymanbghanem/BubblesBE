const { Schema, model } = require('mongoose')

const locationsSchema = new Schema({
    location_name: {
        type: String
    },
    survey_id: {
        type: Schema.Types.ObjectId,
        ref: 'survey'
    },
    parent_id: {
        type: Schema.Types.ObjectId,
        ref: 'location'
    },

    active: {
        type: Number,
        default: 1
    },
    id:String,
    department_id:{
        type: Schema.Types.ObjectId,
        ref: 'department'
    },
    clone:{
        type:Number,
        default:0
    },
    location_description:{
        type:String,
        default:''
    }

}, { timestamps: true })

module.exports = model('location', locationsSchema)