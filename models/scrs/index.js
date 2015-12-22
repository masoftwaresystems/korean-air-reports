var mongoose = require('mongoose'),
    schema = new mongoose.Schema({
    	controlNo: {type: String, unique: true},
        fields: {type: String, default: ''},
        indentification: {type: String, default: ''},
        location: {type: String, default: ''},
        title: {type: String, default: ''},
        description: {type: String, default: ''},
        feedback: {type: String, default: ''},
        submitter: {type: String, default: 'Unknown'},
        submitted: {type: Boolean, default: false},
        division: {type: String, default: ''},
        feedback: {type: Boolean, default: false},
        email: {type: String, default: ''}
    }, {timestamps: true});

module.exports = mongoose.model('scrs', schema);