'use strict';
var arity = process.env.WORK_QUEUE_ARITY || 1;

var app = require('./app');
app.connect(arity, function () {
  console.log('app connected to redis-server');

  process.on('SIGTERM', shutDown); // Doesn't work in win32 os.
  process.on('SIGINT', shutDown);

  app.consumeJobRequests();

  function shutDown() {
    console.log('Shutting server down. No longer listening on port ' + port + '.');
    process.exit();
  }
}); // end connect

