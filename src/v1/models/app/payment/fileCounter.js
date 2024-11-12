const mongoose = require('mongoose');

const fileCounterSchema = new mongoose.Schema({
    date: { type: String, required: true }, 
    count: { type: [Number], default: [1] }
});

const FileCounter = mongoose.model('fileCounter', fileCounterSchema);
module.exports = FileCounter