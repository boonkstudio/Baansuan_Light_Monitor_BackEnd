const _ = require('lodash');
const { Sheets } = require('../../config/google');

class GoogleSheetController {
  constructor(sheetId) {
    this.sheetId = sheetId;
    this.range = null;
  }

  setRange(range) {
    this.range = range;
  }

  async get() {
    const connect = await Sheets.spreadsheets.values.get({
      spreadsheetId: this.sheetId,
      range: this.range,
    });

    return _.get(connect, 'data.values', []);
  }

  async update(data) {
    const connect = await Sheets.spreadsheets.values.update({
      spreadsheetId: this.sheetId,
      range: this.range,
      valueInputOption: 'RAW',
      resource: {
        values: data,
      },
    });
  }

  async clear() {
    const connect = await Sheets.spreadsheets.values.clear({
      spreadsheetId: this.sheetId,
      range: this.range,
    });
  }
}

module.exports = GoogleSheetController;
