define(["knockout"],function(ko) {
	var Waypoint = function(options) {
		this.id = ko.observable(options.id);
		this.name = ko.observable(options.name);
		this.type = ko.observable(options.type);
		this.center = ko.observable({lat:options.center.lat,lng:options.center.lng});
		this.radius = ko.observable(options.radius);
		this.openKey = ko.observable(options.openKey);
		this.checkedOn = ko.observable(options.checkedOn);
	}
	return Waypoint;
});