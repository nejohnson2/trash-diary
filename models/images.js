var mongoose = require('mongoose');
var Schema = mongoose.Schema;


// Define schema
var ImageSchema = new Schema({      
      caption : String
    , filename: String
    , timestamp : { type: Date, default: Date.now }
    
});

module.exports = mongoose.model('Images', ImageSchema);