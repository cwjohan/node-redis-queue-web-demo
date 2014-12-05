'use strict';
/*
 * GET home page.
 */
var app = require('../app');

// Class Home.
function Home() {
  // option hash values are set in the routes index.js module
  // and shared by all routing modules.
  this.options = {}; // Default value only.
  var urlsDefaultText = 'http://www.google.com\n' +
                        'www.yahoo.com\n' +
                        'http://www.google.com/robots.txt\n' +
                        'http://code.google.com';
  
  this.routeMe = function(req, res) {
    var urlsText = req.body.urlsText;
    var urls = urlsText ? urlsText.split('\r\n') : [];
    var results = [];
    app.getSha1Results(req.sessionID, urls, function (data, isDone) {
      if (data) results.push(data);
      if (isDone) {
        res.render('home', { title: this.options.title,
                             urls: urlsText || urlsDefaultText,
                             results: results });
      }
    }.bind(this));
    return;
  };
}

var singleton = new Home();
singleton.routeMe = singleton.routeMe.bind(singleton);
module.exports = singleton;
