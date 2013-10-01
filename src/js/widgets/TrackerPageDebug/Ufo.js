define(["jquery","knockout","CountryCodes","config"],function($,ko,countryCodes,config) {

	var Ufo = function(options,mainWidget) {
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
		this.alt = ko.observable(null);
		this.dist = ko.observable(null);
		this.gSpd = ko.observable(null);
		this.vSpd = ko.observable(null);
		this.fullTrackEnabled = ko.observable(config.ufo.fullTrackEnabled);
		this.noData = ko.observable(true);
		this.noPosition = ko.observable(true);

		this.trackData = {
			data: [],
			endI: 0,
			startDt: 0,
			lastPrintedPoint: 0
		}
/*
		this.position = {
			lat: null,
			lng: null,
			dt: null
		}
		this.tData = {
			dist: null,
			alt: null,
			gSpd: null,
			vSpd: null
		}
*/

		// Значение по умолчанию - non-checked, поэтому в куках храним checkedUfos
		var isChecked = mainWidget.cookiesEnabled() ? ($.cookie("checkedUfos")||"").split(/,/).indexOf(this.id())!==-1 : config.ufo.checked;
		this.checked = ko.observable(isChecked);

		// Значение по умолчанию - visible, поэтому в куках храним invisibleUfos
		var isInvisible = mainWidget.cookiesEnabled() ? ($.cookie("invisibleUfos")||"").split(/,/).indexOf(this.id())!==-1 : config.ufo.invisible;
		this.visible = ko.observable(!isInvisible);

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
	}

	Ufo.prototype.pushFullTrack = function(data) {
		this.trackData.data = data;
		this.trackData.startDt = 0;
		this.trackData.endI = 0;
		this.trackData.lastPrintedPoint = null;
	}

	Ufo.prototype.destroyFullTrack = function() {
		this.trackData.data = [];
		this.trackData.startDt = 0;
		this.trackData.endI = 0;
		this.trackData.lastPrintedPoint = null;
	}

	// Добавляет точку в трек, если только последняя точка трека не совпадает с добавляемой (проверка по dt), не работает для fullTrackEnabled
	Ufo.prototype.appendTrack = function(dot) {
		if (this.fullTrackEnabled()) return;
		var  l = this.trackData.data.length;
		if (l > 0) {
			var lastDot = this.trackData.data[l-1];
			if (lastDot && lastDot.dt == dot.dt) return;
		}
		this.trackData.data.push(dot);
	}

	// этот метод удаляет трек, если только пилот не в состоянии fullTrack
	Ufo.prototype.destroyTrack = function() {
		if (this.fullTrackEnabled()) return;
		this.trackData.data = [];
		this.trackData.startDt = 0;
		this.trackData.endI = 0;
		this.trackData.lastPrintedPoint = null;
	}

	// этот метод вызывается перед перерисовкой трека на канвасе
	Ufo.prototype.resetTrack = function() {
		this.trackData.startDt = 0;
		this.trackData.endI = 0;
		this.trackData.lastPrintedPoint = null;
	}

	// метод проверяет, что нужно удалить точки из начала трека, т.е. что в треке существуют точки с dt < чем нужное
	Ufo.prototype.trackStartChanged = function(dt) {
		return dt && this.trackData.data.length>0 && this.trackData.data[0].dt<dt;
	}

	// метод отрезает начало трека - удаляет точки, у которых dt < чем нужное
	Ufo.prototype.cutTrackStart = function(dt) {
		if (!dt || this.trackData.data.length==0) return;
		while (this.trackData.data[0].dt<dt)
			this.trackData.data.splice(0,1);
	}

	return Ufo;
});