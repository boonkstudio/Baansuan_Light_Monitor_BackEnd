const express = require('express');
const Lamps = require('../models/Lamps');
const Files = require('../models/Files');
const GoogleSheetController = require("../controller/GoogleSheetController");
const https = require('https');
const fs = require('fs');
const _ = require("lodash");
const {Drive} = require("../../config/google");
const sharp = require("sharp");
const {read} = require("jimp");
const json2csv = require('json2csv').parse;
const router = express.Router();
const { promisify } = require('util');

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
router.post('/api/lamp/update-la-long/:_id', async (req, res) => {
  try {
    const { _id } = req.params;
    const {body} = req;
    await Lamps.findOneAndUpdate({ _id }, body);
    res.json({
      success: true,
      message: 'bansuan-light-monitor',
    });
  }catch (e) {
    res.status(500).json({
        success: false,
        message: 'bansuan-light-monitor',
    });
  }
});
router.post('/api/lamp/update-equipment-pole/:_id', async (req, res) => {
  try {
    const { _id } = req.params;
    const {body} = req;
    await Lamps.findOneAndUpdate({ _id }, body);
    res.json({
      success: true,
      message: 'bansuan-light-monitor',
    });
  }catch (e) {
    res.status(500).json({
      success: false,
      message: 'bansuan-light-monitor',
    });
  }
});

// Create a promisified version of fs.createWriteStream
const createWriteStreamAsync = promisify(fs.createWriteStream);

// Function to write data to a file asynchronously and await its completion
async function writeDataToFile(imageName, data) {
    const dest = await createWriteStreamAsync(imageName);

    return new Promise((resolve, reject) => {
        dest.on('error', reject); // Handle write errors
        dest.on('finish', resolve); // Resolve when writing is complete

        // Write data to the stream
        dest.write(data);
        dest.end(); // End the stream to signal that you're done writing data
    });
}

const saveFile = async ( node) => {
    const fileId = node;
    const imageName = "public/documents/"+fileId+'.jpg';
    const dir = 'public/documents';
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
    const dir2 = 'public/documents/resized';
    if (!fs.existsSync(dir2)) {
        fs.mkdirSync(dir2);
    }

await new Promise((resolve, reject) => {
    fs.readFile(imageName, async (err, data) => {
        try {
            if (err) {
                const resp =  await Drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream',size:1 })
                if (_.result(resp, 'data', false)) {
                    await new Promise((resolve, reject)=>{
                        const dest = fs.createWriteStream(imageName);
                        resp.data.pipe(dest).on('finish', () => {
                            console.log(`Image downloaded as ${imageName}`);
                            resolve();
                        }).on('error', (err) => {
                            console.error(err);
                            reject(err);
                        });
                    });
                    const inputFilePath = imageName;
                    const outputFilePath = `${dir2}/${fileId}.jpg`;
                    await new Promise((resolve, reject)=>{
                        sharp(inputFilePath).rotate()
                            .webp({ quality: 80 })
                            .resize(500)
                            .toFile(outputFilePath, (err, info) => {
                                if (err) {
                                    console.error(err);
                                    reject(err);
                                } else {
                                    console.log('Image resized successfully:', info);
                                    resolve();
                                }
                            });
                    });
                }
            }
            resolve();

        } catch (e) {
            console.error(e);
            reject(e);
        }
    });
});
};
router.get('/api/lamp-exp', async (req, res) => {
  const sheet = new GoogleSheetController('1XTXmV79dATRV3esViGFSaCxCRtK5OBZmayiF2iwxD18');
  sheet.setRange('data!A2:Z');
  Lamps.aggregate([
    {
      $lookup:
          {
            from: "zones",
            localField: "zone_id",
            foreignField: "_id",
            as: "zone",
          },
    },
    {
      $unwind:
          {
            path: "$zone",
            preserveNullAndEmptyArrays: true,
          },
    },
      // [ "ก่อนติดตั้ง", "ระหว่างติดตั้ง", "รูปภาพเลขครุภัณฑ์โคมไฟใหม", "รูปภาพเลขครุภัณฑ์โคมไฟใหม", "หลังติดตั้ง" ]
    {
      $lookup:
          {
            from: "files",
            localField: "_id",
            foreignField: "lamp_id",
            as: "files_before",
            pipeline: [
              {
                $match: {
                    type: "ก่อนติดตั้ง",
                }
              }
            ],
          },
    },
    {
      $lookup:
          {
            from: "files",
            localField: "_id",
            foreignField: "lamp_id",
            as: "files_during",
            pipeline: [
              {
                $match: {
                  type: "ระหว่างติดตั้ง",
                }
              }
            ],
          },
    },
    {
      $lookup:
          {
            from: "files",
            localField: "_id",
            foreignField: "lamp_id",
            as: "files_new_equipment",
            pipeline: [
              {
                $match: {
                  type: "รูปภาพเลขครุภัณฑ์โคมไฟใหม",
                }
              }
            ],
          },
    },
      {
      $lookup:
          {
            from: "files",
            localField: "_id",
            foreignField: "lamp_id",
            as: "files_old_equipment",
            pipeline: [
              {
                $match: {
                  type: "รูปภาพเลขครุภัณฑ์โคมไฟเดิม",
                }
              }
            ],
          },
    },
    {
      $lookup:
          {
            from: "files",
            localField: "_id",
            foreignField: "lamp_id",
            as: "files_after",
            pipeline: [
              {
                $match: {
                  type: "หลังติดตั้ง",
                }
              }
            ],
          },
    },
  ]).then(async (data) => {
    let _data = [];
    for (const [k,item] of Object.entries(data)) {
        if (item?.files_before[0]?.node_id){
            await saveFile(item?.files_before[0]?.node_id);
        }
        if (item?.files_after[0]?.node_id){
            await saveFile(item?.files_after[0]?.node_id);
        }
        if (item?.files_new_equipment[0]?.node_id){
            await saveFile(item?.files_new_equipment[0]?.node_id);
        }
        if (item?.files_old_equipment[0]?.node_id){
            await saveFile(item?.files_old_equipment[0]?.node_id);
        }
        if (item?.files_during[0]?.node_id){
            await saveFile(item?.files_during[0]?.node_id);
        }
        console.debug(` ================= `, );
        _data.push([
            item?.zone?.name??'',
            item?.name??'',
            item?.pole_number??'',
            item?.equipment_number??'',
            item?.latitude??'',
            item?.longitude??'',
            item?.files_before[0]?.node_id ? "https://bansuan-api.ledonhome.co.th/documents/"+item?.files_before[0]?.node_id+".jpg": '',
            item?.files_during[0]?.node_id ? "https://bansuan-api.ledonhome.co.th/documents/"+item?.files_during[0]?.node_id+".jpg": '',
            item?.files_new_equipment[0]?.node_id ? "https://bansuan-api.ledonhome.co.th/documents/"+item?.files_new_equipment[0]?.node_id+".jpg": '',
            item?.files_old_equipment[0]?.node_id ? "https://bansuan-api.ledonhome.co.th/documents/"+item?.files_old_equipment[0]?.node_id+".jpg": '',
            item?.files_after[0]?.node_id ? "https://bansuan-api.ledonhome.co.th/documents/"+item?.files_after[0]?.node_id+".jpg": '',
        ])
    }
      const data_csv = await Promise.all(data.map((item) => {
          return {
              _zone:item?.zone?._id ?? '',
                  zone:item?.zone?.name ?? '',
                  name:item?.name ?? '',
                  pole_number:item?.pole_number ?? '',
                  equipment_number:item?.equipment_number ?? '',
                  latitude:item?.latitude ?? '',
                  longitude:item?.longitude ?? '',
                  files_before:item?.files_before[0]?.node_id ? "https://bansuan-api.ledonhome.co.th/documents/" + item?.files_before[0]?.node_id + ".jpg" : '',
                  files_during:item?.files_during[0]?.node_id ? "https://bansuan-api.ledonhome.co.th/documents/" + item?.files_during[0]?.node_id + ".jpg" : '',
                  files_new_equipment:item?.files_new_equipment[0]?.node_id ? "https://bansuan-api.ledonhome.co.th/documents/" + item?.files_new_equipment[0]?.node_id + ".jpg" : '',
                  files_old_equipment:item?.files_old_equipment[0]?.node_id ? "https://bansuan-api.ledonhome.co.th/documents/" + item?.files_old_equipment[0]?.node_id + ".jpg" : '',
                  files_after:item?.files_after[0]?.node_id ? "https://bansuan-api.ledonhome.co.th/documents/" + item?.files_after[0]?.node_id + ".jpg" : '',
          };
      }));
      // console.debug(`data_csv => `, _.groupBy(data_csv,'_zone'));
      for (const [k,v] of Object.entries(_.groupBy(data_csv,'_zone'))) {
          // console.debug(`k => `, k);
          // console.debug(`v => `, v);
          const csvData = json2csv(v);
          fs.mkdirSync('public/documents', { recursive: true });
          const csvFilePath = `public/documents/${k}.csv`;
          fs.writeFileSync(csvFilePath, csvData);
      }

      // await sheet.update(_data);
    res.json(_.groupBy(data_csv,'_zone'));
  });
});

module.exports = router;
