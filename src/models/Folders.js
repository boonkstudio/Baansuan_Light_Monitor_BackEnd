const mongoose = require('mongoose');
const { Schema } = require('mongoose');

const Folders = mongoose.model('folders', new Schema({
  node_id: { type: String, default: null },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, versionKey: false,
}));
module.exports = Folders;
