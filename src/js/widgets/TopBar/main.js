define(["jquery","utils","knockout","jquery.color"],function($,utils,ko) {
	var TopBar = function() {
		var self = this;
		this.items = ko.observableArray([]);
	};

	TopBar.prototype.switch = function() {
		this.visible(!this.visible());
	}

	TopBar.prototype.templates = ["main"];

	return TopBar;
});