$(function() {
  var inputbox = $("#inputbox");
  var tips = $(".validateTips");

  /*****************************
   * view : DB생성 다이얼로그
   *****************************/
  var createdialog = $( "#createdb-form" ).dialog( {
	autoOpen: false,
	height: 350,
	width: 350,
	modal: true,
	open :function() {
			$(document).keypress(function(e) {
			  if (e.keyCode == 13) {
				var isValid = createdb();
				if (!isValid) {
				  e.preventDefault();
				}
			  }
			});
		  },
		  buttons: {
			"Create database" : createdb,
			Cancel: function() {
			  createdialog.dialog( "close" );
			}
		  },
		  close: function(){
			updateTips("새롭게 생성할 DB 이름을 입력하세요");
			inputbox.removeClass("ui-state-error");
			inputbox.val("");
		  }
	});

  /*****************************
   * view : DB삭제 다이얼로그
   *****************************/
  var rmdialog = $( "#removedb-form" ).dialog( {
	autoOpen: false,
	height:240,
	modal: true,
	buttons: {
	  "Delete": deletedb,
	  Cancel: function() {
				$(this).dialog( "close" );
			  }
	}
  });

  /*******************************
   * view : DB 업로드 다이얼로그
   *******************************/
  var isExecuted = false;
  var importdialog = $( "#importdb-form" ).dialog( {
	autoOpen: false,
	width: 350,
	height: 400,
	modal: true,
	buttons: {
	  "실행": importdb,
	  "닫기": function() {
				if (isExecuted && ($("#dblistform").val() === $("#dblistSelect").val())) {
				  //win.reload();
				  location.reload();
				}
				importdialog.dialog( "close" );
			  }
	}
  });

  /*******************************
   * view : 결과메시지 다이얼로그
   *******************************/
  var msgdialog = $( "#msgDialog" ).dialog( {
	autoOpen: false,
	modal: true,
	buttons: {
	  "닫기": function() {
				$(this).dialog("close");
			  }
	}
  });

  /*****************************
   * function : DB생성 function
   *****************************/
  function createdb() {

	var valid = true;
	valid = valid && checkRegexp(
		inputbox, 
		/^[a-z]([0-9a-z_\s])+$/i, 
		"DB명은 반드시 영문소문자(a-z)로 시작하는 이름이여야 합니다.");
	valid = valid && checkDupDB(inputbox, inputbox.val(), 'DB명이 존재합니다. 다른이름으로 생성하세요.');

	if (valid) {
	  new PouchDB(inputbox.val(), function(err, pouchdb) {
		if (err) {
		  alert("Can't open pouchdb database : " + err);
		  console.log("Can't open pouchdb database : " + err);
		} else {
		  if (pouchdb !== undefined) {
			//win.reload();
			location.reload();
		  }
		}
	  });

	  createdialog.dialog( "close" );
	}

	return valid;
  }

  /*****************************
   * function : DB업로드 function
   *****************************/
  function importdb() {
	isExecuted = false;
	var progress = $("#progressbar");
	$('#plabel').text("진행중...");
	progress.progressbar({
	  value: false
	});

	$(".ui-dialog-titlebar-close").hide();
	$(".ui-dialog-buttonset").hide();
	var importMsg = $("#importMsg");
	importMsg.text("");

	var async = require('async');
	var dir = require('node-dir');
	require('date-format-lite');

	var dirName = path.join(resourcePath , $('#dirlistform').val());
	async.waterfall([
	  /**********************************
	   * Waterfall Step.1
	   *   desc : extract sub-directory
	   **********************************/
	  function(callback) {
		var dirList = [];
		$('#plabel').text("선택한 폴더의 하위폴더를 분석중입니다.....");
		dir.subdirs(dirName, function(err, subDirs) {
		  if (err) {
			console.error('Extract subdirs error : ' + err);
			alert('ERR : 하위폴더 추출에 실패하였습니다. 다시 시도하세요.');
		  } else {
			for (var i = 0, len = subDirs.length ; i < len ; i++) {
			  var pos = subDirs[i].indexOf('META');
			  if (pos > 0) {
				dirList.push(subDirs[i].substring(0, pos));
			  }
			}

			if (dirList.length === 0) {
			  console.error('ERR : META 폴더가 존재하지 않습니다');
			  alert('ERR : META 폴더가 존재하지 않습니다');
			} else {
			  callback(null, dirList);
			}
		  }
		});
	  },
	  /**********************************************************
	   * Waterfall Step.2
	   *   desc : extract file list & information(Image folder)
	   **********************************************************/
	  function (dirList, callback) {
		var fileInfoList = []; 
		var fileCnt = 0;

		try {
		  $('#plabel').text("메타파일 정보를 추출중입니다...");
		  for (var i = 0 , len = dirList.length ; i < len ; i++) {
			var metaDir = path.join(dirList[i], 'META');
			var fileArr = fs.readdirSync(metaDir);
			fileCnt += fileArr.length;

			var fileInfo = [{
			  metaDir:	metaDir
			  , camDir:		path.join(dirList[i], 'RGB')
			  , LumiDir:	path.join(dirList[i], 'YUV')
			  , TrackDir:	path.join(dirList[i], 'TRACKING')
			  , fileList:	fileArr
			}];

			fileInfoList = fileInfoList.concat(fileInfo);
		  }

		} catch (err) {
		  console.error('ERR : waterfall function No.2 : ' + err);
		  callback('ERR : waterfall function No.2', null);
		}

		if (fileInfoList.length === 0) {
		  console.error('ERR : META file이 존재하지 않습니다.');
		  alert('ERR : META file이 존재하지 않습니다.');
		} else {
		  callback(null, fileInfoList, fileCnt);
		}
	  },
	  /**********************************
	   * Waterfall Step.3
	   *   desc : insert data to db
	   **********************************/
	  function (fileInfoList, fileCnt, callback) {

		var resultMsg = [];
		var errCnt = 0;
		var successCnt = 0;

		for(var i = 0, len = fileInfoList.length ; i < len ; i++) {
		  repeatRun( function(data) {
			resultMsg.push(data);
			if (data === 0) {
			  errCnt++;
			} else {
			  successCnt++;
			}

			var percent = (resultMsg.length / fileCnt) * 100;
			$("#progressbar").progressbar({
			  value: percent
			});

			if (resultMsg.length === fileCnt) {
			  isExecuted = true;
			  var msg = "자료추가완료(성공: " + successCnt + ", 실패: " + errCnt+")";
			  $('#plabel').text(msg);
			  $(".ui-dialog-titlebar-close").show();
			  $(".ui-dialog-buttonset").show();
			  //win.reload();
			  if (importMsg.text() === "") {
			    importMsg.append("에러 없음\n");
			  }
			} else {
			  $('#plabel').text("자료를 저장중 입니다... "+ Math.ceil(percent) + "%");
			}
		  });

		  function repeatRun (result) {
			var fileList = fileInfoList[i].fileList;
			for (var j = 0, fileLen = fileList.length ; j < fileLen ; j++) {
			try {
				var filePath = path.join(fileInfoList[i].metaDir , fileList[j]);
				var doc = JSON.parse(fs.readFileSync(filePath));
				/*
				if (doc.GPS.Latitude === '0.0' || doc.GPS.Longitude === '0.0') {
				  console.error('ERR : SKIP Latitude equals 0.0');
				  result(0);
				  continue;
				}
				*/
				var key = doc.Camera.SysTime;
				var temp = (doc.Camera.File).split('/');
				var camImg = temp[temp.length-1];
				var camImgData = fs.readFileSync(path.join(fileInfoList[i].camDir, camImg), {encoding:'base64'});

				temp = (doc.Luminance.YUV).split('/');
				var LumiImg = temp[temp.length-1];
				var LumiImgData = fs.readFileSync(path.join(fileInfoList[i].LumiDir,LumiImg), {encoding:'base64'});
				temp = (doc.Tracking.File).split('/');
				var TrackImg = temp[temp.length-1];
				var TrackImgData = fs.readFileSync(path.join(fileInfoList[i].TrackDir,TrackImg), {encoding:'base64'});

				var attachImg = [
				  { name: camImg,   data: camImgData,  content_type: 'text/plain' },
				  { name: LumiImg,  data: LumiImgData, content_type: 'text/plain' },
				  { name: TrackImg, data: TrackImgData,content_type: 'text/plain' }
				];

				var device = camImg.split("_")[0];
				doc.device = device;

				doc = $.extend({_attachments: {}}, doc);

				attachImg.forEach(function(att) {
				  doc._attachments[att.name] = {
					content_Type: att.content_type,
					data: att.data
				  };
				});
				db.put(doc, key, function(err, res) {
				  if (err) {
					importMsg.append("Insert Error : " + err + "\n");
					result(0);
				  } else {
					result(1);
				  }
				});
			} catch(err) {
			  result(0);
			  importMsg.append("Insert Error : " + err + "\n");
			}
			}
		  }
		}
	  }
	]);  // end of async.waterfall
  }  // end of importdb function

  /*****************************
   * function : DB삭제 function
   *****************************/
  function deletedb() {
	var deldb = $("#dblistSelect").val();

	$(".ui-dialog-titlebar-close").hide();
	$(".ui-dialog-buttonset").hide();

	PouchDB.destroy(deldb, function(err, info) {
	  if (err) {
		console.error("ERR : DB destroy error - " + err);
		$("#result-msg p").text(err).addClass("ui-state-highlight");
		$("#result-msg").dialog({
		  modal:true,
		  buttons: {
			Ok: function() {
				  $(this).dialog("close");
				}
		  }
		});

	  } else {
		if (info.ok === true) {
		  console.log("DB destroyed : " + deldb);
		  //win.reload();
		  $(".ui-dialog-titlebar-close").show();
		  $(".ui-dialog-buttonset").show();
		  location.reload();
		}
	  }
	});
  }

  /**********************************
   * function : DB생성명 체크 메시지
   **********************************/
  function updateTips( t ) {
	tips.text( t ).addClass("ui-state-highlight");
	setTimeout(function() {
	  tips.removeClass("ui-state-highlight", 1500);
	});
  }

  /***************************************
   * function : DB중복여부 체크 function
   ***************************************/
  function checkDupDB( o, target, msg ) {
	var isDup = false;
	$("#dblistSelect option").each(function() {
	  if($(this).val() === target) {
		o.addClass( "ui-state-error" );
		updateTips( msg );
		isDup = true;
	  }
	});

	if(isDup) {
	  return false;
	} else {
	  return true;
	}
  }

  /********************************
   * function : DB 생성명 오류체크
   ********************************/
  function checkRegexp( o, regexp, n ) {
	if ( !( regexp.test( o.val() ) ) ) {
	  o.addClass( "ui-state-error" );
	  updateTips( n );
	  return false;
	} else {
	  return true;
	}
  }

  /*****************************
   * event : DB생성 클릭
   *****************************/
  $( "#create-db" ).click(function() {
	createdialog.dialog( "open" );
  });

  $( "#toolbar > .add" ).on("click", function() {
	createdialog.dialog( "open" );
  });

  /*****************************
   * event : DB삭제 클릭
   *****************************/
  $( "#remove-db" ).click(function() {
	var selectedDB = $("#dblistSelect").val();
	if (selectedDB != null) {
	  $("#removedb-form p").text('\"'+ selectedDB +'\" DB를 삭제하시겠습니까?');
	  rmdialog.dialog( "open" );
	}
  });

  $( "#toolbar > .delete" ).on("click", function() {
	var selectedDB = $("#dblistSelect").val();
	if (selectedDB != null) {
	  $("#removedb-form p").text('\"'+ selectedDB +'\" DB를 삭제하시겠습니까?');
	  rmdialog.dialog( "open" );
	}
  });

  /*****************************
   * event : DB업로드 클릭
   *****************************/
  $( "#import-db" ).click(function() {
	importdialog.dialog( "open" );
  });

  /*****************************
   * event : DB관리 메뉴 클릭시
   *****************************/
  $( "#mngMenu" )
	.button({
	  text: false,
	  icons: {
		primary: "ui-icon-gear"
	  }
	})
	.css("margin-top", "-1px")
	.click(function() {
	  var menu= $( this ).parent().next().toggle().position({
					my: "right top",
					at: "right bottom",
					of: this
				});
	  $( document ).one( "click", function() {
		menu.hide();
	  });

	  var menuList = $(".ui-menu li");

	  menuList.mouseover(function() {
	    $(this).addClass("ui-state-hover");
	  });
	  menuList.mouseout(function() {
	    $(this).removeClass("ui-state-hover");
	  });

	  var selectedDB = $("#dblistSelect").val();
	  // create
	  menuList.eq(0).click(function(e) {
		createdialog.dialog( "open" );
	  });
	  // delete
	  menuList.eq(1).click(function(e) {
	    if (selectedDB !== null) {
		  $("#removedb-form p").text('\"'+ selectedDB +'\" DB를 삭제하시겠습니까?');
		  rmdialog.dialog( "open" );
		}
	  });

	  // import
	  menuList.eq(2).click(function(e) {
	    if (selectedDB !== null)  {
		  importdialog.dialog( "open" );
		} 
	  });

	  return false;
	})
	.parent()
	  .buttonset()
	  .next()
		.hide()
		.menu();

});
