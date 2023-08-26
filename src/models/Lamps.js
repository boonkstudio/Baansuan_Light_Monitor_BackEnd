const mongoose = require('mongoose');
const { Schema } = require('mongoose');
// โคม
const Lamps = mongoose.model('lamp', new Schema({
  zone_id: { type: Schema.Types.ObjectId, ref: 'zones' },
  name: { type: String, default: null },
  uid: { type: String, default: null },
  folder_id: { type: Schema.Types.ObjectId, ref: 'folders' },
  sequence: { type: Number, default: null },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, versionKey: false,
}));
module.exports = Lamps;
