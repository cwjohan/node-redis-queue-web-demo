var request = require('request');
var SHA1 = require('./helpers/tinySHA1.r4').SHA1;

var qmgr = null;
var jobq = null;
var jobqName = 'demo:jobq';
var arity = null;

var httpPrefix = /^http:\/\/|^https:\/\//;
var statusCodes = {
  403: '403 - Forbidden',
  404: '404 - Page not found',
  405: '405 - Method not allowed',
  406: '406 - Not acceptable',
  500: '500 - Internal server error',
  501: '501 - Not implemented',
  502: '502 - Bad gateway',
  503: '503 - Service unavailable',
  504: '504 - Gateway timeout',
  505: '505 - HTTP version not supported'
};

module.exports.connect = function(_arity, cb) {
  arity = _arity || 1;
  console.log('connecting to redis-server, arity=' + arity);
  var WorkQueueMgr = require('node-redis-queue').WorkQueueMgr;
  qmgr = new WorkQueueMgr('../redis-queue-config.json');
  if (arity === 1) qmgr.connect(onConnect);
  else qmgr.connect2(onConnect);

  function onConnect() {
    jobq = qmgr.createQueue(jobqName);
    jobq.clear(cb);
  }
};

module.exports.getSession = function() {
  var getClient = require('node-redis-queue').getClient;
  var cookieSecret = process.env.COOKIE_SECRET || 'sexier than my cat';
  var session = require('express-session');
  var RedisStore = require('connect-redis')(session);
  var store = new RedisStore({client: getClient()});
  return session({
    store: store,
    secret: cookieSecret,
    resave: false,
    saveUninitialized: false
  });
};

module.exports.getSha1Results = function(sessID, urls, cb) {
  if (! urls || urls.length === 0) {
    cb(null, true);
    return;
  }
  var resultqName = 'demo:rq.' + sessID;
  var resultq = qmgr.createQueue(resultqName);
  resultq.clear();
  var expectedResultCnt = 0;
  for(i in urls) {
    if (! urls[i]) continue;
    if (! httpPrefix.test(urls[i])) urls[i] = 'http://' + urls[i];
    var jobreq = {url: urls[i], rq: resultqName};
    console.log('sending job request ', jobreq);
    jobq.send(jobreq);
    ++expectedResultCnt;
  }
  var resultCnt = 0;
  resultq.consume(function(result, ack) {
    console.log('received result ', result);
    if (--expectedResultCnt) {
      cb(result, false);
      ack();
      return;
    }
    cb(result, true)
    ack(true);
    resultq.destroy();
  }, arity);
};

module.exports.consumeJobRequests = function() {
  jobq.consume(function(jobreq, ack) {
    console.log('processing job request ', jobreq);
    request(jobreq.url, function(error, response, body) {
      var sha1;
      if (!error && response.statusCode === 200) {
        sha1 = SHA1(body);
        console.log('sending ' + jobreq.url + ' SHA1 = ' + sha1);
        qmgr.channel.push(jobreq.rq, {url: jobreq.url, sha1: sha1});
        ack();
      } else {
        var errMsg = formatError(error, response)
        console.log('error: ' + errMsg);
        qmgr.channel.push(jobreq.rq, {url: jobreq.url, err: errMsg});
        ack();
      }
    });
  }, arity);

  function formatError(err, resp) {
    var code = resp ? resp.statusCode : undefined;
    var msg = err ? err.message : 'status=' + (statusCodes[code] || code);
    if (msg === 'getaddrinfo ENOTFOUND') msg = 'Website not found';
    else if (msg === 'getaddrinfo EAGAIN') msg = 'Data not available - try again';
    return msg;
  }
}

