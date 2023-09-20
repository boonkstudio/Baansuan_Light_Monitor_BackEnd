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
const {Schema} = require("mongoose");

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

const saveFile = async ( node,index) => {
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
                            resolve();
                        });
                    });
                    const inputFilePath = imageName;
                    const outputFilePath = `${dir2}/${fileId}.webp`;
                    await new Promise((resolve, reject)=>{
                        sharp(inputFilePath).rotate()
                            .webp({ quality: 80 })
                            .resize(500)
                            .toFile(outputFilePath, (err, info) => {
                                if (err) {
                                    console.error(err);
                                    resolve(err);
                                } else {
                                    console.log('Image resized successfully:', info);
                                    resolve();
                                }
                            });
                    });
                }
            }
            const inputFilePath = imageName;
            const outputFilePath = `${dir2}/${fileId}.webp`;
            fs.readFile(outputFilePath, async (err, data) => {
                try {
                    if (err) {
                        await new Promise((resolve, reject)=>{
                            sharp(inputFilePath).rotate()
                                .webp({ quality: 80 })
                                .resize(500)
                                .toFile(outputFilePath, (err, info) => {
                                    if (err) {
                                        console.error(err);
                                        resolve(err);
                                    } else {
                                        console.log('Image resized successfully:', info);
                                        resolve();
                                    }
                                });
                        });
                    }
                    resolve();
                } catch (e) {
                    console.error(e);
                    reject(e);
                }
            });
            resolve();
        } catch (e) {
            console.error(e);
            reject(e);
        }
    });
});
};
function toBase64(filePath='') {
try {
    if (filePath!==''){
    const img = fs.readFileSync(`public/documents/resized/${filePath}.webp`);
    if (img){
        const b64 =  new Buffer(img).toString('base64');
        return b64
    }
    return "";
    }
}catch (e) {
    return '';
}
}
router.get('/api/lamp-exp/:_id', async (req, res) => {
    const { _id } = req.params;
    const lamp = await Lamps.findOne({ _id }).populate('zone_id').exec();
    const files = await Files.find({ lamp_id: _id });
    const item = {
        ...lamp.toObject(),
        files_before:_.orderBy(files.filter((item)=>item.type==='ก่อนติดตั้ง'),'created_at','desc'),
        files_during:_.orderBy(files.filter((item)=>item.type==='ระหว่างติดตั้ง'),'created_at','desc'),
        files_after:_.orderBy(files.filter((item)=>item.type==='หลังติดตั้ง'),'created_at','desc'),
        files_new_equipment:_.orderBy(files.filter((item)=>item.type==='รูปภาพเลขครุภัณฑ์โคมไฟใหม'),'created_at','desc'),
        files_old_equipment:_.orderBy(files.filter((item)=>item.type==='รูปภาพเลขครุภัณฑ์โคมไฟเดิม'),'created_at','desc'),
    };
    if(item){
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
        res.json({
            zone:item?.zone?.name ?? '',
            name:item?.name ?? '',
            pole_number:item?.pole_number ?? '',
            equipment_number:item?.equipment_number ?? '',
            latitude:item?.latitude ?? '',
            longitude:item?.longitude ?? '',
            files_before:toBase64(item?.files_before[0]?.node_id ? item?.files_before[0]?.node_id:""),
            files_during:toBase64(item?.files_during[0]?.node_id ? item?.files_during[0]?.node_id:""),
            files_new_equipment:toBase64(item?.files_new_equipment[0]?.node_id ? item?.files_new_equipment[0]?.node_id:""),
            files_old_equipment:toBase64(item?.files_old_equipment[0]?.node_id ? item?.files_old_equipment[0]?.node_id:""),
            files_after:toBase64(item?.files_after[0]?.node_id ? item?.files_after[0]?.node_id:""),
        });
    }else{
        res.json({
            message: 'data not found',
        });
    }

});

module.exports = router;
