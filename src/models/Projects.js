const mongoose = require('mongoose');
const { Schema } = require('mongoose');

const Projects = mongoose.model('projects', new Schema({
  name: { type: String, default: null },
  folder_id: { type: Schema.Types.ObjectId, ref: 'folders' },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, versionKey: false,
}));
module.exports = Projects;
