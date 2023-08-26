const mongoose = require('mongoose');
const { Schema } = require('mongoose');

const Areas = mongoose.model('areas', new Schema({
  project_id: { type: Schema.Types.ObjectId, ref: 'projects' },
  name: { type: String, default: null },
  folder_id: { type: Schema.Types.ObjectId, ref: 'folders' },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, versionKey: false,
}));
module.exports = Areas;
