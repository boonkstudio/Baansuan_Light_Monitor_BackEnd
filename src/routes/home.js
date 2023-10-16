const express = require('express');
const GoogleSheetController = require('../controller/GoogleSheetController');
const Zone = require("../models/Zones");
const Lamp = require("../models/Lamps");
const {Schema} = require("mongoose");
const _ = require("lodash");
const GoogleController = require("../controller/GoogleController");
const Folders = require("../models/Folders");
const Files = require("../models/Files");
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
    let zone = {};
    if (item[4] === '') {
      zone  = await Zone.findOneAndUpdate({ name: item[1], }, { $set: { sequence:item[0],name: item[1] } }, { new: true, upsert: true });
    }else {
       zone  = await Zone.findOneAndUpdate({ _id: item[4] }, { $set: { sequence:item[0],name: item[3]===""?item[1]:item[3] } },{ new: true});
    }
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
    console.debug(`createZones => `, createZones);
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

router.get('/api/sync/sequence', async (req, res) => {
  const sheet = new GoogleSheetController('1KrGMSFsUPFF-xw5BfXyNnS8NydpHLyfKw2TC_C8c950');
  sheet.setRange('data!A2:E');
  const data = await sheet.get();
  const createZones = await Promise.all(data.map(async (item) => {
    return Zone.findOneAndUpdate({name: item[1],}, {$set: {sequence: item[0]}}, {new: true});
  }));
  sheet.setRange('data!E2:E');
  const updateZoneToSheet = _.orderBy(createZones,'sequence','asc').map((item)=>[item._id]);
  await sheet.update(updateZoneToSheet);
  res.json({ success: true
    ,createZones
    ,data });
});
router.get('/api/sync/rename', async (req, res) => {
  const sheet = new GoogleSheetController('1KrGMSFsUPFF-xw5BfXyNnS8NydpHLyfKw2TC_C8c950');
  sheet.setRange('data!A2:E');
  const data = await sheet.get();
  const createZones = await Promise.all(data.map(async (item) => {
    const name = item[3]===""?item[1]:item[3];
    const zone  = await Zone.findOneAndUpdate({_id: item[4] }, { $set: { sequence:item[0],name:name } }, { new: true });
    const lamps = await Lamp.find({zone_id:zone._id});
    await Promise.all(lamps.map(async (lamp) => {
        const data = {
            name: `${zone.name}-${lamp.sequence.toString().padStart(3, '0')}`,
        }
        return Lamp.findOneAndUpdate(
            {_id: lamp._id,},
            data,
            {new: true},
        );
    }));
    return zone;
  }));
    const _lamps = await Lamp.find({}).populate('folder_id').exec();
    for (const lamp of _lamps){
      if (lamp.folder_id){
        const folder = await Folders.findOne({_id:lamp.folder_id});
        console.debug(`lamp => `, lamp);
        await GoogleController.renameFolder(lamp.folder_id.node_id,lamp.name);
      }
    }
    const files = await Files.find({}).populate('lamp_id').exec();
    for (const file of files){
      const name = `${file.lamp_id.name} รูปที่ ${file.sequence} ${file.type}`;
      const _update = await Files.findOneAndUpdate({_id:file._id},{name:name},{new:true});
      console.debug(`_update => `, _update);
        if (_update.node_id){
            await GoogleController.renameFolder(file.node_id,_update.name);
        }
    }

  res.json({ success: true
    ,createZones
    ,data });
});

module.exports = router;
