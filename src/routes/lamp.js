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

    fs.readFile(imageName, async (err, data) => {
        try {
            if (err) {
                await Drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream',size:1 }, (err, resp) => {
                    if (_.result(resp, 'data', false)) {
                        const dest = fs.createWriteStream(imageName);
                        resp.data.pipe(dest);
                        console.log(`Image downloaded as ${imageName}`);

                    }
                });
            }
            const inputFilePath = imageName;
            const outputFilePath = `${dir2}/${fileId}.jpg`;
            const newWidth = 500;
            const newHeight = 500;
            sharp(inputFilePath).rotate()
                .webp({ quality: 80 })
                .resize(500)
                // .resize(newWidth, newHeight,{
                //     fit:"contain",
                //     background: { r: 255, g: 255, b: 255, alpha: 1 }
                // })
                .toFile(outputFilePath, (err, info) => {
                    if (err) {
                        console.error(err);
                    } else {
                        console.log('Image resized successfully:', info);
                    }
                });
        } catch (e) {
            console.error(e);
        }
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
    const _data = await Promise.all(data.map((item) => {
        if (item?.files_before[0]?.node_id){
            saveFile(item?.files_before[0]?.node_id);
        }
        if (item?.files_after[0]?.node_id){
            saveFile(item?.files_after[0]?.node_id);
        }
        if (item?.files_new_equipment[0]?.node_id){
            saveFile(item?.files_new_equipment[0]?.node_id);
        }
        if (item?.files_old_equipment[0]?.node_id){
            saveFile(item?.files_old_equipment[0]?.node_id);
        }
        if (item?.files_during[0]?.node_id){
            saveFile(item?.files_during[0]?.node_id);
        }
        return [
            item?.zone?.name??'',
            item?.name??'',
            item?.pole_number??'',
            item?.equipment_number??'',
            item?.latitude??'',
            item?.longitude??'',
            item?.files_before[0]?.node_id ? "https://bansuan-api.ledonhome.co.th/documents/resized/"+item?.files_before[0]?.node_id+".jpg": '',
            item?.files_during[0]?.node_id ? "https://bansuan-api.ledonhome.co.th/documents/resized/"+item?.files_during[0]?.node_id+".jpg": '',
            item?.files_new_equipment[0]?.node_id ? "https://bansuan-api.ledonhome.co.th/documents/resized/"+item?.files_new_equipment[0]?.node_id+".jpg": '',
            item?.files_old_equipment[0]?.node_id ? "https://bansuan-api.ledonhome.co.th/documents/resized/"+item?.files_old_equipment[0]?.node_id+".jpg": '',
            item?.files_after[0]?.node_id ? "https://bansuan-api.ledonhome.co.th/documents/resized/"+item?.files_after[0]?.node_id+".jpg": '',
        ];
    }));
      const data_csv = await Promise.all(data.map((item) => {
          return {
                  zone:item?.zone?.name ?? '',
                  name:item?.name ?? '',
                  pole_number:item?.pole_number ?? '',
                  equipment_number:item?.equipment_number ?? '',
                  latitude:item?.latitude ?? '',
                  longitude:item?.longitude ?? '',
                  files_before:item?.files_before[0]?.node_id ? "https://bansuan-api.ledonhome.co.th/documents/resized/" + item?.files_before[0]?.node_id + ".jpg" : '',
                  files_during:item?.files_during[0]?.node_id ? "https://bansuan-api.ledonhome.co.th/documents/resized/" + item?.files_during[0]?.node_id + ".jpg" : '',
                  files_new_equipment:item?.files_new_equipment[0]?.node_id ? "https://bansuan-api.ledonhome.co.th/documents/resized/" + item?.files_new_equipment[0]?.node_id + ".jpg" : '',
                  files_old_equipment:item?.files_old_equipment[0]?.node_id ? "https://bansuan-api.ledonhome.co.th/documents/resized/" + item?.files_old_equipment[0]?.node_id + ".jpg" : '',
                  files_after:item?.files_after[0]?.node_id ? "https://bansuan-api.ledonhome.co.th/documents/resized/" + item?.files_after[0]?.node_id + ".jpg" : '',
          };
      }));
      const csvData = json2csv(data_csv);
      fs.mkdirSync('public/documents', { recursive: true });
      const csvFilePath = 'public/documents/report.csv';
      fs.writeFileSync(csvFilePath, csvData);
      await sheet.update(_data);
    res.json(_data);
  });
});

module.exports = router;
