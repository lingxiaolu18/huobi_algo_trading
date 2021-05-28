const mongoose = require('mongoose');

const recordSchema = new mongoose.Schema({
    token: {
        type: String,
        required: [true, 'token name is required']
    },
    cost: {
        type: String,
        required: [true, 'cost is not required']
    }
})

module.exports = recordSchema;