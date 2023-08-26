const express = require('express');

const router = express.Router();
const fs = require('fs');
const Core = require('../utils/Core');

const files = fs.readdirSync('./src/routes');

files.forEach((file) => {
  if (file !== 'index.js' && file.includes('.js')) {
    const route = require(`./${file}`);
    router.use(route);
  } else if (!file.includes('.js')) {
    const lv2 = fs.readdirSync(`./src/routes/${file}`);
    lv2.forEach((fileLv2) => {
      if (fileLv2 !== 'index.js' && fileLv2.includes('.js')) {
        const route = require(`./${file}/${fileLv2}`);
        router.use(route);
      }
    });
  }
});

module.exports = router;
