var Promise = require('es6-promise').Promise;
var gui = require('nw.gui');
var win = gui.Window.get();
win.maximize();

window.addEventListener('keydown', function(e) {

  function F12(e) { return e.keyIdentifier === "F12" }
  function F5(e) { return e.keyIdentifier === "F5" }
  if( F12(e) ) {
	win.showDevTools();
  }
  if (F5(e) ) {
	location.reload();
  }
});

if (win.menu ==null) {
  var menubar = new gui.Menu({type: 'menubar'});
  var sub1 = new gui.Menu();
  sub1.append(new gui.MenuItem({
	label: 'Refresh',
	click: function() {
			location.reload();
		   }
  }));

  sub1.append(new gui.MenuItem({
	label: 'Exit',
	click: function() {
	  win.close(true);
	}
  }));

  menubar.append(new gui.MenuItem({label: 'File', submenu: sub1}));

  win.menu = menubar;
}
