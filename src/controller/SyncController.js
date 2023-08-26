const _ = require('lodash');
const { Drive } = require('../../config/google');
const Projects = require('../models/Projects');
const Area = require('../models/Areas');
const Zone = require('../models/Zones');
const Alley = require('../models/Alleys');
const Lamp = require('../models/Lamps');
const GoogleController = require('./GoogleController');

class SyncController {
  projectLoop = async (item) => {
    const project = await Projects.findOneAndUpdate({ name: item[0] }, { $set: { name: item[0] } }, { new: true, upsert: true });
    if (!_.result(project, 'node_id')) {
      const fileMetadata = {
        name: project.name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: ['1xmCMALZonOiAFUQOo4z4YwRe1FBwPNWR'], // Bangkok Light Monitor
      };
      try {
        const file = await Drive.files.create({
          resource: fileMetadata,
          fields: 'id',
        });
        await Drive.permissions.create({
          fileId: file.data.id,
          requestBody: {
            role: 'reader',
            type: 'anyone',
          },
        });
        await Projects.findOneAndUpdate({ _id: project._id }, { $set: { node_id: file.data.id } });
      } catch (err) {
        // TODO(developer) - Handle error
      }
    }
  };

  project = async (item) => {
    if (!_.result(item, 'folder_id')) {
      try {
        const folder = await GoogleController.createFolder(item.name, process.env.GOOGLE_FOLDER_ROOT_ID);
        await Projects.findOneAndUpdate({ _id: item._id }, { $set: { folder_id: folder._id } });
      } catch (err) {
        // TODO(developer) - Handle error
      }
    }
  };

  areaLoop = async (item) => {
    const project = await Projects.findOneAndUpdate({ name: item[0] }, { $set: { name: item[0] } }, { new: true, upsert: true });
    if (project) {
      const area = await Area.findOneAndUpdate({ name: item[1], project_id: project._id }, { $set: { name: item[1], project_id: project._id } }, { new: true, upsert: true });
      if (!_.result(area, 'node_id')) {
        const fileMetadata = {
          name: area.name,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [project.node_id], // Bangkok Light Monitor
        };
        try {
          const files = await Drive.files.list({
            parents: [project.node_id],
            fields: 'files(id, name)',
          });
          const myFile = _.find(files.data.files, { name: area.name });
          if (myFile) {
            await Area.findOneAndUpdate({ _id: area._id }, { $set: { node_id: myFile.id } });
          } else {
            const file = await Drive.files.create({
              resource: fileMetadata,
              fields: 'id',
            });
            await Drive.permissions.create({
              fileId: file.data.id,
              requestBody: {
                role: 'reader',
                type: 'anyone',
              },
            });
            await Area.findOneAndUpdate({ _id: area._id }, { $set: { node_id: file.data.id } });
          }
        } catch (err) {
          // TODO(developer) - Handle error
        }
      }
    }
  };

  area = async (item) => {
    const _area = await Area.findOne({ _id: item._id }).populate({
      path: 'project_id',
      populate: {
        path: 'folder_id',
      },
    });
    if (!_.result(item, 'folder_id')) {
      try {
        const folder = await GoogleController.createFolder(item.name, _.result(_area, 'project_id.folder_id.node_id'));
        await Area.findOneAndUpdate({ _id: item._id }, { $set: { folder_id: folder._id } });
      } catch (err) {
        // TODO(developer) - Handle error
      }
    }
  };

  zonesLoop = async (item) => {
    try {
      const area = await Area.findOne({ name: item[0] }).populate('project_id');
      if (area) {
        const zone = await Zone.findOneAndUpdate({ name: item[1], }, { $set: { name: item[1] } }, { new: true, upsert: true });
        if (!_.result(zone, 'node_id')) {
          const fileMetadata = {
            name: zone.name,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [area.node_id], // Bangkok Light Monitor
          };
          try {
            const file = await Drive.files.create({
              resource: fileMetadata,
              fields: 'id',
            });
            await Drive.permissions.create({
              fileId: file.data.id,
              requestBody: {
                role: 'reader',
                type: 'anyone',
              },
            });
            await Zone.findOneAndUpdate({ _id: zone._id }, { $set: { node_id: file.data.id } });
          } catch (err) {
            // TODO(developer) - Handle error
          }
        }
      }
      // return true;
    } catch (e) {
      // return false;
    }
  };

  zone = async (item) => {
    const _zone = await Zone.findOne({ _id: item._id }).populate({
      path: 'area_id',
      populate: {
        path: 'folder_id',
      },
    });
    if (!_.result(item, 'folder_id')) {
      try {
        const folder = await GoogleController.createFolder(item.name, _.result(_zone, 'area_id.folder_id.node_id'));
        await Zone.findOneAndUpdate({ _id: item._id }, { $set: { folder_id: folder._id } });
      } catch (err) {
        // TODO(developer) - Handle error
      }
    }
  };

  alleyLoop = async (item) => {
    try {
      const zone = await Zone.findOne({ name: item[0] });
      if (zone) {
        const alley = await Alley.findOneAndUpdate({ name: item[1], zone_id: zone._id }, { $set: { name: item[1], zone_id: zone._id } }, { new: true, upsert: true });
        if (!_.result(alley, 'node_id')) {
          const fileMetadata = {
            name: alley.name,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [zone.node_id], // Bangkok Light Monitor
          };
          try {
            const file = await Drive.files.create({
              resource: fileMetadata,
              fields: 'id',
            });
            await Drive.permissions.create({
              fileId: file.data.id,
              requestBody: {
                role: 'reader',
                type: 'anyone',
              },
            });
            await Alley.findOneAndUpdate({ _id: alley._id }, { $set: { node_id: file.data.id } });
          } catch (err) {
            // TODO(developer) - Handle error
          }
        }
      }
      // return true;
    } catch (e) {
      // return false;
    }
  };

  alley = async (item) => {
    const _alley = await Alley.findOne({ _id: item._id }).populate({
      path: 'zone_id',
      populate: {
        path: 'folder_id',
      },
    });
    if (!_.result(item, 'folder_id')) {
      try {
        const folder = await GoogleController.createFolder(item.name, _.result(_alley, 'zone_id.folder_id.node_id'));
        await Alley.findOneAndUpdate({ _id: item._id }, { $set: { folder_id: folder._id } });
      } catch (err) {
        // TODO(developer) - Handle error
      }
    }
  };

  lampLoop = async (item) => {
    const alley = await Alley.findOne({ name: item[0] });
    if (alley) {
      const lamp = await Lamp.findOneAndUpdate({ name: item[1], uid: item[2], alley_id: alley._id }, { $set: { name: item[1], uid: item[2], alley_id: alley._id } }, { new: true, upsert: true });
      if (!_.result(lamp, 'node_id')) {
        const fileMetadata = {
          name: lamp.name,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [alley.node_id], // Bangkok Light Monitor
        };
        try {
          const file = await Drive.files.create({
            resource: fileMetadata,
            fields: 'id',
          });
          await Drive.permissions.create({
            fileId: file.data.id,
            requestBody: {
              role: 'reader',
              type: 'anyone',
            },
          });
          await Lamp.findOneAndUpdate({ _id: lamp._id }, { $set: { node_id: file.data.id } });
        } catch (err) {
          // TODO(developer) - Handle error
        }
      }
    }
  };

  lamp = async (item, find) => await Promise.all(Array.from({ length: find[2] }).map(async (value, i, array) => {
    const lamp = await Lamp.findOneAndUpdate(
      { alley_id: item._id, sequence: (i + 1) },
      {
        alley_id: item._id,
        name: `${item.name}-${(i + 1).toString().padStart(3, '0')}`,
        sequence: (i + 1),
      },
      { new: true, upsert: true },
    );
    return lamp;
  }));

  lampFolder = async (item) => {
    const _alley = await Alley.findOne({ _id: item.alley_id }).populate('folder_id');
    if (!_.result(item, 'folder_id')) {
      try {
        const folder = await GoogleController.createFolder(item.name, _.result(_alley, 'folder_id.node_id'));
        await Lamp.findOneAndUpdate({ _id: item._id }, { $set: { folder_id: folder._id } });
      } catch (err) {
        // TODO(developer) - Handle error
      }
    }
  };
}

module.exports = new SyncController();
