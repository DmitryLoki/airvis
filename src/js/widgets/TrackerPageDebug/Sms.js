define(["knockout"],function(ko) {
	var Sms = function(options) {
		this.id = options.id;
		this.from = options.from;
		this.to = options.to;
		this.sender = options.sender;
		this.timestamp = options.timestamp;
		this.body = options.body;
		this.target = options.from == "me" ? options.to : options.from;
		this.readed = ko.observable(false);
		var d = new Date(this.timestamp * 1000);
		this.time = (d.getHours()<10?"0":"") + d.getHours() + ":" + (d.getMinutes()<10?"0":"") + d.getMinutes();
	}
	return Sms;
});