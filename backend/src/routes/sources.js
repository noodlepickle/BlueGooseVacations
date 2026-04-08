'use strict';

const express = require('express');
const router = express.Router();
const { getSourceStatus } = require('../sources');

// GET /api/sources/status
router.get('/status', (req, res) => {
  res.json(getSourceStatus());
});

module.exports = router;
