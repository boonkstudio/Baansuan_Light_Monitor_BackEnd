const mongoose = require('mongoose');
const { Schema } = require('mongoose');
// section ซอย

const Alleys = mongoose.model('alleys', new Schema({
  zone_id: { type: Schema.Types.ObjectId, ref: 'zones' },
  name: { type: String, default: null },
  folder_id: { type: Schema.Types.ObjectId, ref: 'folders' },
  file_image: { type: Schema.Types.ObjectId, ref: 'files' },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, versionKey: false,
}));
module.exports = Alleys;
