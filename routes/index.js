'use strict';
var home = require('./home');

// options shared to all routing modules
function setOptions(options) {
  exports.options = options;
  home.options = options;
}

// exports:
exports.setOptions = setOptions;
exports.home = home;


