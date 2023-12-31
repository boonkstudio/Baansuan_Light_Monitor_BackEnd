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

const saveFile = async ( node,renew=false) => {
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
    if (renew){
        try {
            fs.unlinkSync(imageName, (err) => {
                if (err) {
                    console.error(err);
                }
            });
        }catch (e) {

        }
        try {
            fs.unlinkSync(`${dir2}/${fileId}.jpeg`, (err) => {
                if (err) {
                    console.error(err);
                }
            });
        }catch (e) {

        }
    }

    await new Promise((resolve, reject) => {
    fs.readFile(`${dir2}/${fileId}.jpeg`, async (err, data) => {
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
                    const outputFilePath = `${dir2}/${fileId}.jpeg`;
                    await new Promise((resolve, reject)=>{
                        sharp(inputFilePath).rotate().jpeg({ quality: 80 })
                            // .jpeg({ quality: 80 })
                            .resize(500)
                            .toFile(outputFilePath, (err, info) => {
                                if (err) {
                                    console.error(err);
                                    resolve(err);
                                } else {
                                    console.log('Image resized successfully:', info);
                                    resolve();
                                    try {
                                        fs.unlinkSync(imageName, (err) => {
                                            if (err) {
                                                console.error(err);
                                            }
                                        });
                                    }catch (e) {

                                    }

                                }
                            });
                    });
                }
            }
            // if (err) {
            //     try {
            //         const response = await Drive.files.get({
            //             fileId: fileId,
            //             fields: 'id, name, webViewLink, webContentLink, permissions, thumbnailLink',
            //             quotaUser: 'test',
            //         });
            //         const imageUrl = _.result(response, 'data.thumbnailLink', '').replace('s220', 's500');
            //         const file = fs.createWriteStream(`${dir2}/${fileId}.jpeg`);
            //         https.get(imageUrl, (response) => {
            //             try {
            //                 response.pipe(file);
            //                 file.on('finish', async () => {
            //                     file.close();
            //                 });
            //             }catch (e) {
            //
            //             }
            //
            //         }).on('error', (err) => {
            //         });
            //     }catch (e) {
            //
            //     }
            //
            // }
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
    const img = fs.readFileSync(`public/documents/resized/${filePath}.jpeg`);
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
    const renew = req.query.renew === 'true';
    console.debug(`renew => `, renew);
    const lamp = await Lamps.findOne({ _id }).populate('zone_id').exec();
    const files = await Files.find({ lamp_id: _id });
    const item = {
        ...lamp.toObject(),
        files_before:_.orderBy(files.filter((item)=>item.type==='ก่อนติดตั้ง'),'created_at','desc'),
        files_during:_.orderBy(files.filter((item)=>item.type==='ระหว่างติดตั้ง'),'created_at','desc'),
        files_after:_.orderBy(files.filter((item)=>item.type==='หลังติดตั้ง'),'created_at','desc'),
        files_new_equipment:_.orderBy(files.filter((item)=>item.type==='รูปภาพเลขครุภัณฑ์โคมไฟใหม'),'created_at','desc'),
        files_old_equipment:_.orderBy(files.filter((item)=>item.type==='รูปภาพเลขครุภัณฑ์โคมไฟเดิม'),'created_at','desc'),
        files_lights_on:_.orderBy(files.filter((item)=>item.type==='ภาพถ่ายดำเนินการแล้วเสร็จ(ไฟติด)'),'created_at','desc'),
    };
    if(item){
        if (item?.files_before[0]?.node_id){
            await saveFile(item?.files_before[0]?.node_id,renew);
        }
        if (item?.files_after[0]?.node_id){
            await saveFile(item?.files_after[0]?.node_id,renew);
        }
        if (item?.files_new_equipment[0]?.node_id){
            await saveFile(item?.files_new_equipment[0]?.node_id,renew);
        }
        if (item?.files_old_equipment[0]?.node_id){
            await saveFile(item?.files_old_equipment[0]?.node_id,renew);
        }
        if (item?.files_during[0]?.node_id){
            await saveFile(item?.files_during[0]?.node_id,renew);
        }
        if (item?.files_lights_on[0]?.node_id){
            await saveFile(item?.files_lights_on[0]?.node_id,renew);
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
            files_lights_on:toBase64(item?.files_lights_on[0]?.node_id ? item?.files_lights_on[0]?.node_id:""),
        });
    }else{
        res.json({
            message: 'data not found',
        });
    }

});

const { ObjectId } = require('mongodb');
const Zones = require("../models/Zones");
const http = require("http");
router.get('/api/get-zone-exp/:_id', async (req, res) => {

    try {
        const { _id } = req.params;
        const renew = req.query.renew === 'true';
        const lamps = await Lamps.aggregate([
            {$match:{zone_id: new ObjectId(_id) }},
            {
                $lookup:
                    {
                        from: "files",
                        localField: "_id",
                        foreignField: "lamp_id",
                        as: "files",
                    },
            },
        ]).exec();
        const zone = await Zones.findOne({ _id }).select(['name','sequence']).exec();
        const array = [];
        let i= 0;
        const array2 = await Promise.all(lamps.map(async (lamp)=>{
            const item = {
                _id: _.result(lamp, '_id', '')??'',
                name: _.result(lamp, 'name', '')??'',
                pole_number: _.result(lamp, 'pole_number', '')??'',
                equipment_number: _.result(lamp, 'equipment_number', '')??'',
                before_installing:_.orderBy((_.result(lamp,'files',[])??[]).filter((item)=>item.type==='ก่อนติดตั้ง'),'created_at','desc'),
                during_installation:_.orderBy((_.result(lamp,'files',[])??[]).filter((item)=>item.type==='ระหว่างติดตั้ง'),'created_at','desc'),
                after_installation:_.orderBy((_.result(lamp,'files',[])??[]).filter((item)=>item.type==='หลังติดตั้ง'),'created_at','desc'),
                picture_of_new_lamp_equipment_number:_.orderBy((_.result(lamp,'files',[])??[]).filter((item)=>item.type==='รูปภาพเลขครุภัณฑ์โคมไฟใหม'),'created_at','desc'),
                picture_of_original_lamp_equipment_number:_.orderBy((_.result(lamp,'files',[])??[]).filter((item)=>item.type==='รูปภาพเลขครุภัณฑ์โคมไฟเดิม'),'created_at','desc'),
                photos_completed:_.orderBy((_.result(lamp,'files',[])??[]).filter((item)=>item.type==='ภาพถ่ายดำเนินการแล้วเสร็จ(ไฟติด)'),'created_at','desc'),
            };
            // if (item?.before_installing[0]?.node_id){
            //     await saveFile(item?.before_installing[0]?.node_id,renew);
            // }
            if (item?.during_installation[0]?.node_id){
                await saveFile(item?.during_installation[0]?.node_id,renew);
            }
            if (item?.after_installation[0]?.node_id){
                await saveFile(item?.after_installation[0]?.node_id,renew);
            }
            if (item?.picture_of_new_lamp_equipment_number[0]?.node_id){
                await saveFile(item?.picture_of_new_lamp_equipment_number[0]?.node_id,renew);
            }
            // if (item?.picture_of_original_lamp_equipment_number[0]?.node_id){
            //     await saveFile(item?.picture_of_original_lamp_equipment_number[0]?.node_id,renew);
            // }
            if (item?.photos_completed[0]?.node_id){
                await saveFile(item?.photos_completed[0]?.node_id,renew);
            }
            return {
                ...zone.toObject(),
                lamp_name:item?.name ?? '',
                pole_number:item?.pole_number ?? '',
                equipment_number:item?.equipment_number ?? '',
                files_before:item?.picture_of_new_lamp_equipment_number[0]?.node_id ? "https://bansuan-api.ledonhome.co.th/documents/resized/"+item?.picture_of_new_lamp_equipment_number[0]?.node_id+".jpeg":"",
                files_during:item?.during_installation[0]?.node_id ? "https://bansuan-api.ledonhome.co.th/documents/resized/"+item?.during_installation[0]?.node_id+".jpeg":"",
                files_lights_on:item?.after_installation[0]?.node_id ? "https://bansuan-api.ledonhome.co.th/documents/resized/"+item?.after_installation[0]?.node_id+".jpeg":item?.photos_completed[0]?.node_id ? "https://bansuan-api.ledonhome.co.th/documents/resized/"+item?.photos_completed[0]?.node_id+".jpeg":"",
            }
        }));
        const data = _.orderBy(array2,'equipment_number','asc');
        res.json(data);
    }catch (e) {
        res.status(500).json({success:false,message:e.message});
    }
});
router.post('/api/zone-exp', async (req, res) => {

    try {
        const { _id: id } = req.body;
        const renew = req.query.renew === 'true';
        const lamps = await Lamps.aggregate([
            {$match:{zone_id: new ObjectId(id) }},
            {
                $lookup:
                    {
                        from: "files",
                        localField: "_id",
                        foreignField: "lamp_id",
                        as: "files",
                    },
            },
        ]).exec();
        const zone = await Zones.findOne({ _id: id }).select(['name','sequence']).exec();
        const array2 = await Promise.all(lamps.map(async (lamp)=>{
            const item = {
                _id: _.result(lamp, '_id', '')??'',
                name: _.result(lamp, 'name', '')??'',
                pole_number: _.result(lamp, 'pole_number', '')??'',
                equipment_number: _.result(lamp, 'equipment_number', '')??'',
                before_installing:_.orderBy((_.result(lamp,'files',[])??[]).filter((item)=>item.type==='ก่อนติดตั้ง'),'created_at','desc'),
                during_installation:_.orderBy((_.result(lamp,'files',[])??[]).filter((item)=>item.type==='ระหว่างติดตั้ง'),'created_at','desc'),
                after_installation:_.orderBy((_.result(lamp,'files',[])??[]).filter((item)=>item.type==='หลังติดตั้ง'),'created_at','desc'),
                picture_of_new_lamp_equipment_number:_.orderBy((_.result(lamp,'files',[])??[]).filter((item)=>item.type==='รูปภาพเลขครุภัณฑ์โคมไฟใหม'),'created_at','desc'),
                picture_of_original_lamp_equipment_number:_.orderBy((_.result(lamp,'files',[])??[]).filter((item)=>item.type==='รูปภาพเลขครุภัณฑ์โคมไฟเดิม'),'created_at','desc'),
                photos_completed:_.orderBy((_.result(lamp,'files',[])??[]).filter((item)=>item.type==='ภาพถ่ายดำเนินการแล้วเสร็จ(ไฟติด)'),'created_at','desc'),
            };
            // if (item?.before_installing[0]?.node_id){
            //     await saveFile(item?.before_installing[0]?.node_id,renew);
            // }
            if (item?.during_installation[0]?.node_id){
                await saveFile(item?.during_installation[0]?.node_id,renew);
            }
            if (item?.after_installation[0]?.node_id){
                await saveFile(item?.after_installation[0]?.node_id,renew);
            }
            if (item?.picture_of_new_lamp_equipment_number[0]?.node_id){
                await saveFile(item?.picture_of_new_lamp_equipment_number[0]?.node_id,renew);
            }
            // if (item?.picture_of_original_lamp_equipment_number[0]?.node_id){
            //     await saveFile(item?.picture_of_original_lamp_equipment_number[0]?.node_id,renew);
            // }
            if (item?.photos_completed[0]?.node_id){
                await saveFile(item?.photos_completed[0]?.node_id,renew);
            }
            return {
                ...zone.toObject(),
                lamp_name:item?.name ?? '',
                pole_number:item?.pole_number ?? '',
                equipment_number:item?.equipment_number ?? '',
                files_before:item?.picture_of_new_lamp_equipment_number[0]?.node_id ? "https://bansuan-api.ledonhome.co.th/documents/resized/"+item?.picture_of_new_lamp_equipment_number[0]?.node_id+".jpeg":"",
                files_during:item?.during_installation[0]?.node_id ? "https://bansuan-api.ledonhome.co.th/documents/resized/"+item?.during_installation[0]?.node_id+".jpeg":"",
                files_lights_on:item?.after_installation[0]?.node_id ? "https://bansuan-api.ledonhome.co.th/documents/resized/"+item?.after_installation[0]?.node_id+".jpeg":item?.photos_completed[0]?.node_id ? "https://bansuan-api.ledonhome.co.th/documents/resized/"+item?.photos_completed[0]?.node_id+".jpeg":"",
            }
        }));
        const data = _.orderBy(array2,'equipment_number','asc');
        res.json(data);
    }catch (e) {
        res.json({success:false,message:e.message});
    }
});

router.get('/api/report/zone/:_id', async (req, res) => {
    const { _id } = req.params;
    try {
        const jasperServer = process.env.JASPER_SERVER;
        const jasperUser = process.env.JASPER_USERNAME;
        const jasperPassword = process.env.JASPER_PASSWORD;
        const link = `${jasperServer}/rest_v2/reports/tkc/product/product-standard-1.pdf?_id=${_id}&viewAsDashboardFrame=true&standAlone=true&j_acegi_security_check&j_username=${jasperUser}&j_password=${jasperPassword}`;
        const fileName = `public/documents/${_id}.pdf`;
        const file = fs.createWriteStream(fileName);
        const request = await http.get(link, (response) => {
            response.pipe(file);

            // after download completed close filestream
            file.on('finish', () => {
                file.close();
                res.download(fileName, (err) => {
                    if (err) {
                        // Handle error, but keep in mind the response may be partially-sent
                        // so check res.headersSent
                    } else {
                        fs.unlink(fileName, () => {});
                    }
                });
            });
        });

        // res.json(product);
    } catch (e) {}
});

module.exports = router;
