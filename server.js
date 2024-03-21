require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const express = require('express');
const fs = require('fs');
const upload = require("./multer")
const nodemailer = require('nodemailer');
const {cloudinary} = require('./cloudinary')
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const mongoose = require('mongoose');
const { readData, writeData } = require('./data');
const Association = require('./models/association');
const Event = require('./models/event');
const associations = require('./associations');

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI).then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));

const users = [
  { id: '1', username: 'admin@ecasn.com', password: 'admin' }
];
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});


passport.use(new LocalStrategy(
  function(username, password, done) {
    const user = users.find(user => user.username === username);
    if (!user) {
      return done(null, false, { message: 'Incorrect username.' });
    }
    if (user.password !== password) {
      return done(null, false, { message: 'Incorrect password.' });
    }
    return done(null, user);
  }
));


// Serialize and deserialize user for session management
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  const user = users.find(user => user.id === id);
  done(null, user);
});

app.use(express.json());
app.use(session({
  secret: '7108ff6f-2669-49e1-a490-1aba03a04efd',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// Login route
app.post('/login', passport.authenticate('local'), (req, res) => {
  res.json({ message: 'Login successful', user: req.user });
});
// Logout route
app.get('/logout', (req, res) => {
    // req.logout();
    res.json({ message: 'Logout successful' });
  });

function ensureAuthenticated(req, res, next) {
    console.log("this is the authenticated user", req)
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Unauthorized' });
}

  app.get('/dashboard', ensureAuthenticated, function(req, res) {
    res.send('Welcome to the dashboard!');
  });
  

// Endpoints for associations

// Get all associations
app.get('/associations', async (req, res) => {
    console.log("this is the association length", associations.length)
    try {
        const associations = await Association.find();
        res.json(associations);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
      }
});

// Get single association
app.get('/associations/:id', async(req, res) => {
    try {
        const association = await Association.findById(req.params.id);
        if (!association) {
          return res.status(404).json({ message: 'Association not found' });
        }
        res.json(association);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
      }
});

// Create a new association
app.post('/associations', async(req, res) => {
    try {
        const newAssociation = await Association.create(req.body);
        res.status(201).json(newAssociation);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
      }
});

// Update an existing association
app.put('/associations/:id', async(req, res) => {
    try {
        const updatedAssociation = await Association.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedAssociation) {
          return res.status(404).json({ message: 'Association not found' });
        }
        res.json(updatedAssociation);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
      }
});

// Delete an association
app.delete('/associations/:id', async(req, res) => {
    try {
        const deletedAssociation = await Association.findByIdAndDelete(req.params.id);
        if (!deletedAssociation) {
          return res.status(404).json({ message: 'Association not found' });
        }
        res.json(deletedAssociation);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
      }
});

// Endpoints for events

// Get all events
app.get('/events', async(req, res) => {
    try {
        const events = await Event.find();
        res.json(events);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
      }
});

// Get single event
app.get('/events/:id', async(req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) {
          return res.status(404).json({ message: 'Event not found' });
        }
        res.json(event);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
      }
});
// Create a new event
app.post('/events',upload.single('image'), async(req, res) => {
    try {
        const result = await cloudinary.uploader.upload(req.file.path);
        const newEvent = {
          ...req.body,
          imageUrl: result.url,
          publicId: result.public_id,
        };
        const createdEvent = await Event.create(newEvent);
        res.status(201).json(createdEvent);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    
});

// Update an existing event
app.put('/events/:id', upload.single('image'), async(req, res) => {
    try {
        let eventToUpdate = await Event.findById(req.params.id);
        if (!eventToUpdate) {
          return res.status(404).json({ message: 'Event not found' });
        }
        console.log("this is the event name", req.body)
    
        let updatedEventData = { ...eventToUpdate._doc, ...req.body };
        console.log("this is the updated data", updatedEventData)
    
        if (req.file) {
          try {
            await cloudinary.uploader.destroy(eventToUpdate.publicId);
            const result = await cloudinary.uploader.upload(req.file.path);
            updatedEventData = {
              ...updatedEventData,
              imageUrl: result.url,
              publicId: result.public_id
            };
          } catch (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal Server Error' });
          }
        }
    
        const updatedEvent = await Event.findByIdAndUpdate(req.params.id, updatedEventData, { new: true });
        res.json(updatedEvent);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    
});

// Delete an event
app.delete('/events/:id', async(req, res) => {
    try {
        const eventToDelete = await Event.findById(req.params.id);
        if (!eventToDelete) {
          return res.status(404).json({ message: 'Event not found' });
        }
    
        await cloudinary.uploader.destroy(eventToDelete.publicId);
        await Event.findByIdAndDelete(req.params.id);
        res.json({ message: 'Event deleted successfully' });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
      }
});

// Route to handle form submission and send email
app.post('/send-email', (req, res) => {
    const { name, email, message, phone, subject } = req.body;
      const transporter = nodemailer.createTransport(
        `smtp://zerabruckm@gmail.com:wxwuslgltrzgoxcv@smtp.gmail.com`
      );
    // Email message options
    const mailOptions = {
        from: 'zerabruckm@gmail.com',
        to: 'zerabruckm@gmail.com',
        subject: 'New Contact Form Submission',
        text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nSubject: ${subject}\nMessage: ${message}`
    };

    // Send email
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email:', error);
            res.status(500).send('Failed to send email');
        } else {
            console.log('Email sent:', info.response);
            res.status(200).send('Email sent successfully');
        }
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

