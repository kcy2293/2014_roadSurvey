$(function() {
  var socket = io.connect();
  var inputbox = $("#inputbox");
  var tips = $(".validateTips");

  function updateTips( t ) {
	tips
	  .text( t )
	  .addClass("ui-state-highlight");
	setTimeout(function() {
	  tips.removeClass("ui-state-highlight", 1500);
	});
  }

  function checkRegexp( o, regexp, n ) {
	if ( !( regexp.test( o.val() ) ) ) {
	  o.addClass( "ui-state-error" );
	  updateTips( n );
	  return false;
	} else {
	  return true;
	}
  }

  function createdb() {
	var valid = true;

	valid = valid && checkRegexp(
		inputbox, 
		/^[a-z]([0-9a-z_\s])+$/i, 
		"DB명은 반드시 영문소문자(a-z)로 시작하는 이름이여야 합니다.");

	if (valid) {

	  $.ajax( {
		type: 'PUT',
		url: dbhost + inputbox.val(),
		complete: function(result) {
		  if (result.status === 201) {
			window.location.href="/";
		  } else { 
			console.log(result);
			$("#result-msg p").text((JSON.parse(result.response)).reason)
			  .addClass("ui-state-highlight");
			$("#result-msg").dialog({
			  modal:true,
			  buttons: {
				Ok: function() {
				  $(this).dialog("close");
				}
			  }
			});
		  }
		}
	  });
	  createdialog.dialog( "close" );
	}
	return valid;
  }

  var createdialog = $( "#createdb-form" ).dialog( {
	autoOpen: false,
	height: 350,
	width: 350,
	modal: true,
	open : function() {
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
	  inputbox.val("");
	}
  });

  var rmdialog = $( "#removedb-form" ).dialog( {
	autoOpen: false,
	height:240,
	modal: true,
	buttons: {
	  "Delete" : function() {
		$.ajax( {
		  type: 'DELETE',
		  url: dbhost + $("#dblistSelect").val(),
		  complete: function(result) {
			if (result.status === 200) {
			  window.location.href="/";
			} else {
			  $("#result-msg p").text((JSON.parse(result.response)).reason)
								.addClass("ui-state-highlight");
			  $("#result-msg").dialog({
				modal:true,
				buttons: {
				  Ok: function() {
					$(this).dialog("close");
				  }
				}
			  });
			}
		  }
		});
	  },
	  Cancel : function() {
		$(this).dialog( "close" );
	  }
	}
  });

  var isExecuted = false;
  function importdb() {
	isExecuted = false;
	var progress = $("#progressbar");
	$('#plabel').text("진행중...");
	progress.progressbar({
	  value: false
	});

	$('#myform').submit();
	socket
	  .on('cntNow', function(data) {
		$("#progressbar").progressbar({
		  value: data
		});
	  })
	  .on('end', function() {
		isExecuted = true;
		$('#plabel').text("자료추가완료");
		window.stop();
	  });

	  //io.disconnect();
  }

  var importdialog = $( "#importdb-form" ).dialog( {
	autoOpen: false,
	width: 350,
	height: 250,
	modal: true,
	buttons: {
	  "실행" : importdb,
	  "닫기" : function() {
		if (isExecuted && ($("#dblistform").val() === $("#dblistSelect").val())) {
		  window.location.href="/";
		}
		importdialog.dialog( "close" );
	  }
	}
  });

  var msgdialog = $( "#msgDialog" ).dialog( {
	autoOpen: false,
	modal: true,
	buttons: {
	  "닫기" : function() {
		$(this).dialog("close");
	  }
	}
  });

  $( "#create-db" ).click(function() {
	createdialog.dialog( "open" );
  });

  $( "#remove-db" ).click(function() {
	var selectedDB = $("#dblistSelect").val();
	if (selectedDB != null) {
	  $("#removedb-form p").text('\"'+ selectedDB +'\" DB를 삭제하시겠습니까?');
	  rmdialog.dialog( "open" );
	}
  });

  $( "#import-db" ).click(function() {
	importdialog.dialog( "open" );
  });

  $( "#toolbar > .add" ).on("click", function() {
	createdialog.dialog( "open" );
  });

  $( "#toolbar > .delete" ).on("click", function() {
	var selectedDB = $("#dblistSelect").val();
	if (selectedDB != null) {
	  $("#removedb-form p").text('\"'+ selectedDB +'\" DB를 삭제하시겠습니까?');
	  rmdialog.dialog( "open" );
	}
  });

  $ ("div[id^=tabs-").on("click", function() {
	//console.log($(this).find("img").attr("src"));

	var form = $("#openPost");
	$("#imgPath").val($(this).find("img").attr("src"));
	var updateUrl = dbhost +dbname+"/" + currentDocId;
	$("#updateUrl").val(updateUrl);

	window.open("", "scad");
	form.submit();
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
