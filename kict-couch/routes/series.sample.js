
var fs = require('fs');
module.nano = null;
module.db = null;

function series(callbacks, last) {
  function next() {
    var callback = callbacks.shift();
	if (callback) {
	  callback(function() {
		next();
	  });
	} else {
	  last(result);
	}
  }
  next();
}

function async(param, callback) {
  setTimeout(function() { callback(); }, 1000);
}

exports.index = function(req, res){

	var userDB = [];
	var resourceDir
	var msg = [];

	getDBList(function(data) {
	  var userDB = data;
	  console.log(userDB);
	});

	var resourceDir = fs.readdirSync('./resource');
	function render() {
	  res.render('index', { 
		  title: 'KICT - Data insert to CouchDB',
		  dbList: userDB,
		  dirList: resourceDir,
		  result: msg
	  });
	}
};

function getDBList(callback) {
  module.nano.db.list(function(err, body) {
    var userDB = [];
	for (var i = 0, len = body.length ; i < len ; i++ ){
	  if (body[i] == '_replicator')
	    continue;
	  if (body[i] == '_users')
	    continue;
	  userDB.push(body[i]);
	}
	console.log(userDB);
	callback(userDB);
  });
}

exports.init = function(couchdb, res) {
  module.nano = couchdb;
};

exports.dbInsert = function(req, res) {

  connectDB(req.body.dbName);

  var dirName = req.body.dirName;
  
  var metaDir = './resource/'+dirName+'/META/';
  var camDir  = './resource/'+dirName+'/RGB/';
  var LumiDir = './resource/'+dirName+'/YUV/';
  var TrackDir= './resource/'+dirName+'/TRACKING/';
  var msg = [];

  fs.readdir(metaDir, function(err, files) {
    if (err) {
	  console.log(err);
	}

	for (var i = 0 , len = files.length ; i < len ; i++) {
	  fs.readFile(metaDir+files[i], function(err, data) {
	    if (err) {
		  console.log(err);
		}
		var jsObj = JSON.parse(data);
		var key = jsObj.Camera.SysTime;

		var temp = (jsObj.Camera.File).split("/");
		var camImg = temp[temp.length-1];
		var camImgData = getImgData(camDir+camImg);

		temp = (jsObj.Luminance.YUV).split("/");
		var LumiImg = temp[temp.length-1];
		var LumiImgData = getImgData(LumiDir+LumiImg);

		temp = (jsObj.Tracking.File).split("/");
		var TrackImg = temp[temp.length-1];
		var TrackImgData = getImgData(TrackDir+TrackImg);

		var attachImg = [
		 { name: camImg,   data: camImgData,  content_type: 'image/jpg' },
		 { name: LumiImg,  data: LumiImgData, content_type: 'image/jpg' },
		 { name: TrackImg, data: TrackImgData,content_type: 'image/jpg' } 
		];


		module.db.multipart.insert(jsObj, attachImg, key, function(err, body) {
		  if (err) {
		    console.log('err : ' + err);
			throw err;
		  } else {
		    msg.push(body.id);
		  }
		});
	  });
	}
  });
};

function getImgData(path) {
  return fs.readFileSync(path);
};

function connectDB(dbName) {
  module.db = module.nano.use(dbName);
}

