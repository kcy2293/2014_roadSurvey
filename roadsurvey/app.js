var express = require('express')
  , routes = require('./routes')
  , http = require('http')
  , path = require('path');
var fs = require("fs"); 
var ejs = require("ejs");
var socketio = require('socket.io');
var app = express();

// db
var nano = require('nano')('http://localhost:5984');

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(__dirname + '/public'));

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

nano.db.get('history', function(err, body) {
  if (err) {
    nano.db.create('history', function() {
	  console.log('history create..');
	});
  }
});

routes.init(nano, function(err) {
  if (err) {
    throw err;
  }
});

// routes
app.get('/', routes.index);
app.get('/dataInit', routes.dataInit);
app.post('/dbInsert', routes.dbInsert);
app.post('/imageTools', routes.imageTools);
app.get('/leaflet', routes.leaflet);
/*
app.all('*', function(req, res, next) {
  console.log(res.headers);
  res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	res.header('Access-Control-Allow-Headers', 'Content-Type');
	next();
});
*/

var httpServer = http.createServer(app);
var io = socketio(httpServer);
io.on('connection', function(client) {
	client.on('disconnect', function(){ 
	  console.log('client.sessionId = ' + client.sessionId + " : disconnected.");
	});
});

httpServer.listen(app.get('port'), function() {
  console.log('Express server listening on port ' + app.get('port'));
  routes.initSocket(io);
});
