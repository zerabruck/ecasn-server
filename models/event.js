const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  name: String,
  imageUrl: String,
  publicId: String, //don't forget to update on the front end this and image_url thingi
  location: String,
  description: String,
  eventTime: String
});

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;
