const express = require('express');
const Lamps = require('../models/Lamps');
const Files = require('../models/Files');

const router = express.Router();

router.get('/api/lamp/:_id', async (req, res) => {
  const { _id } = req.params;
  const main = await Lamps.findOne({ _id }).populate('folder_id');
  const list = await Files.find({ lamp_id: _id });
  res.json({
    success: true,
    message: 'bansuan-light-monitor',
    main,
    list,
  });
});
module.exports = router;
