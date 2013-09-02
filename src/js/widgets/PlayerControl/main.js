define(["knockout","widget!Slider","widget!RadioGroup","widget!Select","config"], function(ko,Slider,RadioGroup,Select,config) {
	var PlayerControl = function(options) {
		var self = this;

		this.startKey = options.startKey;
		this.endKey =  options.endKey;
		this.currentKey = options.currentKey;
		this.raceKey = options.raceKey;
		this.serverKey = options.serverKey;
		this.tracksVisualMode = options.tracksVisualMode;
		this.cylindersVisualMode = options.cylindersVisualMode;
		this.heightsVisualMode = options.heightsVisualMode;
		this.modelsVisualMode = options.modelsVisualMode;
		this.shortWayVisualMode = options.shortWayVisualMode;
		this.namesVisualMode = options.namesVisualMode;
		this.profVisualMode = options.profVisualMode;
		this.playerState = options.playerState;
		this.playerSpeed = options.playerSpeed;
		this.isOnline = options.isOnline;
		this.loading = options.loading;
		this.timeoffset = options.timeoffset;
		this.isOnline = options.isOnline;
		this.isCurrentlyOnline = options.isCurrentlyOnline;
		this.setLiveMode = options.setLiveMode;
		this.debug = options.debug;
		this.disableLiveButton = options.disableLiveButton;

		this.dragKey = ko.observable(0);
		this.dragging = ko.observable(false);

		this.enableOfflineNotification = ko.observable(false);
		this.hideOfflineNotification = ko.observable(false);
		this.offlineNotificationIsVisible = ko.computed(function() {
			return self.isOnline() && !self.isCurrentlyOnline() && self.enableOfflineNotification() && !self.hideOfflineNotification();
		});
		this.turnOffOfflineNotification = function() {
			self.hideOfflineNotification(true);
		}

		var getTimeStr = function(h,m,s) {
			return (h<10?"0":"") + h + ":" + (m<10?"0":"") + m + ":" + (s<10?"0":"") + s;
		}

		this.displayKey = ko.computed(function() {
			return self.dragging() ? self.dragKey() : self.currentKey();
		});

		this.localTime = ko.computed(function() {
			var d = new Date();
			var localOffset = d.getTimezoneOffset() * 60000;
			var utc = self.displayKey() + localOffset + config.serverFake;
			var offset = self.timeoffset()*36000;
			var d = new Date(utc + offset);
//			console.log("localTime",localOffset,offset,"currentKey",self.currentKey());
//			var d = new Date(self.displayKey());
			return getTimeStr(d.getHours(),d.getMinutes(),d.getSeconds());
		});

		this.raceTime = ko.computed({
			read: function() {
				var d = Math.abs(Math.floor((self.displayKey()-self.raceKey())/1000));
				return (self.displayKey()<self.raceKey()?"-":" ") + getTimeStr(Math.floor(d/3600),Math.floor(d%3600/60),d%60);
			},
			write: function(value) {
				if (!value.match(/(\-)?\d\d:\d\d:\d\d/)) {
					alert("Incorrect raceTime format");
					return;
				}
				var sign = value.match(/\-/) ? -1 : 1;
				var ar = value.replace(/\-/,"").split(/:/);
				var dt = self.raceKey() + sign * (ar[0]*3600000+ar[1]*60000+ar[2]*1000);
				self.emit("change",dt);
			}
		});

		this.debugSetRaceTimeToZero = function() {
			self.raceTime("00:00:00");
		}

		this.raceTimeText = ko.computed(function() {
			return "Race to goal time";
			return self.displayKey() < self.raceKey() ? "Race to goals starts in" : "Race to goal is on";
		});

		this.raceTimeCss = ko.computed(function() {
			return self.displayKey() < self.raceKey() ? "airvis-inactive" : "airvis-active";
		});

		this.slider = new Slider({
			min: this.startKey,
			max: this.endKey,
			val: this.currentKey,
			drag: this.dragKey,
			dragging: this.dragging,
			range: this.serverKey,
			isOnline: this.isOnline,
			handleMode: ko.computed(function() {
				return self.loading() ? "airvis-slider-handle-loading" : "";
			})
		});
		this.slider.on("change",function(val) {
			self.emit("change",val);
		});

		this.tracksVisualSelect = new Select({data:this.tracksVisualMode,label:"Tracks",values:[{value:"10min",title:"10 min"},{value:"full",title:"Full"},{value:"off",title:"Off"}],expandDirection:"up"});
		this.cylindersVisualSelect = new Select({data:this.cylindersVisualMode,label:"Cylinders",values:[{value:"full",title:"Full"},{value:"empty",title:"Empty"},{value:"off",title:"Off"}]});
		this.heightsVisualSelect = new Select({data:this.heightsVisualMode,label:"Altitude",values:[{value:"off",title:"Off"},{value:"level",title:"Levels"},{value:"level+",title:"Bar"}]});
		this.modelsVisualSelect = new Select({data:this.modelsVisualMode,label:"Models",values:[{value:"large",title:"Large"},{value:"medium",title:"Medium"},{value:"small",title:"Small"}],expandDirection:"up"});
		this.shortWayVisualSelect = new Select({data:this.shortWayVisualMode,label:"Shortest way",values:[{value:"wide",title:"Wide"},{value:"thin",title:"Thin"},{value:"off",title:"Off"}]});
		this.namesVisualSelect = new Select({data:this.namesVisualMode,label:"Names",values:[{value:"on",title:"On"},{value:"auto",title:"Auto"},{value:"off",title:"Off"}]});
		this.profVisualSelect = new Select({data:this.profVisualMode,label:"Mode",values:[{value:"user",title:"User"},{value:"prof",title:"Prof"}]});
		
		var fadeSelects = function(v) {
			setTimeout(function() {
			var selects = ["tracksVisualSelect","cylindersVisualSelect","heightsVisualSelect","modelsVisualSelect","shortWayVisualSelect","namesVisualSelect","profVisualSelect"];
			for (var i = 0; i < selects.length; i++)
				if (self[selects[i]] != v)
					self[selects[i]].fade();
			},10);
		}

		var unfadeSelects = function() {
			var selects = ["tracksVisualSelect","cylindersVisualSelect","heightsVisualSelect","modelsVisualSelect","shortWayVisualSelect","namesVisualSelect","profVisualSelect"];
			for (var i = 0; i < selects.length; i++)
				self[selects[i]].unfade();
		}

		this.tracksVisualSelect.on("expand",fadeSelects).on("collapse",unfadeSelects);
		this.cylindersVisualSelect.on("expand",fadeSelects).on("collapse",unfadeSelects);
		this.heightsVisualSelect.on("expand",fadeSelects).on("collapse",unfadeSelects);
		this.modelsVisualSelect.on("expand",fadeSelects).on("collapse",unfadeSelects);
		this.shortWayVisualSelect.on("expand",fadeSelects).on("collapse",unfadeSelects);
		this.namesVisualSelect.on("expand",fadeSelects).on("collapse",unfadeSelects);
		this.profVisualSelect.on("expand",fadeSelects).on("collapse",unfadeSelects);
	}

	PlayerControl.prototype.switchState = function(self,e) {
		e.stopPropagation();
		e.preventDefault();
		this.playerState(this.playerState()=="play"?"pause":"play");
		return this;
	}

	PlayerControl.prototype.changeSpeed = function(newSpeed) {
		this.playerSpeed(Math.round(newSpeed));
		return this;
	}
	
	PlayerControl.prototype.windowClose = function() {
		if (this.modalWindow)
			this.modalWindow.visible(false);
	}

	PlayerControl.prototype.windowDrag = function(self,e) {
		if (this.modalWindow)
			this.modalWindow.emit("dragStart",this.modalWindow,e);
	}
	
	PlayerControl.prototype.domInit = function(elem,params) {
		this.modalWindow = params.modalWindow;
		this.isReady = true;
		this.emit("ready");
	}


	PlayerControl.prototype.templates = ["main"];

	return PlayerControl;
});