const express = require('express');
const Projects = require('../models/Projects');
const Areas = require('../models/Areas');
const Alleys = require('../models/Alleys');
const Zones = require('../models/Zones');
const Lamps = require('../models/Lamps');
const Files = require('../models/Files');

const router = express.Router();
router.get('/api/list/zones', async (req, res) => {
  try {
    const data = await Zones.find({}).sort({ name: 1 });
    res.json({
      success: true,
      message: 'bansuan-light-monitor',
      data,
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: 'bansuan-light-monitor',
      data: [],
    });
  }
});
router.get('/api/list/lamp/:zone_id', async (req, res) => {
  try {
    const { zone_id } = req.params;
    const main = await Zones.findOne({ _id: zone_id });
    const data = await Lamps.find({ zone_id }).sort({ name: 1 });
    res.json({
      success: true,
      message: 'bansuan-light-monitor',
      data,
      main,
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: 'bansuan-light-monitor',
      data: [],
    });
  }
});

module.exports = router;
