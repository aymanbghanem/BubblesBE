const { Schema, model } = require('mongoose')

const notificationSchema = new Schema({
    active: {
        type: Number,
        default: 1
    },
    location_id: {
        type: Schema.Types.ObjectId,
        ref: 'location'
    },
    department_id: {
        type: Schema.Types.ObjectId,
        ref: 'department'
    },
    survey_reader_id: {
        type: Schema.Types.ObjectId,
        ref: 'user'
    },
    processed:{
        type:Number,
        default:0
    },
    response_id:{
        type: Schema.Types.ObjectId,
        ref: 'response'
    },
    created_by:{
        type: Schema.Types.ObjectId,
        ref: 'user'
    },
    survey_id:{
        type:Schema.Types.ObjectId,
        ref:'survey'
    }
}, { timestamps: true })

module.exports = model('notification', notificationSchema)