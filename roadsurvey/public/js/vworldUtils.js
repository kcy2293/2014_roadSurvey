var pagingCount = 10;
var docsTotal = docslist.id.length;
var polyline;
var multiopt;
var uniqDays = [];
var uniqDevice = [];
var currentDoc;
var currentDocId;

$(function($){ 
  // db list fiil	
  dblist.forEach(function(entry, index) {
	$("#dblistSelect").append('<option value='+entry+'>'+ entry +'</option>');
	$("#dblistform").append('<option value='+entry+'>'+ entry +'</option>');
  });

  // dir list fiil	
  dirlist.forEach(function(entry, index) {
	$("#dirlistform").append('<option value='+entry+'>'+ entry +'</option>');
  });

	// 초기 목록
	if(docsTotal !== 0) {
		fillTable(0, pagingCount) ;
		setPaging();
		getUniqSelector();
		$("#"+docslist.id[0]).css("background","lightBlue");
		setLegend();
	}
	$( "#imagesView" ).tabs();

  /*****************************************
   * name :  event list
   ****************************************/
	// DB 명 변경 클릭
	$("#dblistSelect").change(function () {
	  dbname = $(this).val();
		$("#docsTable > tbody > tr").remove();
		defaultView( dbname );
	});

  // 결과 Table 클릭
	$("#docsTable").selectable({
		filter:'tbody tr',
		selected: function(event, ui){
			$("table tr").removeAttr( 'style' );
			var doc = $(".ui-selected" ).attr("id");
			ViewinDetail(doc);
			changeMarker($(".ui-selected").index());
		}
	});

	// 결과개수 클릭
	$("#listSize").change(function() {
		$("#docsTable > tbody > tr").remove();
		pagingCount = this.value;
		fillTable(0, pagingCount);
		setPaging();
	});

	//내보내기
	$("#btnExport").click(function () {
            $("#docsTable").btechco_excelexport({
                containerid: "docsTable"
               , datatype: $datatype.Table
            });
        });

  /****************************
   * event : animate 클릭시
   ****************************/
  var animate;
  $("#btnAnimate").click(function () {
	var count = -1;
	var list = $("#docsTable tbody tr");
	var listLen = list.length;

	animate = setInterval(function() {
	  count++;
	  if ( count === list.length ) {
	    clearInterval(animate);
	  } else {
		list.removeClass("ui-selected");
		list.removeAttr( 'style' );
		$(list[count]).addClass("ui-selected");
		$(list[count]).css("background", "lightBlue");

		ViewinDetail($(".ui-selected" ).attr("id"));
		changeMarker($(".ui-selected").index());
	  }
	}, 400);
  });
  /****************************
   * event : animate stop 클릭시
   ****************************/
  $("#stopAnimate").click(function() {
    if (animate !== null) {
	  clearInterval(animate);
	}
  });


	// device list
	$("#deviceList").click(function() {
	  var deviceName = $(this).val();

		var checkBox = $(this).parent().find('input:checkbox');
		if (deviceName === 'clear') {
			checkBox.attr("checked", false);
		} else {
			checkBox.attr("checked", true);
		}
	});

  // 검색 버튼 클릭
	$( "#search-db" ).click(function() {
	  var checkbox = $("input:checkbox");
		var isChecked = false;
		for (var i = 0, len = checkbox.length ; i < len ; i++) {
		  isChecked |= checkbox[i].checked;
		}

		if (!isChecked) {
		  alert('검색하려는 조건 앞에 체크를 하세요.');
			checkbox[0].focus();
			return false;
		}

		// 일자선택 검색
		var dayToStrArr = "";
		var dayChecked = false;
		if (checkbox[0].checked) {
		  dayChecked = true;
		  var fromDate = $("#from").val().trim();
		  var toDate = $("#to").val().trim();

			if (fromDate ==="" || toDate === "") {
			  alert('일자를 입력하세요.');
				$("#from").focus();
				checkbox[0].checked = false;
			  return false;
			}

			var rangeDate = getDateList(fromDate, toDate);
			var uniqRange = [];
			for (var i = 0, len = uniqDays.length ; i < len ; i++) {
			  var date = uniqDays[i];
				for (var j = 0, jlen = rangeDate.length ; j < jlen ; j++) {
				  if (date === rangeDate[j]) {
					  uniqRange.push(date);
						break;
					} 
				}
			}

			var msgDialog = $("#msgDialog");
			var msgBox = msgDialog.find("p");
			msgBox.html("");

			dayToStrArr = JSON.stringify(uniqRange);
			dayToStrArr = dayToStrArr.substring(1, dayToStrArr.length -1);

			if (dayToStrArr.length == 0) {
				msgBox.html("검색결과가 없습니다.");
				msgDialog.dialog( "open" );
				return false;
			}
		}

		// 기기명 선택 검색
		var searchDevice = "";
		var devChecked = false;
		if (checkbox[1].checked) {
		  devChecked = true;
		  searchDevice = $("#deviceList").val();
			if (searchDevice === 'clear') {
			  alert('검색 기기를 선택하여주세요.');
				$("#deviceList").focus();
				return false;
			}
		}

		// build map function
		/*
    var mapFunc =
      " function(doc) { "
      + "var dateStr = doc._id.substring(0,8);"
      + "var arr = ["+ dayToStrArr + "];"
      + "if (arr.indexOf(dateStr) > -1) { "
			+ "  if (doc.device === '" + searchDevice + "') { "
      + "    emit(doc._id, [ doc.GPS.Latitude, doc.GPS.Longitude, doc.Luminance.MeanY, doc.device]);"
      + "} } }";
		*/

		var mapFunc =
			" function(doc) { " ;

		if (dayChecked) {
		  mapFunc = mapFunc
			+ "var dateStr = doc._id.substring(0,8);" 
			+ "var arr = ["+ dayToStrArr + "];" 
			+ "if (arr.indexOf(dateStr) > -1) { " ;
		} 
		if (devChecked) {
		  mapFunc = mapFunc
			+ "  if (doc.device === '" + searchDevice + "') { " ;
		}
		mapFunc += "emit(doc._id, [ doc.GPS.Latitude, doc.GPS.Longitude, doc.Luminance.MeanY, doc.device]);" 
		if (dayChecked) {
		  mapFunc = mapFunc
			+ " } ";
		} 
		if (devChecked) {
		  mapFunc = mapFunc
			+ " } ";
		}
			mapFunc = mapFunc
			+ " } ";

		console.log(mapFunc);

		$.ajax({
			type: "post",
			contentType: "application/json; charset=utf-8",
			//beforeSend: function(xhr) { xhr.withCredentials = true; },
			url: dbhost + dbname + "/_temp_view",
			dataType: "json",
			data: JSON.stringify({
				"map": mapFunc
			}),
			success: function(data) {
				docsTotal = data.total_rows;
				docslist = {id:[],lat:[],lon:[],lum:[],dev:[]};
				data.rows.forEach(function(doc) {
					docslist.id.push(doc.key);
					docslist.lat.push(doc.value[0]);
					docslist.lon.push(doc.value[1]);
					docslist.lum.push(doc.value[2]);
					docslist.dev.push(doc.value[3]);
				});

				if(docsTotal !== 0) {
					$('#docsTable > tbody > tr').remove();
					fillTable(0, pagingCount) ;
					setPaging();
					$( "#imagesView" ).tabs();
					$("#"+docslist.id[0]).css("background","lightBlue");

				  $("#msgDialog").find("p").html("총 " + docsTotal + "건이 검색되었습니다.")
					$("#msgDialog").dialog("open");

				} else {
					msgBox.html("검색결과가 없습니다.");
					msgDialog.dialog( "open" );
				}
			},
			error: function(req, status, errorThrown) {
				console.log("ERR : " + status + ", " + req);
			}
		});
	});

  // 검색조건 calendar
  $.datepicker.regional["ko"] = {
    closeText: '닫기',
    prevText: '이전달',
    nextText: '다음달',
    currentText: '오늘',
    monthNames: ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],
    monthNamesShort: ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],
    dayNames: ['일','월','화','수','목','금','토'],
    dayNamesShort: ['일','월','화','수','목','금','토'],
    dayNamesMin: ['일','월','화','수','목','금','토'],
    weekHeader: 'Wk',
    dateFormat: 'yymmdd', 
    firstDay: 0,
    isRTL: false,
    showMonthAfterYear: true,
    yearSuffix: '년'
  };
  $.datepicker.setDefaults($.datepicker.regional['ko']);

  /***********************************************
   * download button icons
   ***********************************************/
  $("#imgDownload")
    .button({
	  text:false,
	  icons: {
	    primary: "ui-icon-arrowthickstop-1-s"
	  }
	})
    .click(function() {
	  var currentImg= $("div[aria-expanded|='true']").find("img");
	  var imgName = currentImg.attr("name");
	  var blobURL = currentImg.attr("src");

	  $("#download_link").attr("href", blobURL).attr("download", imgName);
	  var down = $("#export_file");
	  down.trigger('click');
	});

  $("#jsonDownload")
    .button({
	  text:false,
	  icons: {
	    primary: "ui-icon-arrowthickstop-1-s"
	  }
	})
    .click(function() {
	  if (currentDoc !== null) {
		var json = JSON.stringify(currentDoc);
		window.URL = window.URL || window.webkitURL;
		var blob = new Blob([json],{type: "application/json"});
		var blobURL = window.URL.createObjectURL(blob);

		$("#download_link").attr("href", blobURL).attr("download", currentDocId + ".json");
		var down = $("#export_file");
		down.trigger('click');
	  }
	});

  /***********************************************
   * play & stop button icons
   ***********************************************/
  $("#btnAnimate")
  	.button({
	  text:false,
	  icons: {
		primary: "ui-icon-play"
	  }
	})
	.css("width","20px")
	.css("height","20px");

  $("#stopAnimate")
	.button({
	  text:false,
	  icons: {
	    primary: "ui-icon-stop"
	  }
	})
	.css("width", "20px")
	.css("height", "20px");


});

  /****************************************************
   * name : function list
   ***************************************************/
  function setLegend() {
	var legend = L.control( {position: 'bottomright'} );
	legend.onAdd = function (map) {
	  var div = L.DomUtil.create('div', 'info legend');
	  div.innerHTML +=
		"<i style='background: #ff0000'></i> 불량 (Y < 25)<br>" 
	  + "<i style='background: #0000ff'></i> 적정 (25 ≤ Y ≤ 40)<br>"  
	  + "<i style='background: #00ff00'></i> 양호 (40 ≤ Y)<br>";

	  return div;
	};
	legend.addTo(map);
  }

	function getDateList(start, end) {
	  var itr = moment.twix(getDate(start), getDate(end)).iterate("days");
		var range = [];
		while(itr.hasNext()) {
		  var next = itr.next();
			range.push(next.format("YYYYMMDD").toString());
		}

		return range;
	}

	function getDate(input) {
		return new Date(input.substr(0,4)+"/"+input.substr(4,2)+"/"+input.substr(6,2));
	}

	function setPaging() {
		$("#paging").paginate({
				count 			: Math.ceil(docsTotal/pagingCount),
				start 			: 1,
				display 		: 9,
				border			: false,
				text_color  						: '#888',
				background_color    		: '#EEE',	
				text_hover_color  			: 'black',
				background_hover_color	: '#CFCFCF',
				images			: false,
				mouse				: 'press',
				onChange   	: function(page){
												currentPage = page;
												$('#docsTable > tbody > tr').remove();
												fillTable((page-1)*pagingCount, pagingCount); 
											}
		});
	}

	function defaultView(whichDB) {
		$.ajax({
			dataType: "json",
			//beforeSend: function(xhr) { xhr.withCredentials = true; },
			url: dbhost + whichDB +  "/_design/" + viewNm + "/_view/" + viewNm ,
			success: function(data){
				docsTotal = data.total_rows;
				docslist =  {id:[],lat:[],lon:[],lum:[],dev:[]};
				data.rows.forEach(function(doc) {
					docslist.id.push(doc.key);
					docslist.lat.push(doc.value[0]);
					docslist.lon.push(doc.value[1]);
					docslist.lum.push(doc.value[2]);
					docslist.dev.push(doc.value[3]);
				});

				$('#docsTable > tbody > tr').remove();
				fillTable(0, pagingCount) ;
				setPaging();

				// ?? why ??
				//map.setCenterAndZoom(14243425.793355, 4342305.8698004, 7);
				getUniqSelector();
			}
		});
	}

	/* add function */
	function fillTable(start, pagingCount) {
		for(i=start, max=parseInt(start)+parseInt(pagingCount); i<max; i++)
		{
			if (docslist.lon[i] != null && docslist.lat[i] != null) {
			  id = docslist.id[i];
				lon = docslist.lon[i];
				lat = docslist.lat[i];
				lum = docslist.lum[i];

				// parcing id to date and time
				datetime = id.split("_");
				date = datetime[0];
				time = datetime[1];

				// make time string format (hour:minute:second)
				hour = time.substr(0,2);
				minute = time.substr(2,2);
				second = time.substr(4,2);
				time = hour+":"+minute+":"+second;

				// lon, lat, lum round
				lon = Math.round(lon*1000000)/1000000;
				lat = Math.round(lat*1000000)/1000000;
				lum = Math.round(lum*100)/100;
				$('#docsTable > tbody')
					 .append('<tr id="'+docslist.id[i]+'"><td>'+ (i+1) +'</td><td>'+
				date+ '</td><td>'+
				time+ '</td><td>'+
				lat+ '</td><td>'+
				lon+ '</td><td>'+
				lum+'</td></tr>');
			}
		}
		setMap(start, pagingCount);
		ViewinDetail(docslist.id[start]);
	}

	function setMap(start, end) {

		if (polyline != null) {
		  polyline.clearAddon();
			map.removeLayer(polyline);
		}

		var positions = [];
		for(var s = parseInt(start), limit=parseInt(start)+parseInt(end); s < limit; s++) {
			if (docslist.lon[s] !== undefined && docslist.lat[s] !== '0.0' ) {
				var latlon = L.latLng(docslist.lat[s], docslist.lon[s]);
				positions.push(latlon);
			} 
		}

		var polylineOptions = {
		  stroke: false,
			newPolylines: false,
			maxMarkers: 1000
		}

    if(positions.length !== 0) {
			polyline = L.Polyline.PolylineEditor(positions, polylineOptions).addTo(map)
			map.fitBounds(polyline);
		} else {
		  map.setView([38,127],0);
		}
	}

function ViewinDetail(doc) {
  currentDocId = doc;
	$( "#jsonInfo" ).jstree('destroy');
	$( "#RGBImg").attr("src", dbhost+dbname+"/" + doc +"/TEGRA7_RGB_"+ doc +".jpg");
	$( "#YUVImg").attr("src", dbhost+dbname+"/" + doc +"/TEGRA7_YUV_"+ doc +".jpg")
	$( "#TRACKINGImg").attr("src", dbhost+dbname+"/" + doc +"/TEGRA7_TRACKING_"+ doc +".jpg") ;
	var jsonUrl = dbhost +dbname+"/" + doc ;
	
	$.ajax({
			url:jsonUrl,
			//beforeSend: function(xhr) { xhr.withCredentials = true; },
			dataType: 'JSON',
			jsonpCallback: 'callback',
			type: 'GET',
			success:function(data){
				if(typeof data == 'string') {
					data = $.parseJSON(data);
				}
				delete data._rev; delete data._attachments;

				var jstreeData = [];
				currentDoc = data;
				extract(data, null, 0);

				function extract(metaJson, parentVal, index) {
					if (metaJson.length === undefined) {
						var keys = Object.keys(metaJson);
						for (var i = 0, klen = keys.length ; i < klen ; i++) {

							// root & each parent
							if (parentVal === null) {
								if (keys[i] === '_id') {
									addTree(metaJson[keys[0]], '#', metaJson[keys[0]], true);
								} else {
									// this is node
									if (metaJson[keys[i]].length === undefined) {
										addTree( keys[i], metaJson[keys[0]], keys[i], false);
										extract( metaJson[keys[i]], keys[i], i);
									}
									// this is leaf
									else {
									  if (Array.isArray(metaJson[keys[i]])) {
											addTree( keys[i], metaJson[keys[0]], keys[i], false);
											var arr = metaJson[keys[i]];
											for (var arrIdx = 0, arrLen = arr.length ; arrIdx < arrLen ; arrIdx++) {
											  addTree( keys[i] + '' + arrIdx , keys[i], arrIdx + ' : ' + JSON.stringify(arr[arrIdx]), false);
											}
										} else {
											addTree( keys[i], metaJson[keys[0]], keys[i]+ ' : ' +metaJson[keys[i]], false);
										}
									}
								}
							}
							// no root  
							else {
								// this is node
								if (metaJson[keys[i]].length === undefined) {
									addTree(index+'_'+keys[i], parentVal, keys[i], false);
									extract(metaJson[keys[i]], index+'_'+keys[i], index);
								}
								// this is leaf
								else {
									if (Array.isArray(metaJson[keys[i]])) {
										addTree(index+'_'+keys[i], parentVal, keys[i], false);
										var arr = metaJson[keys[i]];
										for (var arrIdx = 0, arrLen = arr.length ; arrIdx < arrLen ; arrIdx++) {
											addTree( index+'_'+keys[i]+''+arrIdx , index+'_'+keys[i], arrIdx + ' : ' + JSON.stringify(arr[arrIdx]), false);
										}
									} else {
										addTree(index+'_'+keys[i]+metaJson[keys[i]], parentVal, keys[i]+ ' : ' +metaJson[keys[i]]);
									}
								}
							}
						}
					} else {
						addTree(index+'_'+metaJson, parentVal, metaJson, false);
					}
				}

				function addTree(id, pid, text, opened) {
					jstreeData.push({
						"id" : id,
						"parent" : pid,
						"text" : text,
						"state" : {
							"opened": opened
						}
					});
				}


				// make a jstree
				$('#jsonInfo').jstree(
					{ 'core' : {
							'data' : jstreeData
						}
					});
			},
			error: function (err) {
				console.log("json meta detail info Error!! -");
				console.log(err);
			}
	});
}

function changeMarker(pos) {
  if (polyline != null) {
    var points = polyline.getPoints();
    var marker = points[pos];

    if (selectedMarkerPoint != null) {
      points[selectedMarkerPoint].setIcon(smallIcon);
    }

    marker.setIcon(bigIcon);
    selectedMarkerPoint = pos;

    var idx = pos + ((currentPage - 1)*pagingCount);
    var lum = Math.round(docslist.lum[idx]*100)/100;
    var popup = L.popup().setContent('<p>No.'+ (idx+1) +'</p><p>밝기 '+lum+'</p>');
    marker.bindPopup(popup).openPopup();
  }

}

// 검색조건
function getUniqSelector() {

	$("#from").datepicker({
		defaultDate: "+1w",
		changeYear: true,
		changeMonth: true,
		numberOfMonths: 1,
		onSelect: function( selectedDate ) {
			$("#to").datepicker("option", "minDate", selectedDate);
			$(this).parent().find('input:checkbox').attr('checked', true);
		}
	});

	$("#to").datepicker({
		defaultDate: "+1w",
		changeYear: true,
		changeMonth: true,
		numberOfMonths: 1,
		buttonImage: "/images/calendar.gif",
		onSelect: function( selectedDate ) {
			$("#from").datepicker("option", "maxDate", selectedDate);
			$(this).parent().find('input:checkbox').attr('checked', true);
		}
	});

	uniqDays = [];
	uniqDevice = [];
	for (var i = 0, len = docsTotal ; i < len ; i++) { 
		var surveyDay = (docslist.id[i].split("_"))[0];
		var device = docslist.dev[i];

		getUniq(uniqDays, surveyDay);
		getUniq(uniqDevice, device);
	}

	function getUniq(arr, target) {
		if (arr.length != 0) {
			var isin = false;
			for(var j = 0, alen = arr.length ; j < alen ; j++) {
				if (arr[j] === target) {
					isin = true;
					return;
				}
			}
			if (!isin) {
				arr.push(target);
			}
		} else {
			arr.push(target);
		}
	}

	var daysLen = uniqDays.length;
	if (daysLen === 0) {
		$("#from").attr("disabled", true);
		$("#to").attr("disabled", true);
	} else if (daysLen === 1) {
		$("#from").val(uniqDays[0]);
		$("#to").val(uniqDays[0]);
		$("#from").attr("disabled", true);
		$("#to").attr("disabled", true);
	} else {
		$("#from").attr("disabled", false);
		$("#to").attr("disabled", false);
		$("#from").val("");
		$("#to").val("");

		uniqDays.sort();

		$("#from").datepicker("option", "maxDate", uniqDays[daysLen-1]);
		$("#from").datepicker("option", "minDate", uniqDays[0]);
		$("#to").datepicker("option", "maxDate", uniqDays[daysLen-1]);
		$("#to").datepicker("option", "minDate", uniqDays[0]);
	}

	uniqDevice.forEach(function(entry, index) {
	  $("#deviceList").append('<option value='+entry+'>'+entry+'</option>');
	});

}
