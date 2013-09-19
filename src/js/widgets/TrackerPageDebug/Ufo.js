define(["jquery","knockout","CountryCodes","config","jquery.cookie"],function($,ko,countryCodes,config) {

	var Ufo = function(options) {
		var self = this;
		this.i = ko.observable(0);
		this.id = ko.observable(options.id);
		this.name = ko.observable(options.name);
		this.country = ko.observable(options.country);
		this.personId = ko.observable(options.personId);
		this.color = ko.observable(options.color || config.ufo.color);
		this.state = ko.observable(null);
		this.stateChangedAt = ko.observable(null);
		this.position = ko.observable({lat:null,lng:null,dt:null});
		this.track = ko.observable({lat:null,lng:null,dt:null});
		this.trackData = ko.observableArray([]);
		this.alt = ko.observable(null);
		this.dist = ko.observable(null);
		this.gSpd = ko.observable(null);
		this.vSpd = ko.observable(null);
		this.visible = ko.observable(config.ufo.visible);
		this.trackVisible = ko.observable(config.ufo.trackVisible);
		this.noData = ko.observable(true);
		this.noPosition = ko.observable(true);
		var isChecked = ($.cookie("checkedUfos")||"").split(/,/).indexOf(this.id())!==-1;
		this.checked = ko.observable(isChecked);
		this.checked.subscribe(function(v) {
			var ar = ($.cookie("checkedUfos")||"").split(/,/);
			var i = ar.indexOf(this.id());
			if (v && i!==-1 || !v && i==-1) return;
			if (v) ar.push(this.id());
			else ar.splice(i,1);
			$.cookie("checkedUfos",ar.join(","));
		},this);
		this.highlighted = ko.observable(false);
		this.switchCheck = function() {
			self.checked(!self.checked());
			// при перемещении пилотов из одной таблицы в другую не срабатывает событие mouseout (поскольку от checked до этого перестраивается дом)
			self.highlighted(false);
		}
		this.speed = ko.computed(function() {
			if (!(self.gSpd()>=0)) return "";
			return Math.floor(self.gSpd()*36)/10;
		});
		this.country3 = ko.computed(function() {
			return self.country() && countryCodes[self.country()] ? countryCodes[self.country()] : self.country();
		});
		
		this.leading = ko.observable(false);
		this.colored = ko.computed(function() {
			return self.checked() || self.leading();
		});

		this.fullTrackIsAvailable = ko.observable(false);
		this.fullTrackMaxDt = ko.observable(0);
	}

	Ufo.prototype.resetTrack = function() {
		// dt=null - специальное значение. Карта его отслеживает и убивает у себя трек при dt=null
		this.track({lat:null,lng:null,dt:null});
	}

	Ufo.prototype.pushFullTrack = function(data) {
		this.trackData(data);
		this.fullTrackMaxDt(data[data.length-1].dt);
		this.fullTrackIsAvailable(true);
	}

	Ufo.prototype.destroyFullTrack = function() {
		this.fullTrackIsAvailable(false);
	}

	return Ufo;
});