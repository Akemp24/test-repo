// signupController.js

const User = require('../models/User');

exports.signup = async (req, res) => {
  try {
    const { first_name, last_name, email, username, password } = req.body;
    console.log('Password before hash:', password);

    // Add any additional validation or data processing here

    const newUser = await User.create({
      first_name,
      last_name,
      email,
      username,
      password,
    });

    // Redirect to the login page after successful signup
    res.redirect('/login');
  } catch (err) {
    console.error('Error saving new user:', err);
    res.status(500).json(err);
    // Handle the error appropriately (e.g., show an error message)
  }
};