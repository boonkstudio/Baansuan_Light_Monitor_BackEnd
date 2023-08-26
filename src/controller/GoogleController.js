const _ = require('lodash');
const { Drive } = require('../../config/google');
const Projects = require('../models/Projects');
const Area = require('../models/Areas');
const Folders = require('../models/Folders');
const fs = require("fs");

class GoogleController {
  createFolder = async (name = '', parentId = '') => {
    const fileMetadata = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (parentId) {
      fileMetadata.parents = [parentId];
    }
    try {
      const files = await Drive.files.list({
        fields: 'files(id, name)',
      });
      if (parentId) {
        fileMetadata.parents = [parentId];
      }
      const myFile = _.find(files.data.files, { name });
      if (myFile) {
        return await Folders.findOneAndUpdate({ node_id: myFile.id }, { $set: { node_id: myFile.id } }, { new: true, upsert: true });
      }
      const file = await Drive.files.create({
        resource: fileMetadata,
        fields: 'id',
      });
      await Drive.permissions.create({
        fileId: file.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
      return await Folders.findOneAndUpdate({ node_id: file.data.id }, { $set: { node_id: file.data.id } }, { new: true, upsert: true });
    } catch (err) {
      console.error('createFolder => ', err);
      return null;
    }
  };

  uploadFile = async ({
    file, fileName, mimeType, folderId,
  }) => {
    // const mimeType = _.result(item, 'file_type', 'image/jpeg');
    // const base64 = _.result(item, 'url', '');
    // const name = await genCode('google_drive_file', 'BS', 'doc');
    // const fileName = `public/documents/${name}.${mimeType.split('/')[1]}`;
    // const base64Image = base64.split(';base64,')
    //     .pop();
    //
    // fs.writeFile(fileName, base64Image, { encoding: 'base64' }, (err) => {
    // });
    //
    // const _upload = await uploadFileToGoogle({
    //   file: fs.createReadStream(fileName),
    //   fileName: fileName.split('/')[2],
    //   mimeType,
    //   parents: '11T0-7D4wEy-7yWcjARRQIzvAPMAUzI96', // product
    // });
    //
    // fs.unlinkSync(fileName);
    // let base64Google = '';
    // request.get(_.result(_upload, 'file.thumbnailLink', ''), (error, response, body) => {
    //   if (!error && response.statusCode === 200) {
    //     base64Google = `data:${response.headers['content-type']};base64,${Buffer.from(body)
    //         .toString('base64')}`;
    //   }
    // });
  };
}

module.exports = new GoogleController();
