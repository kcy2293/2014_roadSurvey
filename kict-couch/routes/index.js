
/**************************************
 * global variables
 **************************************/
var fs = require('fs');
var dir = require('node-dir');
var async = require('async');
var resourceDir = './resource/';
module.nano = null;
module.db = null;

/**************************************
 * binding couchdb driver
 **************************************/
exports.init = function(couchdb, res) {
  module.nano = couchdb;
};

/**************************************
 * init page render
 * desc : get db list
          and then render page
**************************************/
exports.index = function(req, res) {
  getDBList(function(data) {
    var resourceDir = fs.readdirSync('./resource');
	res.render('index', {
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
  module.db = module.nano.use(req.body.dbName);
  var dirName = resourceDir + req.body.dirName;

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
	   console.log('fileCnt : ' + fileCnt);

	   for ( var i = 0 , len = fileInfoList.length ; i < len ; i++ ) {
	     repeatRun( function (data) {
		   resultMsg.push(data);
		   //console.log('cnt : ' + resultMsg.length + ', data : ' + data);
		   if (resultMsg.length == fileCnt ) {
		     console.log(resultMsg.length);
			 callback(null, resultMsg);
		   }
		 });

		 function repeatRun (result) {
		   var fileList = fileInfoList[i].fileList;
		   for ( var j = 0 , fileLen = fileList.length ; j < fileLen ; j++) {
		     var filePath = fileInfoList[i].metaDir+fileList[j];
			 var jsObj 	= JSON.parse(fs.readFileSync(filePath));
			 var key	= jsObj.Camera.SysTime;
			 var temp	= (jsObj.Camera.File).split("/");
			 var camImg = temp[temp.length-1];
			 var camImgData = fs.readFileSync(fileInfoList[i].camDir+camImg);

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
	  console.log(err);
	} else {
	  // history and render
	  getDBList( function(data) {
	    var dirList = fs.readdirSync(resourceDir);

		setHistory(function() {
		  res.render('index', {
		    title: 'KICT - Data insert to CouchDB',
			dbList: data,
			dirList: dirList,
			result: resultMsg
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
