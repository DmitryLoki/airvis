//define(["utils","knockout","facebook"],function(utils,ko,FB) {
define(["utils","knockout"],function(utils,ko) {
	var Facebook = function() {
//		console.log("facebook",FB);
	}

	Facebook.prototype.windowDrag = function(self,e) {
		if (this.modalWindow)
			this.modalWindow.emit("dragStart",this.modalWindow,e);
	}

	Facebook.prototype.windowClose = function() {
		if (this.modalWindow)
			this.modalWindow.visible(false);
	}

	Facebook.prototype.domInit = function(elem,params) {
		this.modalWindow = params.modalWindow;
/*
		var div = ko.virtualElements.firstChild(elem);
		while(div && div.nodeType != 1)
			div = ko.virtualElements.nextSibling(div);
		FB.XFBML.parse(div);
*/
	}

	Facebook.prototype.templates = ["main"];

	return Facebook;
});