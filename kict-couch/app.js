
var express = require('express')
  , routes = require('./routes');

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// db
var nano = require('nano')('http://localhost:5984');

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

app.get('/', routes.index);
app.post('/dbInsert', routes.dbInsert);

app.listen(3000, function(){
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});
