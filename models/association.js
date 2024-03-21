const mongoose = require('mongoose');

const associationSchema = new mongoose.Schema({
  name: String,
  pointOfContact: String,
  role: String,
  location: String,
  email: String,
  phoneNumber: String,
  website: String,
  associationName: String,
  description: String,
});

const Association = mongoose.model('Association', associationSchema);

module.exports = Association;
