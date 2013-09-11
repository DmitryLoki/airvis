define(["utils","knockout"],function(utils,ko) {
	var Facebook = function() {
		this.isDragged = ko.observable(false);
	}

	Facebook.prototype.windowDrag = function(self,e) {
		if (this.modalWindow) {
			this.isDragged(true);
			this.modalWindow.emit("dragStart",this.modalWindow,e);
		}
	}

	Facebook.prototype.windowClose = function() {
		if (this.modalWindow)
			this.modalWindow.visible(false);
	}

	Facebook.prototype.domInit = function(elem,params) {
		var self = this;
		this.modalWindow = params.modalWindow;
		this.modalWindow.on("dragStop",function() {
			self.isDragged(false);
		});
	}

	Facebook.prototype.templates = ["main"];

	return Facebook;
});