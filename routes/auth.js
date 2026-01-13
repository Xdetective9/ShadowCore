const express = require('express');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const router = express.Router();

const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

router.get('/login', (req, res) => {
  res.render('auth/login', { error: null });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findByEmail(email);
  if (user && await bcrypt.compare(password, user.password) && user.verified) {
    req.session.user = user;
    res.redirect('/');
  } else {
    res.render('auth/login', { error: 'Invalid credentials or unverified account' });
  }
});

router.get('/signup', (req, res) => {
  res.render('auth/signup', { error: null });
});

router.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const userId = await User.create(username, email, password);
    const verificationLink = `http://yourdomain.com/auth/verify/${userId}`;
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: email,
      subject: 'Verify your Shadowcore account',
      html: `<p>Click <a href="${verificationLink}">here</a> to verify.</p>`,
    });
    res.render('auth/signup', { error: 'Check your email for verification' });
  } catch (err) {
    res.render('auth/signup', { error: 'Email or username already exists' });
  }
});

router.get('/verify/:id', (req, res) => {
  User.verify(req.params.id);
  res.redirect('/auth/login');
});

module.exports = router;
