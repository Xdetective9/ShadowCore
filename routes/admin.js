const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const router = express.Router();

const upload = multer({ dest: 'uploads/' });

router.post('/login', requireAdmin, (req, res) => {
  req.session.admin = true;
  res.redirect('/admin/dashboard');
});

router.get('/dashboard', (req, res) => {
  if (!req.session.admin) return res.redirect('/');
  res.render('admin/dashboard');
});

router.get('/upload-plugin', (req, res) => {
  if (!req.session.admin) return res.redirect('/');
  res.render('admin/upload-plugin');
});

router.post('/upload-plugin', upload.single('plugin'), async (req, res) => {
  if (!req.session.admin) return res.redirect('/');
  const pluginPath = path.join(__dirname, '../plugins', req.file.originalname.split('.')[0]);
  await fs.move(req.file.path, pluginPath);
  // Load plugin dynamically
  const pluginIndex = path.join(pluginPath, 'index.js');
  if (fs.existsSync(pluginIndex)) {
    require(pluginIndex)(req.app);
  }
  res.redirect('/admin/dashboard');
});

router.get('/settings', (req, res) => {
  if (!req.session.admin) return res.redirect('/');
  res.render('admin/settings');
});

module.exports = router;
