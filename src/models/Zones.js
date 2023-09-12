const mongoose = require('mongoose');
const { Schema } = require('mongoose');
// section
const Zones = mongoose.model('zones', new Schema({
  area_id: { type: Schema.Types.ObjectId, ref: 'areas' },
  name: { type: String, default: null },
  folder_id: { type: Schema.Types.ObjectId, ref: 'folders' },
  sequence: { type: Number, default: 0 },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, versionKey: false,
}));
module.exports = Zones;
