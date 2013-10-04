define([
	"walk",
	"jquery",
	"knockout",
	"utils",
	"EventEmitter",
	"WindowManager",
	"widget!GoogleMap",
	"widget!GoogleMapCanvas",
	"widget!PlayerControl",
	"widget!UfosTable",
	"widget!WaypointsTable",
	"widget!RetrieveTable",
	"widget!RetrieveRawForm",
	"widget!RetrieveChat",
	"widget!Checkbox",
	"widget!Window",
	"widget!MainMenu",
	"widget!TopBar",
	"widget!Facebook",
	"widget!DistanceMeasurer",
	"RealServer",
	"DataSource",
	"ShortWay",
	"config",
	"./Ufo",
	"./Waypoint",
	"./Sms",
	"jquery.cookie"
],function(
	walk,
	$,
	ko,
	utils,
	EventEmitter,
	WindowManager,
	GoogleMap,
	GoogleMapCanvas,
	PlayerControl,
	UfosTable,
	WaypointsTable,
	RetrieveTable,
	RetrieveRawForm,
	RetrieveChat,
    Checkbox,
    Window,
    MainMenu,
    TopBar,
    Facebook,
    DistanceMeasurer,
    RealServer,
    DataSource,
    ShortWay,
    config,
    Ufo,
    Waypoint,
    Sms
){

	var TrackerPageDebug = function() { 
		var self = this;
		this.options = config.defaults;

		$.each(this.options,function(i,v) {
			self[i] = ko.observable();
			self[i].subscribe(function(value) {
				self.options[i] = value;
			});
		});
		
		this.startKey = ko.observable(0);
		this.endKey = ko.observable(0);
		this.currentKey = ko.observable(0);
		this.raceKey = ko.observable(0);
		this.optdistance = ko.observable(0);
		this.timeoffset = ko.observable("");
		this.raceType = ko.observable("");
		this.titles = ko.observable({});
		this.raceTypeOptions = ko.observable({});

		this.isReady = ko.observable(false);
		this.isLoaded = ko.observable(false);
		this.loading = ko.observable(false);
		this.trackedUfoId = ko.observable(null);
		this.isDistanceMeasurerEnabled = ko.observable(false);

		this.ufos = ko.observableArray([]);
		this.waypoints = ko.observableArray([]);
		this.shortWay = ko.observable(null);

		this.retrieveStatus = ko.observable("");
		this.retrieveState = ko.observable(config.retrieveState);
		this.retrieveSelectedUfo = ko.observable(null);
		this.smsData = ko.observableArray([]);

		this.mapType = ko.computed(function() {
			return config.mapTypes[self.mapWidget()];
		});

		this.fps = ko.observable(0);

		this._serverKey = 0;
		this._serverKeyUpdatedAt = (new Date).getTime();
		this.serverKey = function(value) {
			if (value) {
				self._serverKey = value;
				self._serverKeyUpdatedAt = (new Date).getTime();
			}
			else {
				var d = (new Date).getTime();
				return self._serverKey + d - self._serverKeyUpdatedAt - config.serverDelay;
			}
		}

		this.isCurrentlyOnline = ko.observable(false);
		this._isCurrentlyOnline = ko.computed(function() {
			if (!self.isOnline()) return false;
			self.isCurrentlyOnline(Math.abs(self.currentKey() - self.serverKey()) < config.dtDiffReply);
		});
		this.isCurrentlyOnline.subscribe(function(v) {
			if (v) {
				self.setLiveMode();
			}
		});

		this.server = new RealServer({
			apiDomain: self.apiDomain,
			apiVersion: self.apiVersion,
			contestId: self.contestId,
			raceId: self.raceId,
			isOnline: self.isOnline,
			coordsPrecision: self.coordsPrecision
		});
		this.dataSource = new DataSource({
			server: this.server
		});
	}

	TrackerPageDebug.prototype.domInit = function(elem,params) {
		var self = this;

		// callback нужен чтобы внешний код мог вытащить ссылку на визуализацию
		if (params.callback) {
			params.callback(self);
		}

		$.each(params,function(i,p) {
			self.setOption(i,p);
		});
		this.rebuild(function() {
			self.isReady(true);
			self.emit("ready",self);
		});
		self.emit("domInit",self);
	}

	TrackerPageDebug.prototype.setOption = function(p,v,force) {
		if (this.options.hasOwnProperty(p) || force) {
			this.options[p] = v;
		}
	}

	TrackerPageDebug.prototype.rebuild = function(callback) {
		var self = this;
		var w = walk();

		$.each(this.options,function(i,v) {
			// Переменные mapWidget и mode проставляются дальше
			if (i == "mapWidget" || i == "mode") return;
			self[i](v);
		});

		this.ufos([]);
		this.waypoints([]);
		this.shortWay(null);
		this.smsData([]);

		// Строим или перестраиваем виджет map в зависимости от mapType-переменной
		if (!this.map || this.options.mapWidget !== this.mapWidget()) {
			this.mapWidget(this.options.mapWidget);
			if (this.map && this.map.domDestroy) {
				this.map.domDestroy();
			}
			var mapOptions = {
				ufos: this.ufos,
				waypoints: this.waypoints,
				shortWay: this.shortWay,
				tracksVisualMode: this.tracksVisualMode,
				cylindersVisualMode: this.cylindersVisualMode,
				heightsVisualMode: this.heightsVisualMode,
				modelsVisualMode: this.modelsVisualMode,
				shortWayVisualMode: this.shortWayVisualMode,
				namesVisualMode: this.namesVisualMode,
				profVisualMode: this.profVisualMode,
				mode: this.mode,
				currentKey: this.currentKey,
				mapOptions: this.mapOptions,
				raceType: this.raceType,
				raceTypeOptions: this.raceTypeOptions,
				trackedUfoId: this.trackedUfoId,
				isDistanceMeasurerEnabled: this.isDistanceMeasurerEnabled,
				cookiesEnabled: this.cookiesEnabled
			}
			if (this.mapType() == "GoogleMapCanvas") {
				this.map = new GoogleMapCanvas(mapOptions);
			}
			else if (this.mapType() == "GoogleMap") {
				this.map = new GoogleMap(mapOptions);
			}
			else if (this.mapType() == "OwgMap") {
				this.map = new OwgMap(mapOptions);
			}
			else throw new Error("mapWidget " + this.options.mapWidget + " is not supported");

			this.map.on("switchDistanceMeasurer",function() {
				if (self.distanceMeasurer) {
					self.distanceMeasurer.switch(self.map.map);
				}
			});

			w.step(function(step) {
				if (self.map.isReady()) {
					step.next();
				}
				else {
					self.map.on("ready",function() {
						step.next();
					});
				}
			});
		}

		// Строим или перестраиваем остальные виджеты
		if (this.options.mode != this.mode()) {
			this.mode(this.options.mode);

			("ufosTable waypointsTable playerControl mainMenu facebook topBar windowManager distanceMeasurer"
			+ " retrieveTable retrieveChat retrieveDistanceMeasurer retrieveRawForm").split(/ /).forEach(function(widgetName) {
				if (self[widgetName] && self[widgetName].domDestroy) {
					self[widgetName].domDestroy();
				}
			});

			if (this.mode() === "full") {
				// Строим виджет ufosTable
				this.ufosTable = new UfosTable({
					ufos: this.ufos,
					raceType: this.raceType,
					trackedUfoId: this.trackedUfoId,
					cookiesEnabled: this.cookiesEnabled
				});
				this.ufosTable.on("centerMap",function(position) {
					self.map.centerMap(position);
				});
				this.ufosTable.on("zoominMap",function(zoom) {
					self.map.zoominMap(zoom);
				});
				this.ufosTable.on("openPopupById",function(id) {
					self.map.openPopupById(id);
				});
				w.step(function(step) {
					if (self.ufosTable.isReady) {
						step.next();
					}
					else {
						self.ufosTable.on("ready",function() {
							step.next();
						});
					}
				});
				// Строим виджет playerControl
				this.playerControl = new PlayerControl({
					startKey: this.startKey,
					endKey: this.endKey,
					currentKey: this.currentKey,
					raceKey: this.raceKey,
					serverKey: this.serverKey,
					timeoffset: this.timeoffset,
					tracksVisualMode: this.tracksVisualMode,
					cylindersVisualMode: this.cylindersVisualMode,
					heightsVisualMode: this.heightsVisualMode,
					modelsVisualMode: this.modelsVisualMode,
					shortWayVisualMode: this.shortWayVisualMode,
					namesVisualMode: this.namesVisualMode,
					profVisualMode: this.profVisualMode,
					playerState: this.playerState,
					playerSpeed: this.playerSpeed,
					isOnline: this.isOnline,
					isCurrentlyOnline: this.isCurrentlyOnline,
					loading: this.loading,
					debug: this.debug,
					fps: this.fps,
					setLiveMode: function() { self.setLiveMode(); }
				});
				w.step(function(step) {
					if (self.playerControl.isReady) {
						step.next();
					}
					else {
						self.playerControl.on("ready",function() {
							step.next();
						});
					}
				});
				// Строим виджет mainMenu
				this.mainMenu = new MainMenu({
					titles: this.titles,
					titleUrl: this.titleUrl
				});
				// Строим виджет facebook
				this.facebook = new Facebook();
				// Строим виджет waypointsTable
				this.waypointsTable = new WaypointsTable({
					waypoints: this.waypoints,
					shortWays: this.shortWay
				});
				// Строим виджет distanceMeasurer
				this.distanceMeasurer = new DistanceMeasurer({
					isEnabled: this.isDistanceMeasurerEnabled
				});
				// Определяем виджеты окон
				this.ufosTableWindow = new Window(config.windows.ufosTable);
				this.playerControlWindow = new Window(config.windows.playerControl);
				this.mainMenuWindow = new Window(config.windows.mainMenu);
				this.facebookWindow = new Window(config.windows.facebook);
				this.waypointsTableWindow = new Window(config.windows.waypointsTable);
				this.distanceMeasurerWindow = new Window(config.windows.distanceMeasurer);
				// Строим виджет topBar
				this.topBar = new TopBar();
				this.topBar.items.push(this.mainMenuWindow,this.ufosTableWindow,this.playerControlWindow,this.facebookWindow,this.waypointsTableWindow);
				// Перестраиваем windowManager
				this.windowManager = new WindowManager();
				this.windowManager.items.push(this.mainMenuWindow,this.ufosTableWindow,this.playerControlWindow,this.facebookWindow,this.waypointsTableWindow,this.distanceMeasurerWindow);
			}
			else if (this.mode() == "retrieve") {
				this.retrieveTable = new RetrieveTable({
					ufos: this.ufos,
					status: this.retrieveStatus,
					state: this.retrieveState,
					selectedUfo: this.retrieveSelectedUfo,
					smsData: this.smsData
				});
				this.retrieveTable.on("selectUfo",function(ufo) {
					if (ufo && self.retrieveTableWindow) {
						self.retrieveChatWindow.show();
					}
				});
				w.step(function(step) {
					self.retrieveTable.on("ready",function() {
						step.next();
					});
				});
				this.retrieveChat = new RetrieveChat({
					ufo: this.retrieveSelectedUfo,
					smsData: this.smsData,
					server: this.server
				});
				this.retrieveChat.on("newMessage",function() {
					self.retrieveRun();
				});
				w.step(function(step) {
					self.retrieveChat.on("ready",function() {
						step.next();
					});
				});
			    this.retrieveDistanceMeasurer = new RetrieveDistanceMeasurer({
			    	map:this.map
			    });
				w.step(function(step) {
				    self.retrieveDistanceMeasurer.on("ready",function() {
				    	step.next();
				    });
				});
				this.retrieveRawForm = new RetrieveRawForm({server:this.server});
				w.step(function(step) {
					self.retrieveRawForm.on("ready",function() {
						step.next();
					});
				});
				// Строим виджет mainMenu
				this.mainMenu = new MainMenu({
					titles: this.titles,
					titleUrl: this.titleUrl
				});
				w.step(function(step) {
					self.mainMenu.on("ready",function() {
						step.next();
					});
				});
				// Определяем виджеты окон
				this.retrieveTableWindow = new Window(config.windows.retrieveTable);
				this.retrieveChatWindow = new Window(config.windows.retrieveChat);
			    this.retrieveDistanceMeasurerWindow = new Window(config.windows.retrieveDistanceMeasurer);
				this.retrieveRawFormWindow = new Window(config.windows.retrieveRawForm);
				this.mainMenuWindow = new Window(config.windows.mainMenu);
				// Строим виджет topBar
				this.topBar = new TopBar();
				w.step(function(step) {
					self.topBar.on("ready",function() {
						self.topBar.items.push(self.mainMenuWindow,self.retrieveTableWindow,self.retrieveRawFormWindow,self.retrieveDistanceMeasurerWindow);
						step.next();
					});
				});
				// Перестраиваем windowManager
				this.windowManager = new WindowManager();
				w.step(function(step) {
					self.windowManager.on("ready",function() {
						self.windowManager.items.push(self.mainMenuWindow,self.retrieveTableWindow,self.retrieveRawFormWindow,self.retrieveChatWindow,self.retrieveDistanceMeasurerWindow);
						step.next();
					});
				});
			}
		}

		w.wait(function() {
			self.loadRaceData(function(raceData) {
				if (self.mode() == "full") {
					self.loadUfosData(function() {
						self.playerInit();
						self.playerRun();
						self.map.update();
						self.isLoaded(true);
						self.emit("loaded",raceData);
					});
				}
				else if (self.mode() == "retrieve") {
					self.loadUfosData(function() {
						self.retrieveInit();
						self.map.update();
						self.isLoaded(true);
						self.emit("loaded",raceData);
					});
				}
				else {
					self.map.update();
					self.isLoaded(true);
					self.emit("loaded",raceData);
				}
			});
		});

		if (callback) {
			callback();
		}
	}

	TrackerPageDebug.prototype.loadServerTime = function(callback) {
		var self = this;
		this.dataSource.get({
			type: "serverTime",
			callback: function(data) {
		    	self.serverKey(data * 1000);
		    	if (callback && typeof callback == "function") {
		    		callback();
		      	}
		  	}
		});
	};

	TrackerPageDebug.prototype.loadRaceData = function(callback) {
		var self = this;
		self.loading(true);
	    self.loadServerTime(function() {
		    self.dataSource.get({
		        type: "race",
		        callback: function(data) {
			        self.loading(false);
	        		self.startKey(data.startKey);
	        		self.endKey(data.endKey);
	        		self.currentKey(data.startKey);
	        		self.raceKey(data.raceKey||data.startKey);
	        		self.timeoffset(data.timeoffset);
	        		self.optdistance(data.optdistance);
	        		self.raceType(data.raceType);
	        		self.raceTypeOptions(data.raceTypeOptions);
	        		self.titles(data.titles);
			        if (data.waypoints) {
	        		    var waypoints2load = [];
	        		    var shortWayData = [];
	            		for (var i = 0; i < data.waypoints.length; i++) {
	              			var w = new Waypoint(data.waypoints[i]);
							shortWayData.push({
								lat: w.center().lat,
								lng: w.center().lng,
								radius: w.radius(),
								id: w.id(),
								name: w.name(),
								type: w.type()
							});
	              			waypoints2load.push(w);
	              		}
				        self.waypoints(waypoints2load);
				        self.shortWay((new ShortWay).calculate(shortWayData));
		            }
	    		    if (self.map)
	         	    	self.map.calculateAndSetDefaultPosition();
	          		if (callback && typeof callback == "function")
	            		callback(data);
	        	},
	        	error: function(jqXHR,textStatus,errorThrown) {
	          		self.emit("loadingError","Failed loading race data");
		        }
            });
		});
	}

	TrackerPageDebug.prototype.loadUfosData = function(callback) {
		var self = this;
		self.loading(true);
		self.dataSource.get({
			type: "ufos",
			callback: function(ufos) {
				self.loading(false);
				if (ufos) {
					var ufos2load = [];
					$.each(ufos,function(i,data) {
						var ufo = new Ufo(data,self);
						ufo.fullTrackEnabled.subscribe(function(v) {
							self.updateFullTracksData(ufo);
						});
						ufos2load.push(ufo);
					});
					self.ufos(ufos2load);
				}
				if (callback && typeof callback == "function")
					callback();
			},
			error: function(jqXHR,textStatus,errorThrown) {
				self.emit("loadingError","Failed loading ufos data");
			}
		});
	}

	TrackerPageDebug.prototype.updateFullTracksData = function(ufo) {
		var self = this;
		if (ufo.fullTrackEnabled()) {
			this.dataSource.get({
				type: "ufoFullTrack",
				id: ufo.id(),
				from_time: Math.floor(this.startKey()/1000),
				to_time: Math.ceil(this.endKey()/1000),
				callback: function(data) {
					ufo.pushFullTrack(data);
					self.map.updateAndRedraw();
				}
			});
		}
		else {
			ufo.destroyFullTrack();
			self.map.updateAndRedraw();
		}
	}

	TrackerPageDebug.prototype.calculateFPS = function() {
		var dt = Math.floor((new Date).getTime()/1000);
		if (!this._fps) this._fps = 1;
		if (!this._fpsDt || this._fpsDt+1<dt) this._fpsDt = dt;
		if (this._fpsDt === dt) {
			this._fps++;
		}
		else {
			this.fps(this._fps);
			this._fps = 1;
			this._fpsDt = dt;
		}
	}

	TrackerPageDebug.prototype.playerInit = function() {
		var self = this;

		var renderFrame = function(callback) {
			self.currentDataSourceGetKey = self.currentKey();
			self.dataSource.get({
				type: "timeline",
				dt: self.currentDataSourceGetKey,
				timeMultiplier: self.playerSpeed(),
				dtStart: self.startKey(),
				isOnline: self.isOnline(),
				mode: self.isCurrentlyOnline() ? "simple" : "linear",
//				mode: self.isCurrentlyOnline() ? "simple" : "simple",
				onLoadStart: function() {
					self.loading(true);
				},
				onLoadFinish: function() {
					self.loading(false);
				},
				callback: function(data,query) {
					if (query.dt != self.currentDataSourceGetKey) return;
					// в data ожидается массив с ключами - id-шниками пилотов и данными - {lat и lng} - текущее положение
					self.ufos().forEach(function(ufo) {
						if (data && data[ufo.id()]) {
							rw = data[ufo.id()];
							ufo.tData.dist = rw.dist;
							ufo.tData.alt = rw.alt;
							ufo.tData.gSpd = rw.gspd;
							ufo.tData.vSpd = rw.vspd;
							ufo.tData.speed = rw.gspd>=0 ? (rw.gspd*3.6).toFixed(1) : "";
							ufo.tData.distFrom = (rw.dist>=0?self.optdistance()-rw.dist:self.optdistance()).toFixed(1);

							if (rw.state && rw.state!=ufo.state())
								ufo.state(rw.state);
							if (rw.stateChangedAt && rw.stateChangedAt!=ufo.stateChangedAt())
								ufo.stateChangedAt(rw.stateChangedAt);

							ufo.tData.finishedTime = ufo.state()=="finished" && ufo.stateChangedAt() ? utils.getTimeStr(ufo.stateChangedAt()-self.raceKey()/1000) : "";

//							ufo.alt(rw.alt);
//							ufo.dist(rw.dist);
//							ufo.gSpd(rw.gspd);
//							ufo.vSpd(rw.vspd);
//							if (rw.position.lat && rw.position.lng) {
//								ufo.noPosition(false);
//								if (!ufo.position() || 
//									!ufo.position().lat || 
//									!ufo.position().lng ||
//									Math.abs(rw.position.lat-ufo.position().lat) > 0.0000001 ||
//									Math.abs(rw.position.lng-ufo.position().lng) > 0.0000001) {
//									ufo.position({lat:rw.position.lat,lng:rw.position.lng,dt:rw.position.dt});
//								}
//								ufo.appendTrack(rw.track);
//							}
//							else {
//								ufo.noPosition(true);
//							}
							if (rw.position.lat && rw.position.lng) {
								ufo.position.lat = rw.position.lat;
								ufo.position.lng = rw.position.lng;
								ufo.position.dt = rw.position.dt;
								ufo.appendTrack(rw.track);
								ufo.noPosition(false);
							}
							else {
								ufo.noPosition(true);
							}

							ufo.noData(false);
						}
						else
							ufo.noData(true);
					});
					self.map.update();
					self.ufosTable.update();
					if (callback)
						callback(data);
				}
			});
		}

		var _inRunCycle = false;
		var _currentKeyUpdatedAt = null;
		var _currentKey = null;
		var _runTimeout = null;

		var run = function(force) {
			if (_inRunCycle && !force) return;
			_inRunCycle = true;
			if (!_currentKeyUpdatedAt || force) {
				_currentKeyUpdatedAt = (new Date).getTime();
				_currentKey = self.currentKey();

				if (_runTimeout && config.useRequestAnimFrameInMainCycle) utils.cancelRequestAnimFrame(_runTimeout);
				else if (_runTimeout) clearTimeout(_runTimeout);

				if (_runTimeout) utils.cancelRequestAnimFrame(_runTimeout);
//				if (_runTimeout) clearTimeout(_runTimeout);
				_runTimeout = null;
			}
			self.calculateFPS();
			renderFrame(function() {
				if (self.playerState() == "play") {
					_runTimeout = (config.useRequestAnimFrameInMainCycle ? utils.requestAnimFrame : setTimeout)(function() {
						var _lastUpdated = _currentKeyUpdatedAt;
						_currentKeyUpdatedAt = (new Date).getTime();
						_currentKey += (_currentKeyUpdatedAt-_lastUpdated)*self.playerSpeed();
						if (_currentKey > self.endKey()) {
							_currentKey = self.endKey();
							self.playerState("pause");
						}
						self.currentKey(_currentKey);
						_inRunCycle = false;
						run();
					},config.mainCycleDelay);
				}
				else {
					_inRunCycle = false;
					_currentKeyUpdatedAt = null;
					_currentKey = null;
					_runTimeout = null;
				}
			});
		}

		self.playerControl.on("change",function(v) {
			self.currentKey(v);
			self.map.destroyTracks();
			run(true);
		});

		self.playerState.subscribe(function(state) {
			if (state == "play") {
				run(true);
			}
		});
	}

	TrackerPageDebug.prototype.playerRun = function() {
		if (this.isOnline()) {
			if (this.endKey() > this.serverKey()) {
				this.setLiveMode();
			}
			else {
				this.playerState("play");
				this.playerSpeed(1);
				this.playerControl.emit("change",this.raceKey());
			}
		}
		else {
			this.playerState("play");
			this.playerSpeed(2);
//			this.playerControl.emit("change",this.raceKey());
		}
	}

	TrackerPageDebug.prototype.setLiveMode = function() {
		if (!this.isOnline()) return;
		if (this.playerControl) {
			this.playerState("play");
			this.playerSpeed(1);
			this.playerControl.emit("change",this.serverKey());
		}
	}

// TODO: Дописать и переделать ретрив
/*
	TrackerPageDebug.prototype.retrieveRun = function() {
		var self = this;
		this.retrieveStatus("Loading...");
		clearTimeout(this.retrieveCounter);
		this.dataSource.get({
			type: "sms",
			lastSmsTimestamp: self.retrieveLastSmsTimestamp,
			callback: function(data) {
				var rev1 = {};
				self.smsData().forEach(function(rw) {
					rev1[rw.id] = 1;
				});
				var sms2push = [];
				data.forEach(function(rw) {
					if (!rev1[rw.id]) {
						sms2push.push(new Sms(rw));
						rev1[rw.id] = 1;
					}
					self.retrieveLastSmsTimestamp = Math.max(self.retrieveLastSmsTimestamp,rw.timestamp);
				});
				if (sms2push.length > 0)
					ko.utils.arrayPushAll(self.smsData,sms2push);
				self.retrieveStatus(sms2push.length > 0 ? sms2push.length + " message" + (sms2push.length>1?"s":"") + " received":"No new messages");
				if (self.retrieveState() == "play") {
					var counter = 10;
					var runCounter = function() {
						self.retrieveCounter = setTimeout(function() {
							counter--;
							if (self.retrieveState() != "play") return;
							self.retrieveStatus("Waiting for " + counter + " seconds");
							if (counter > 0) runCounter();
							else self.retrieveRun();
						},1000);
					}
					runCounter();
				}
			}
		});
	}

	TrackerPageDebug.prototype.retrieveInit = function() {
		var self = this;
		this.retrieveLastSmsTimestamp = 0;
		this.retrieveCounter = null;
		this.retrieveState.subscribe(function(state) {
			if (state == "play") self.retrieveRun();
			else clearTimeout(self.retrieveCounter);
		});
		this.retrieveState.notifySubscribers(this.retrieveState());
	}
*/
	TrackerPageDebug.prototype.templates = ["main"];

	return TrackerPageDebug;
});