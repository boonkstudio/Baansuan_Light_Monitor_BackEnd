const { google } = require('googleapis');
const fs = require('fs');
const { Readable } = require('stream');

// section valueTest

const fileIdTest = '';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/spreadsheets',
];

const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI,
  SCOPES,
);

oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const drive = google.drive({
  version: 'v3',
  auth: oAuth2Client,
});
module.exports.Drive = drive;

const mail = google.gmail({
  version: 'v1',
  auth: oAuth2Client,
});
module.exports.Mail = mail;

const sheet = google.sheets({ version: 'v4', auth: oAuth2Client });
module.exports.Sheets = sheet;

async function testUploadFile({ file, fileName, mimeType }) {
  try {
    // const response = await drive.files.create({
    //   requestBody: {
    //     name: fileName,
    //     mimeType,
    //     parents: ['1qAiej23fqT8t5Y11Dvrp8DQcpV6RGKOq'], // folder id [** only folder id **]
    //   },
    //   media: {
    //     mimeType,
    //     body: file,
    //   },
    const fileMetadata = {
      name: fileName,
      mimeType: 'image/webp',
      parents: ['1qAiej23fqT8t5Y11Dvrp8DQcpV6RGKOq'],
    };
    const media = {
      mimeType,
      body: file,
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      media,
      fields: 'id',
    });
    file.unpipe();
    file.destroy();
  } catch (e) {
    console.error('error => ', e.message);
  }
}
module.exports.testUploadFile = testUploadFile;

async function testListFiles() {
  try {
    const response = await drive.files.list({
      pageSize: 10,
      fields: 'nextPageToken, files(id, name)',
    });
    const { files } = response.data;
    if (files.length) {
      files.map((file) => {
        // console.info(`${file.name} (${file.id})`);
      });
    } else {
      console.error('No files found.');
    }
  } catch (e) {
    console.error('error => ', e.message);
  }
}
module.exports.testListFiles = testListFiles;
async function testPermissions() {
  const response = await drive.permissions.create({
    fileId: '16r19gRLVJrPg42BS9ceqX3ntncTRC9oJ',
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  });
}

async function testGet() {
  const response = await drive.files.get({
    fileId: '16r19gRLVJrPg42BS9ceqX3ntncTRC9oJ',
    fields: 'id, name, webViewLink, webContentLink, permissions, thumbnailLink',
  });
}

function prepareImageFormBase64(base64, mimeType, fileName) {
  try {
    const imgBuffer = Buffer.from(base64, 'base64');
    const file = new Readable();
    file.push(imgBuffer);
    file.push(null);
    file.pipe(fs.createWriteStream(fileName));
    return file;
  } catch (e) {
    console.error(e);
    return null;
  }
}
module.exports.prepareImageFormBase64 = prepareImageFormBase64;
async function googleTest(body) {
  // const response = await drive.files.get({
  //   fileId: '16r19gRLVJrPg42BS9ceqX3ntncTRC9oJ',
  //   fields: 'id, name, webViewLink, webContentLink, permissions, thumbnailLink',
  // });
  const response = await drive.files.get({
    fileId: '1i1RrA1ic0719HufxeQzc8kqLodSrH3v4',
    fields: 'id, name, webViewLink, webContentLink, permissions, thumbnailLink',
    quotaUser: 'test',

  });
  return response;
}

module.exports.googleTest = googleTest;

/*
// ## example upload file ##
  const mimeType = _.result(body, 'mimeType', 'image/jpeg');
  const base64 = _.result(body, 'base64', '');
  const fileName = `storage/${faker.datatype.uuid()}.${mimeType.split('/')[1]}`;
  fs.writeFile(fileName, base64, { encoding: 'base64' }, () => {});
  await testUploadFile({
    file: prepareImageFormBase64(base64, mimeType, fileName),
    fileName: 'test',
    mimeType,
  });
  fs.unlinkSync(fileName);
 */
