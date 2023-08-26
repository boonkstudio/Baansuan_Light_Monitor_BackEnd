require('dotenv').config();
const _ = require('lodash');
const { Readable } = require('stream');
const fs = require('fs');

exports.Index = (req, res) => {
  try {
    res.json({
      message: process.env.SERVER_MESSAGE ? process.env.SERVER_MESSAGE : 'Welcome to the LEDOnhome API',
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.prepareImageFormBase64 = (base64, mimeType, fileName) => {
  try {
    const imgBuffer = Buffer.from(base64, 'base64');
    const file = new Readable();
    file.push(imgBuffer);
    file.push(null);
    file.pipe(fs.createWriteStream(fileName));
    return file;
  } catch (e) {
    console.error(e);
    return null;
  }
};
