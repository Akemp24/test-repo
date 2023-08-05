const express = require("express");
const exphbs = require("express-handlebars");
const path = require("path");
const session = require('express-session');
const passport = require("./config/passport");
const LocalStrategy = require('passport-local').Strategy;
const User = require('./models/User');
const authController = require('./controllers/authController');
const routes = require('./controllers');
const axios = require("axios");
const signupController = require('./controllers/signupController');
const bodyParser = require('body-parser');
const db = require("./models/User");
const sequelize = require('./config/connection')
const router = require('express').Router();
const userRoutes = require('./controllers/api/user-routes');
const passportpackage = require('passport');

require("dotenv").config();

const app = express();
const port = process.env.PORT || 3001;

// Create an instance of Handlebars engine
const hbs = exphbs.create({
  /* Specify any Handlebars configuration here */
});

// Configure Handlebars as the template engine
app.engine("handlebars", hbs.engine);
app.set("view engine", "handlebars");
// Define a route for the hotels page
app.get("/hotels", (req, res) => {
  res.render("hotels", { layout: "main" });
});

// Define a route for the venues page
app.get("/venues", (req, res) => {
  res.render("venues", { layout: "main" });
});

// Set the views directory
app.set("views", path.join(__dirname, "views"));

// Serve static files from the "public" folder
app.use(express.static(path.join(__dirname, "public")));

// Parse incoming request bodies in a middleware before your routes
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// express session setup
app.use(session({
  secret: process.env.secretKey,
  resave: false,
  saveUninitialized: false,
}));

// Route to render the signup.handlebars template
app.get("/signup", (req, res) => {
  res.render("signup", {layout: "main"});
});

app.post('/signup', signupController.signup);

// passport middleware
app.use(passport.initialize());
app.use(passport.session());


// Route to render the main.handlebars template
app.get("/", (req, res) => {
  res.render("homepage");
});


// Route to render the login.handlebars template
app.get("/login", (req, res) => {
  res.render("login", {layout: "main"});
});

// Route to logout
app.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Error during logout:', err);
      return res.redirect('/');
    }
    console.log('User logged out successfully');
    return res.redirect('/');
  });
});

// Handle logging in
app.post('/api/users/login', passport.authenticate('local'), (req, res) => {
  // If authentication is successful, respond with user information or any data you want
  res.json({ user: req.user });
});

// authentication routes
// app.get('/logout', authController.logout);
app.use('/api/users', userRoutes);


// Handle signup form submission using the new signup controller


require("./routes/signin")(app);

// Start the server
sequelize.sync({ force:false })
.then(() => {
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
});

// API Keys
const HotelApiKey = process.env.REACT_APP_HOTEL_API_KEY;
const VenueApiKey = process.env.REACT_APP_VENUE_API_KEY;

// Hotel API
app.get('/api', async (req, res) => {
  const locationRes = await axios({
    method: 'get',
    url: 'https://tripadvisor16.p.rapidapi.com/api/v1/hotels/searchLocation',
    params: {
      query: req.body.city
    },
    headers: {
      'X-RapidAPI-Key': `${HotelApiKey}`,
      'X-RapidAPI-Host': 'tripadvisor16.p.rapidapi.com'
    }
  });
  
  const locationData = locationRes.data.data.geoId;
  const str = locationData;
  const arr = str.split('g');
  const geoID = arr[1];
  // return res.json(geoID) // returns the GeoID that I need to put in hotelRes

  const hotelRes = await axios({
    method: 'get',
    url: 'https://tripadvisor16.p.rapidapi.com/api/v1/hotels/searchHotels',
    params: {
      geoId: `${geoID}`,
      checkIn: req.body.checkIn,
      checkOut: req.body.checkOut,
      pageNumber: '1',
      currencyCode: 'USD'
    },
    headers: {
      'X-RapidAPI-Key': `${HotelApiKey}`,
      'X-RapidAPI-Host': 'tripadvisor16.p.rapidapi.com'
    }
  });

  const hotelData = hotelRes.data.data.data[0].id;
  // return res.json(hotelData); // Pulls the id of the first hotel

  const hotelDetails = await axios({
    method: 'get',
    url: 'https://tripadvisor16.p.rapidapi.com/api/v1/hotels/getHotelDetails',
    params: {
      id: `${hotelData}`,
      checkIn: req.body.checkIn,
      checkOut: req.body.checkOut,
      currency: 'USD'
    },
    headers: {
      'X-RapidAPI-Key': `${HotelApiKey}`,
      'X-RapidAPI-Host': 'tripadvisor16.p.rapidapi.com'
    }
  });

  // return res.json(hotelDetails.data.data.about.content[2].content[0].content);

  const venueRes = await axios({
    method: 'get',
    url: `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${VenueApiKey}&city=${req.body.city}`,
    headers: {
      'Host': 'app.ticketmaster.com',
      'X-Target-URI': 'http://app.ticketmaster.com'
    }
  });
  // res.json(venueRes.data._embedded.events[0]);
  const hotelName = hotelDetails.data.data.title;
  const hotelUrl = hotelDetails.data.data.about.content[2].content[0].content;
  const hotelPrice = hotelDetails.data.data.price.displayPrice;
  const venueName = venueRes.data._embedded.events[0].name;
  const venuePic = venueRes.data._embedded.events[0].images[0].url;
  const venueUrl = venueRes.data._embedded.events[0].url;
  const venuePriceMin = venueRes.data._embedded.events[0].priceRanges[0].min;
  const venuePriceMax = venueRes.data._embedded.events[0].priceRanges[0].max;
  return res.json({hotelName, hotelUrl, hotelPrice, venueName, venuePic, venueUrl, venuePriceMin, venuePriceMax});
});

module.exports = app;