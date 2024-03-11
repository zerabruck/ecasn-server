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
  


// Read data from file
function readData(filename, callback) {
    fs.readFile(filename, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            callback([]);
        } else {
            callback(JSON.parse(data));
        }
    });
}

// Write data to file
function writeData(filename, data, callback) {
    fs.writeFile(filename, JSON.stringify(data, null, 2), (err) => {
        if (err) {
            console.error(err);
            callback(err);
        } else {
            callback(null);
        }
    });
}

// Endpoints for associations

// Get all associations
app.get('/associations', (req, res) => {
    readData('associations.json', (associations) => {
        res.json(associations);
    });
});

// Get single association
app.get('/associations/:id', (req, res) => {
    const id = req.params.id
    readData('associations.json', (associations) => {
        const association = associations.filter(singleAssocaiton => singleAssocaiton.id === id)
        res.json(association[0]);
    });
});

// Create a new association
app.post('/associations', (req, res) => {
    const newAssociation = {...req.body, id:uuidv4()};
    readData('associations.json', (associations) => {
        associations.push(newAssociation);
        writeData('associations.json', associations, (err) => {
            if (err) {
                res.status(500).send('Internal Server Error');
            } else {
                res.status(201).json(newAssociation);
            }
        });
    });
});

// Update an existing association
app.put('/associations/:id', (req, res) => {
    const id = req.params.id;
    const updatedAssociation = req.body;
    readData('associations.json', (associations) => {
        const index = associations.findIndex(item => item.id === id);
        if (index !== -1) {
            associations[index] = { ...associations[index], ...updatedAssociation };
            writeData('associations.json', associations, (err) => {
                if (err) {
                    res.status(500).send('Internal Server Error');
                } else {
                    res.json(associations[index]);
                }
            });
        } else {
            res.status(404).json({ message: 'Association not found' });
        }
    });
});

// Delete an association
app.delete('/associations/:id', (req, res) => {
    const id = req.params.id;
    readData('associations.json', (associations) => {
        const index = associations.findIndex(item => item.id === id);
        if (index !== -1) {
            const deletedAssociation = associations.splice(index, 1)[0];
            writeData('associations.json', associations, (err) => {
                if (err) {
                    res.status(500).send('Internal Server Error');
                } else {
                    res.json(deletedAssociation);
                }
            });
        } else {
            res.status(404).json({ message: 'Association not found' });
        }
    });
});

// Endpoints for events

// Get all events
app.get('/events', (req, res) => {
    readData('events.json', (events) => {
        res.json(events);
    });
});

// Get single event
app.get('/events/:id', (req, res) => {
    const id = req.params.id
    readData('events.json', (events) => {
        const event = events.filter(singleEvent => singleEvent.id === id)
        res.json(event[0]);
    });
});
// Create a new event
app.post('/events',upload.single('image'), async(req, res) => {
    if (Object.keys(req.body).length !== 0){
        try{
        const result = await cloudinary.uploader.upload(req.file.path)
        const newEvent ={...req.body, image_url:result.url, public_id:result.public_id, id:uuidv4()};
        readData('events.json', (events) => {
            events.push(newEvent);
            writeData('events.json', events, (err) => {
                if (err) {
                    res.status(500).send('Internal Server Error');
                } else {
                    res.status(201).json(newEvent);
                }
            });
        });
        }
        catch(err){
            res.status(500).send("Internal Server Error")
        }

    }else {
        res.status(404).json({ message: 'Event body not found' });
    }
});

// Update an existing event
app.put('/events/:id', upload.single('image'), async(req, res) => {
    const id = req.params.id;
    let updatedEvent = req.body;
    if (req.file){
        try{
            await cloudinary.uploader.destroy(updatedEvent.public_id);
            const result = await cloudinary.uploader.upload(req.file.path)
            updatedEvent = {...updatedEvent, image_url:result.url, public_id:result.public_id}
    
        } catch(err){
            console.log(err)
        return res.status(500).send("Internal Server Error")
    }
    }

        readData('events.json', (events) => {
            const index = events.findIndex(item => item.id === id);
            if (index !== -1) {
                events[index] = { ...events[index], ...updatedEvent };
                writeData('events.json', events, (err) => {
                    if (err) {
                        res.status(500).send('Internal Server Error');
                    } else {
                        res.json(events[index]);
                    }
                });
            } else {
                res.status(404).json({ message: 'Event not found' });
            }
        });
});

// Delete an event
app.delete('/events/:id', async(req, res) => {
    const id = req.params.id;

    readData('events.json', async(events) => {
        const index = events.findIndex(item => item.id === id);
        try{
            if (index !== -1) {
                const deletedEvent = events.splice(index, 1)[0];
                await cloudinary.uploader.destroy(deletedEvent.public_id);
                writeData('events.json', events, (err) => {
                    if (err) {
                        res.status(500).send('Internal Server Error');
                    } else {
                        res.json(deletedEvent);
                    }
                });
            } else {
                res.status(404).json({ message: 'Event not found' });
            }

        } catch(err){
            console.log(err)
            res.status(500).send('Internal Server Error');
        }
    });
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

