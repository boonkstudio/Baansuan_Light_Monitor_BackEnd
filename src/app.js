const compression = require('compression');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const createError = require('http-errors');
const express = require('express');
const morgan = require('morgan');
const path = require('path');
const bodyParser = require('body-parser');
const http = require('http');
const https = require('https');
const fs = require('fs');
const _ = require('lodash');
const Router = require('./routes');

http.globalAgent.maxSockets = Infinity;
https.globalAgent.maxSockets = Infinity;
const app = express();
app.use(compression());
const shouldCompress = (req, res) => {
  if (req.headers['x-no-compression']) {
    // Will not compress responses, if this header is present
    return false;
  }
  // Resort to standard compression
  return compression.filter(req, res);
};
// Compress all HTTP responses
app.use(compression({
  // filter: Decide if the answer should be compressed or not,
  // depending on the 'shouldCompress' function above
  filter: shouldCompress,
  // threshold: It is the byte threshold for the response
  // body size before considering compression, the default is 1 kB
  threshold: 0,
}));
app.use(express.static(`${__dirname}/public`, { maxAge: 31557600 }));

// ------------------ LOGGER ------------------
app.use(morgan(':remote-addr :method :url :status :response-time :referrer :remote-user :user-agent', { stream: morgan.stream }));

// ------------------ VIEW ------------------

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static("public"));
app.use(express.static("public/documents"));
app.use(express.static("public/documents/resized"));
app.use(express.static("public/images"));

// ----------------- ROUTER & MIDDLEWARE -----------------

app.use(cors());
app.use(Router);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// ----------------- ERROR HANDLER -----------------
app.use((req, res, next) => {
  next(createError(404));
});
app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
