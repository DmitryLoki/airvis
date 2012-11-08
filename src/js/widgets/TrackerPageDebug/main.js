define([
    'utils',
    'walk',
    'knockout',
    'knockout.mapping',
    'widget!GoogleMap',
    'widget!UfosTable',
    'knockout.restrictChangeSpeed'
], function(
	utils,
	walk,
	ko,
	komap,
	GoogleMap,
	UfosTable
){

	var Pilot = function(options) {
		var p = this;
		this.name = options.name;
		this.map = options.map;
		this.icon = options.icon;		
		this._ufo = this.map.ufo({
			title: this.name,
			color: "#c00000"
		}).icon(this.icon).visible(true);
		this.visibleChecked = ko.observable(true);
		this.color = "#f0f0f0";
		this.statusOrDist = "test";
		this.statusText = "flying";
		this.alt = "test";
		this.gSpd = ko.observable(0);
		this.vSpd = ko.observable(0);

		this.tableData = {
			gSpd: ko.observable(0),
			vSpd: ko.observable(0)
		}

		this.updateTableData = function() {
			this.tableData.gSpd(this.gSpd());
			this.tableData.vSpd(this.vSpd());
//			komap.fromJS(this,{},this.tableData);
		}

		this.visibleChecked.subscribe(function(val){
			this._ufo.visible(val);
		},this);
	}

	Pilot.prototype.coordsUpdate = function(latlng) {
		var now = (new Date).getTime();
		this._ufo.move({lat: latlng.lat, lng: latlng.lng, time: now});
	}

	Pilot.prototype.calculateSpeed = function(step) {
		var prevStep = (step > 0 ? step : this.route.length) - 1;
		this.gSpd(parseInt((this.route[step].lat - this.route[prevStep].lat)*10000));
		this.vSpd(parseInt((this.route[step].lng - this.route[prevStep].lng)*10000));
	}

	Pilot.prototype.moveToStep = function(step) {
		this.coordsUpdate(this.route[step]);
		this.calculateSpeed(step);
	}

	var TrackerPageDebug = function() {
		var self = this;
		this.map = new GoogleMap();
		this.ufos = ko.observableArray();
		this.ufosTable = new UfosTable(this.ufos);
	}

	TrackerPageDebug.prototype.generateRandomPilots = function(params) {
		var center = {lat:55.75,lng:37.61};
		for (var i = 0; i < 2; i++) {
			var pilot = new Pilot({
				name: "Pilot #" + i,
				map: this.map,
				icon: {url: params.imgRootUrl + "ufoFly.png", width: 32, height: 35, x: 15, y: 32}
			});
			pilot.route = [];
			pilot.route.push({lat:center.lat + Math.random()/2 - 0.25, lng: center.lng + Math.random()/2 - 0.25});
			for (var j = 1; j < 40; j++) {
				var prev = pilot.route[j-1];
				pilot.route.push({lat:prev.lat + Math.random()/10 - 0.05, lng: prev.lng + Math.random()/10 - 0.05});
			}
			pilot.moveToStep(0);
			this.ufos.push(pilot);
		}
	}

	TrackerPageDebug.prototype.startPlay = function() {
		var self = this;

		var playPilotsPositions = function() {
			self.step = self.step ? self.step + 1 : 1;
			self.ufos().forEach(function(pilot) {
				pilot.moveToStep(self.step%pilot.route.length);
			});
			self.playPilotsPositionsTimer = setTimeout(playPilotsPositions,200);
		}

		var playTableData = function() {
			self.ufos().forEach(function(pilot) {
				pilot.updateTableData();
			});
			self.playTableDataTimer = setTimeout(playTableData,1000);
		}

		playPilotsPositions();
		playTableData();
	}

	TrackerPageDebug.prototype.domInit = function(elem, params) {
		this.generateRandomPilots(params);
		this.startPlay();
	}

	TrackerPageDebug.prototype.templates = ['main'];

	return TrackerPageDebug;
});
