const mongoose = require('mongoose');
const { Schema } = require('mongoose');

const Files = mongoose.model('files', new Schema({
  name: { type: String, default: null },
  node_id: { type: String, default: null },
  type: { type: String, default: null },
  lamp_id: { type: Schema.Types.ObjectId, default: null, ref: 'lamps' },
  alley_id: { type: Schema.Types.ObjectId, ref: 'alleys' },
  sequence: { type: Number, default: null },
  created_by: { type: String, default: null },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, versionKey: false,
}));
module.exports = Files;
