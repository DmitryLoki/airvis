define(["utils","knockout"],function(utils,ko) {
	var MainMenu = function(options) {
		this.titles = ko.observable({});
		this.titleUrl = options.titleUrl;
	}

	MainMenu.prototype.setTitles = function(titles) {
		this.titles(titles);
		this.titles.valueHasMutated();
	}

	MainMenu.prototype.domInit = function(elem,params) {
		this.modalWindow = params.modalWindow;
	}

	MainMenu.prototype.proxyDrag = function(self,e) {
		if (this.modalWindow)
			this.modalWindow.dragStart(this.modalWindow,e);
	}

	MainMenu.prototype.templates = ["main"];

	return MainMenu;
});