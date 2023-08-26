const mongoose = require('mongoose');
require('dotenv').config();

async function main() {
  try {
    let uri;
    if (process.env.MONGODB_AUTH === 'true') {
      uri = process.env.MONGODB_URI ?? `mongodb://${process.env.MONGODB_USER}:${process.env.MONGODB_PASS}@${process.env.MONGODB_HOST}:${process.env.MONGODB_PORT}/${process.env.MONGODB_DB}?authSource=${process.env.MONGODB_DB_AUTH}`;
    } else {
      uri = process.env.MONGODB_URI;
    }

    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    };
    mongoose.connect(`${uri}&retryWrites=true&w=majority`, options).then((value) => {
      console.info('Connected to MongoDB');
    }).catch((e) => {
      console.error('Connection error', e.message);
    });
    mongoose.set('strictQuery', true);
    mongoose.set('strict', true);
    mongoose.set('id', true);
    mongoose.set('autoIndex', true);
    // mongoose.set('debug', process.env.NODE_ENV !== 'production');
  } catch (e) {
    console.error('error => ', e.message);
  }
}
main().catch(console.error);
