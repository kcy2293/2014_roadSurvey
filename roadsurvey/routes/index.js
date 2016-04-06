/**************************************
 * global variables
 **************************************/
var localip = '192.168.0.132';
var fs = require('fs');
var dir = require('node-dir');
var async = require('async');
var path = require('path');
var resourcePath = path.join(process.cwd() , 'resource' , path.sep);
//var resourcePath = path.join('/home/ubuntu/roadsurvey', 'resource' , path.sep);

// db
var nano = require('nano')('http://localhost:5984');
module.nano = null;
module.db = null;
module.socket = null;

/**************************************
 * binding couchdb driver
 **************************************/
exports.init = function(couchdb, res) {
  module.nano = couchdb;
};

/**************************************
 * binding socket io
 **************************************/
exports.initSocket = function(io) {
  module.socket = io;
};


/**************************************
 * index page render
 * desc : docs list return
**************************************/
exports.index = function(req, res){
  nano.db.list(function(err, dbbody) {
    var dbs = [];
    var count = 0
    // body is an array
    dbbody.forEach(function(db) {

      if(db.substr(0,1) != "_" & db != "history") {
		dbs.push(db);
	  }
      count ++;

      //마지막에 실행할 것
      if(dbbody.length == count)
      {
        var database = nano.db.use(dbs[0]); 
        var docs = {id:[],lat:[],lon:[],lum:[],dev:[]};
		try {
		  var resourceDir = fs.readdirSync(resourcePath);
		} catch (err) {
		  console.error(err);
		}

		database.view('GPSLatLon', 'GPSLatLon', function(err, body) {
		  if (!err) {
			body.rows.forEach(function(doc) {
			  //console.log(doc.value);
			  docs.id.push(doc.key);
			  docs.lat.push(doc.value[0]);
			  docs.lon.push(doc.value[1]);
			  docs.lum.push(doc.value[2]);
			  docs.dev.push(doc.value[3]);
			});
		  }
		  else {
			console.log(" GPSLatLon View Create ...");
			database.insert(
			  { "views": 
				{ "GPSLatLon": 
				  { "map": function(doc) {
						  //emit(doc._id,[ doc.GPS.Latitude, doc.GPS.Longitude]); } } 
						  //emit(doc._id,[ doc.GPS.Latitude, doc.GPS.Longitude, doc.Luminance.MeanY]); } } 
								emit(doc._id,[ doc.GPS.Latitude, doc.GPS.Longitude, doc.Luminance.MeanY, doc.device]); 
					} 
				  } 
				}
			  }, '_design/GPSLatLon', function (error, response) {
				console.log("Error- Temperary View not exist");
			});
		  }
		  res.render('vworld', 
			{ docslist:JSON.stringify(docs), 
			  db: database.config.db, 
			  dirList: JSON.stringify(resourceDir),
			  dblist:JSON.stringify(dbs)}
		  );
		}); 
	  }//if(dbbody.length-1 == count)
    });//dbbody.forEach(function(db) {
  }); //nano.db.list(function(err, dbbody) {
};

/**************************************
 * image tools page
 * desc : openscad image tools open
**************************************/
exports.imageTools = function(req, res) {
  res.render('imageEditor',{
	imgPath: req.body.imgPath
	, updateUrl: req.body.updateUrl
  });
}

/**************************************
 * dataInit page render
 * desc : get db list
          and then render page
**************************************/
exports.dataInit = function(req, res) {
  getDBList(function(data) {
    var resourceDir = fs.readdirSync(resourcePath);
		res.render('dataInit', {
			title: 'KICT - Data insert to CouchDB',
			dbList: data,
			dirList: resourceDir,
			result: []
		});
  });
};

/**************************************
 * function : getDBList
 * desc : get db list
**************************************/
function getDBList(callback) {
  module.nano.db.list(function(err, body) {
    var userDB = [];
	for (var i = 0, len = body.length ; i < len ; i++ ){
	   if (body[i] == '_replicator')
	 	 continue;
	   if (body[i] == '_users')
		 continue;
	   if (body[i] == 'history')
		 continue;
	   userDB.push(body[i]);
	 }
    callback(userDB);
 });
};

/***************************************************
 * post action : dbInsert & render
 * desc : using async.waterfall, sequencial processing
***************************************************/
exports.dbInsert = function(req, res) {
  require('date-format-lite');
  module.db = module.nano.use(req.body.dblistform);
  var dirName = resourcePath + req.body.dirlistform;

  async.waterfall([
    /**********************************
	 * No.1 waterfall function
	 *   desc : extract sub-directory
     **********************************/
    function (callback) {
	  var dirList = [];
	  dir.subdirs(dirName, function(err, subDirs) {
			if (err) {
				console.error(err);
				callback(JSON.stringify(err));
			} else {
				for (var i = 0, len = subDirs.length ; i < len ; i++) {
				var pos = subDirs[i].indexOf('META');
				if (pos > 0) {
					dirList.push(subDirs[i].substring(0, pos));
				}
				}
				if (dirList.length == 0) {
					console.error('ERR : META 디렉토리가 없습니다');  
					callback('ERR : META 디렉토리가 없습니다',null);
				} else {
				callback(null, dirList);
				}
			}
	  });
	},

    /**********************************
	 * No.2 waterfall function
	 *   desc : extract file list & information(Image folder)
     **********************************/
	function (dirList, callback) {

	  var fileInfoList = [];
	  var fileCnt = 0;

		try {
			for ( var i = 0 , len = dirList.length ; i < len ; i++ ) {
				var metaDir = dirList[i] + 'META/';
				var fileArr = fs.readdirSync(metaDir);
				fileCnt += fileArr.length;

				var fileInfo = [{
					metaDir	: metaDir,
					camDir 	: dirList[i] + 'RGB/',
					LumiDir 	: dirList[i] + 'YUV/',
					TrackDir	: dirList[i] + 'TRACKING/',
					fileList	: fileArr
				}];

				fileInfoList = fileInfoList.concat(fileInfo);
			}
		} catch (err) {
			console.error('ERR : waterfall function No.2');
			callback('ERR : waterfall function No.2', null);
		}

	  if (fileInfoList.length ==0) {
	    console.error('ERR : META file이 존재하지 않습니다');
	    callback('ERR : META file이 존재하지 않습니다',null);
	  } else {
	    callback(null, fileInfoList, fileCnt);
	  }
	},
    /**********************************
	 * No.3 waterfall function
	 *   desc : insert data to db
     **********************************/
	 function(fileInfoList, fileCnt, callback) {

	   var resultMsg = [];

	   for ( var i = 0 , len = fileInfoList.length ; i < len ; i++ ) {
	     repeatRun( function (data) {
				 resultMsg.push(data);
				 //console.log('cnt : ' + resultMsg.length + ', data : ' + data);

				 module.socket.emit('cntNow', (resultMsg.length / fileCnt)*100);

				 if (resultMsg.length == fileCnt ) {
					 console.log("DBInsert : " + resultMsg.length);
					 callback(null, resultMsg);
				 }
			 });

			 function repeatRun (result) {
				 var fileList = fileInfoList[i].fileList;
				 try {
					 for ( var j = 0 , fileLen = fileList.length ; j < fileLen ; j++) {
						 var filePath = fileInfoList[i].metaDir+fileList[j];
						 var jsObj 	= JSON.parse(fs.readFileSync(filePath));
						 var key	= jsObj.Camera.SysTime;
						 var temp	= (jsObj.Camera.File).split("/");
						 var camImg = temp[temp.length-1];
						 var camImgData = fs.readFileSync(fileInfoList[i].camDir+camImg);

						 var device = camImg.split("_")[0];
						 jsObj.device = device;

						 temp = (jsObj.Luminance.YUV).split("/");
						 var LumiImg = temp[temp.length-1];
						 var LumiImgData = fs.readFileSync(fileInfoList[i].LumiDir+LumiImg);
						 temp = (jsObj.Tracking.File).split("/");
						 var TrackImg = temp[temp.length-1];
						 var TrackImgData = fs.readFileSync(fileInfoList[i].TrackDir+TrackImg);

						 var attachImg = [
							 { name: camImg,   data: camImgData,  content_type: 'image/jpg' },
							 { name: LumiImg,  data: LumiImgData, content_type: 'image/jpg' },
							 { name: TrackImg, data: TrackImgData,content_type: 'image/jpg' }
						 ];

						 module.db.multipart.insert(jsObj, attachImg, key, function(err, body) {
							 if (err) {
								 result(err.name+','+key+','+err.reason+','+filePath);
							 } else {
								 result(body.ok+','+body.id);
							 }
						 });
					 }
				 } catch(err) {
					 result(err.name+','+key+','+err.reason+','+filePath);
					 console.error("ERR : waterfall function No.2");
				 }
			 }
	   }
	 } // end of waterfall function No.3
  ], // end of tasks

  /***********************************************
   * final or error processing waterfall function
   *   desc : render result msg & insert history table
   ***********************************************/
  function (err, resultMsg) {
    if (err) {
	    console.log("render result msg & insert history table -"+err);
		  res.redirect('/');
	  } else {
	 		// history and render
	  	getDBList( function(data) {
				setHistory(function() {
					module.db.view('GPSLatLon', 'GPSLatLon', function(err, body) {
						if (err) {
							console.log(" GPSLatLon View Create ...");
							module.db.insert(
								{ "views":
									{ "GPSLatLon":
										{ "map": function(doc) {
												emit(doc._id,[ doc.GPS.Latitude, doc.GPS.Longitude, doc.Luminance.MeanY, doc.device]); }
										}}
								}, '_design/GPSLatLon', function (error, response) {
									console.log("Error- Temperary View not exist");
								});
						}

						module.socket.emit('end');

					});
				});
	  	});

	  	function setHistory( doAfter ) {
	   	 var date = new Date();
				var historyKey = date.format("YYYYMMDD_hhmmssms");
				var historyVal = {"dbName":req.body.dbName,"resouce":dirName};
		   	 var history = module.nano.use('history');
	
				history.insert(historyVal, historyKey, function(err, body, header) {
			 	 if (err) {
			 	   console.error(key + ' history insert error');
					return;
			 	 } else {
			 	   doAfter();
			 	 }
				});
		  } 
		}
  });
};

/**************************************
 * leaflet sample page
 * desc : leaflet
**************************************/
exports.leaflet = function(req, res){
  nano.db.list(function(err, dbbody) {
    var dbs = [];
    var count = 0
    // body is an array
    dbbody.forEach(function(db) {

      if(db.substr(0,1) != "_" & db != "history")
					dbs.push(db);
      count ++;

      //마지막에 실행할 것
      if(dbbody.length == count)
      {
        var database = nano.db.use(dbs[0]); 
        var docs = {id:[],lat:[],lon:[],lum:[],dev:[]};
				var resourceDir = fs.readdirSync(resourcePath);

        database.view('GPSLatLon', 'GPSLatLon', function(err, body) {
					if (!err) {
		        body.rows.forEach(function(doc) {
	 		     	//console.log(doc.value);
	  		    	docs.id.push(doc.key);
							docs.lat.push(doc.value[0]);
							docs.lon.push(doc.value[1]);
							docs.lum.push(doc.value[2]);
							docs.dev.push(doc.value[3]);
      		  });
    		  }
	 		 		else {
	 		   		console.log(" GPSLatLon View Create ...");
						database.insert(
										{ "views": 
											{ "GPSLatLon": 
											{ "map": function(doc) {
												//emit(doc._id,[ doc.GPS.Latitude, doc.GPS.Longitude]); } } 
												emit(doc._id,[ doc.GPS.Latitude, doc.GPS.Longitude, doc.Luminance.MeanY, doc.device]); } } 
											}
										}, '_design/GPSLatLon', function (error, response) {
												console.log("Error- Temperary View not exist");
						      	});
					}

					res.render('leaflet', 
						{ docslist:JSON.stringify(docs), 
							db: database.config.db, 
							dirList: JSON.stringify(resourceDir),
							dblist:JSON.stringify(dbs)}
					);
  		  }); 
    	}//if(dbbody.length-1 == count)
    });//dbbody.forEach(function(db) {
  }); //nano.db.list(function(err, dbbody) {
};

