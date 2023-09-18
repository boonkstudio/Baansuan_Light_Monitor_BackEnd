const express = require('express');
const GoogleSheetController = require('../controller/GoogleSheetController');
const Zone = require("../models/Zones");
const Lamp = require("../models/Lamps");
const {Schema} = require("mongoose");
const _ = require("lodash");
const GoogleController = require("../controller/GoogleController");
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'bansuan-light-monitor',
    data: {
      version: '1.0.0',
    },
  });
});

router.get('/api/sync/all', async (req, res) => {
  const sheet = new GoogleSheetController('1KrGMSFsUPFF-xw5BfXyNnS8NydpHLyfKw2TC_C8c950');
  sheet.setRange('data!A2:C');
  const data = await sheet.get();
  const createZones = await Promise.all(data.map(async (item) => {
    const zone  = await Zone.findOneAndUpdate({ sequence:item[0],name: item[1], }, { $set: { sequence:item[0],name: item[1] } }, { new: true, upsert: true });
    await Promise.all(Array.from({ length: item[2] }).map(async (value, i, array) => {
      const data = {
        zone_id: zone._id,
        name: `${zone.name}-${(i + 1).toString().padStart(3, '0')}`,
        sequence: (i + 1),
      }
      await Lamp.findOneAndUpdate(
          { zone_id: zone._id, sequence: (i + 1) },
          data,
          { new: true, upsert: true },
      );
    }));
    return zone;
  }));
  for (const zone of createZones) {
    if (!_.result(zone, 'folder_id')) {
      try {
        const folder = await GoogleController.createFolder(zone.name, process.env.GOOGLE_FOLDER_ROOT_ID);
        const _zone = await Zone.findOneAndUpdate({ _id: zone._id }, { $set: { folder_id: folder._id } },{ new: true, upsert: true });
      } catch (err) {
        console.error(`err => `, err);
        // TODO(developer) - Handle error
      }
    }
  }
  res.json({ success: true,createZones });
});

module.exports = router;
