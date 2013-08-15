define([
    'utils',
    'walk',
    'jquery',
    'knockout',
    'knockout.mapping',
    'EventEmitter',
    'WindowManager',
    'widget!GoogleMap',
    'widget!GoogleMapCanvas',
    'widget!PlayerControl',
    'widget!UfosTable',
    'widget!RetrieveTable',
    'widget!RetrieveRawForm',
    'widget!RetrieveChat',
    'widget!Checkbox',
    'widget!Window',
    'widget!MainMenu',
    'widget!TopBar',
    'widget!Facebook',
    'widget!RetrieveDistanceMeasurer',
    'TestServer',
    'RealServer',
    'DataSource',
    'ShortWay',
    'config',
    'jquery.cookie'
], function(
	utils,
	walk,
	$,
	ko,
	komap,
	EventEmitter,
	WindowManager,
	GoogleMap,
	GoogleMapCanvas,
	PlayerControl,
	UfosTable,
	RetrieveTable,
	RetrieveRawForm,
	RetrieveChat,
    Checkbox,
    Window,
    MainMenu,
    TopBar,
    Facebook,
    RetrieveDistanceMeasurer,
    TestServer,
    RealServer,
    DataSource,
    ShortWay,
    config
){

	// requestAnim shim layer by Paul Irish
    var requestAnimFrame = (function() {
//        return 
//			window.requestAnimationFrame       || 
//			window.webkitRequestAnimationFrame || 
//			window.mozRequestAnimationFrame    || 
//			window.oRequestAnimationFrame      || 
//			window.msRequestAnimationFrame     || 
//			function(/* function */ callback, /* DOMElement */ element){
//			  window.setTimeout(callback, 1000 / 60);
//			};
		return function(callback,element) {
			  window.setTimeout(callback,100);
			};
    })();

	var Waypoint = function(options) {
		this.id = ko.observable(options.id);
		this.name = ko.observable(options.name);
		this.type = ko.observable(options.type);
		this.center = ko.observable({lat:options.center.lat,lng:options.center.lng});
		this.radius = ko.observable(options.radius);
		this.openKey = ko.observable(options.openKey);
	}

	var Ufo = function(options) {
		this.id = ko.observable(options.id);
		this.name = ko.observable(options.name);
		this.country = ko.observable(options.country);
		this.personId = ko.observable(options.personId);
		this.color = ko.observable(options.color || config.ufo.color);
		this.state = ko.observable(null);
		this.stateChangedAt = ko.observable(null);
		this.position = ko.observable({lat:null,lng:null,dt:null});
		this.track = ko.observable({lat:null,lng:null,dt:null});
		this.alt = ko.observable(null);
		this.dist = ko.observable(null);
		this.gSpd = ko.observable(null);
		this.vSpd = ko.observable(null);
		this.visible = ko.observable(config.ufo.visible);
		this.trackVisible = ko.observable(config.ufo.trackVisible);
		this.noData = ko.observable(true);
		this.noPosition = ko.observable(true);
		this.tableData = {
			dist: ko.observable(null),
			gSpd: ko.observable(null),
			vSpd: ko.observable(null),
			alt: ko.observable(null),
			state: ko.observable(null),
			stateChangedAt: ko.observable(null)
		}
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
	}

	Ufo.prototype.updateTableData = function() {
		this.tableData.dist(this.dist() ? (this.dist()/1000).toFixed(1) : "");
		this.tableData.gSpd(this.gSpd());
		this.tableData.vSpd(this.vSpd());
		this.tableData.alt(this.alt());
		this.tableData.state(this.state());
		this.tableData.stateChangedAt(this.stateChangedAt());
	}

	Ufo.prototype.resetTrack = function() {
		// dt=null - специальное значение. Карта его отслеживает и убивает у себя трек при dt=null
		this.track({lat:null,lng:null,dt:null});
	}

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

	var TrackerPageDebug = function() { 
		var self = this;
		this.$ = $;
		this.options = config;
		this.width = ko.observable(this.options.width);
		this.height = ko.observable(this.options.height);
		this.imgRootUrl = ko.observable(this.options.imgRootUrl);
		this.mapWidget = ko.observable(this.options.mapWidget);
		this.mapOptions = ko.observable(this.options.mapOptions);
		this.mode = ko.observable(this.options.mode);
		this.titleUrl = ko.observable(this.options.titleUrl);
		this.debug = ko.observable(this.options.debug);
		this.tracksVisualMode = ko.observable(this.options.tracksVisualMode);
		this.cylindersVisualMode = ko.observable(this.options.cylindersVisualMode);
		this.heightsVisualMode = ko.observable(this.options.heightsVisualMode);
		this.modelsVisualMode = ko.observable(this.options.modelsVisualMode);
		this.shortWayVisualMode = ko.observable(this.options.shortWayVisualMode);
		this.namesVisualMode = ko.observable(this.options.namesVisualMode);
		this.profVisualMode = ko.observable(this.options.profVisualMode);
		this.startKey = ko.observable(0);
		this.endKey = ko.observable(0);
		this.currentKey = ko.observable(0);
		this.raceKey = ko.observable(0);
		this.timeoffset = ko.observable("");
		this.playerState = ko.observable(this.options.playerState);
		this.playerSpeed = ko.observable(this.options.playerSpeed);
		this.isReady = ko.observable(false);
		this.isLoaded = ko.observable(false);
		this.isOnline = ko.observable(false);
		this.isCurrentlyOnline = ko.observable(false);
		this.disableLiveButton = ko.observable(false);
		this.loading = ko.observable(false);
		this.optdistance = ko.observable(0);
		this.raceType = ko.observable("");
		this.raceTypeOptions = ko.observable({});

		this.ufos = ko.observableArray();
		this.waypoints = ko.observableArray();
		this.shortWay = ko.observable(null);

		this.isLoadedWithDelay = ko.observable(false);
		this.isLoaded.subscribe(function(v) {
			if (v) {
				setTimeout(function() {
					self.isLoadedWithDelay(true);
				},2000);
			}
		});


		// Йоу! Клевый код!
		this._serverKey = ko.observable(0);
		this._serverKeyUpdatedAt = (new Date).getTime();
		this.serverKey = function(value) {
			if (value) {
				self._serverKey(value);
				self._serverKeyUpdatedAt = (new Date).getTime();
			}
			else {
				if (!self.isOnline()) return null;
				var d = (new Date).getTime();
				return self._serverKey() + d - self._serverKeyUpdatedAt - config.serverDelay;
			}
		}

		this.tracksVisualMode.subscribe(function() { if (self.map) self.map.update(); });
		this.cylindersVisualMode.subscribe(function() { if (self.map) self.map.update("static"); });
		this.heightsVisualMode.subscribe(function() { if (self.map) { self.map.updateIcons(); self.map.update(); } });
		this.modelsVisualMode.subscribe(function() { if (self.map) { self.map.updateIcons(); self.map.update(); } });
		this.shortWayVisualMode.subscribe(function() { if (self.map) self.map.update("static"); });
		this.namesVisualMode.subscribe(function() { if (self.map) { self.map.updateIcons(); self.map.update(); } });
		this.profVisualMode.subscribe(function() { if (self.map) self.map.update("static"); });

		this.shortWayInitializer = ko.computed(function() {
			if (self.isReady() && self.waypoints && self.waypoints().length > 0) {
				var shortWayCalculator = new ShortWay();
				var data = [];
				for (var i = 0; i < self.waypoints().length; i++) {
					var w = self.waypoints()[i];
					data.push({
						lat: w.center().lat,
						lng: w.center().lng,
						radius: w.radius(),
						id: w.id(),
						name: w.name(),
						type: w.type()
					});
				}
				self.shortWay(shortWayCalculator.calculate(data));
			}
			else {
				self.shortWay(null);
			}
		});

		this.mapInitializer = ko.computed(function() {
			if (self.isReady()) {
				if (self.map)
					self.map.destroy();
				var mapOptions = {
						ufos: self.ufos,
						waypoints: self.waypoints,
						shortWay: self.shortWay,
						tracksVisualMode: self.tracksVisualMode,
						cylindersVisualMode: self.cylindersVisualMode,
						heightsVisualMode: self.heightsVisualMode,
						modelsVisualMode: self.modelsVisualMode,
						shortWayVisualMode: self.shortWayVisualMode,
						namesVisualMode: self.namesVisualMode,
						profVisualMode: self.profVisualMode,
						currentKey: self.currentKey,
						raceKey: self.raceKey,
						imgRootUrl: self.imgRootUrl,
						mapOptions: self.mapOptions,
						mode: self.mode,
						raceType: self.raceType,
						raceTypeOptions: self.raceTypeOptions
				};
				if (self.mapWidget() == "2d-old") {
					self.map = new GoogleMap(mapOptions);
					self.mapType = "GoogleMap";
				}
				else if (self.mapWidget() == "2d") {
					self.map = new GoogleMapCanvas(mapOptions);
					self.mapType = "GoogleMapCanvas";
				}
				else if (self.mapWidget() == "3d") {
					self.map = new OwgMap(mapOptions);
					self.mapType = "OwgMap";
				}
			}
			else {
				self.map = null;
				self.mapType = null;
			}
		});

		this.server = new RealServer(this.options);
		this.dataSource = new DataSource({
			server: this.server
		});
	}

	TrackerPageDebug.prototype.createWindows = function() {
		var self = this;
		if (this.mode() == "full") {
			this.ufosTable = new UfosTable({
				ufos: this.ufos,
				raceKey: this.raceKey,
				optdistance: this.optdistance,
				raceType: this.raceType
			});
			this.ufosTable.on("centerMap",function(position) {
				if (self.map) self.map.centerMap(position);
			});
			this.ufosTableWindow = new Window(this.options.windows.ufosTable);

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
				setLiveMode: function() { self.setLiveMode(); },
				disableLiveButton: this.disableLiveButton
			});
			this.playerControlWindow = new Window(this.options.windows.playerControl);

			this.mainMenu = new MainMenu({
				titleUrl: this.titleUrl
			});
			this.mainMenuWindow = new Window(this.options.windows.mainMenu);

			this.facebook = new Facebook();
			this.facebookWindow = new Window(this.options.windows.facebook);

			this.topBar = new TopBar();
			this.topBar.items.push(this.mainMenuWindow,this.ufosTableWindow,this.playerControlWindow,this.facebookWindow);

			this.windowManager = new WindowManager();
			this.windowManager.items.push(this.ufosTableWindow,this.playerControlWindow,this.mainMenuWindow,this.facebookWindow);
		}
		else if (this.mode() == "retrieve") {
			this.retrieveStatus = ko.observable("");
			this.retrieveState = ko.observable(config.retrieveState);
			this.retrieveSelectedUfo = ko.observable(null);
			this.smsData = ko.observableArray([]);
			this.retrieveTable = new RetrieveTable({
				ufos: this.ufos,
				status: this.retrieveStatus,
				state: this.retrieveState,
				selectedUfo: this.retrieveSelectedUfo,
				smsData: this.smsData
			});
			this.retrieveTableWindow = new Window(this.options.windows.retrieveTable);

			this.retrieveChat = new RetrieveChat({
				ufo: this.retrieveSelectedUfo,
				smsData: this.smsData,
				server: this.server
			});
			this.retrieveChatWindow = new Window(this.options.windows.retrieveChat);

			this.retrieveSelectedUfo.subscribe(function(ufo) {
				if (ufo) self.retrieveChatWindow.show();
			});
			this.retrieveChat.on("newMessage",function() {
				self.retrieveRun();
			});

		    this.retrieveDistanceMeasurer = new RetrieveDistanceMeasurer({map:this.map});
		    this.retrieveDistanceMeasurerWindow = new Window(this.options.windows.retrieveDistanceMeasurer);
		    this.retrieveDistanceMeasurerWindow.on('showed', function(){
		      self.retrieveDistanceMeasurer.enable(self.map.map);
		    });
		    this.retrieveDistanceMeasurerWindow.on('hided', function(){
		      self.retrieveDistanceMeasurer.disable();
		    });

			this.retrieveRawForm = new RetrieveRawForm({server:this.server});
			this.retrieveRawFormWindow = new Window(this.options.windows.retrieveRawForm);

			this.mainMenu = new MainMenu({
				titleUrl: this.titleUrl
			});
			this.mainMenuWindow = new Window(this.options.windows.mainMenu);

			this.topBar = new TopBar();
			this.topBar.items.push(this.mainMenuWindow,this.retrieveTableWindow,this.retrieveRawFormWindow,this.retrieveDistanceMeasurerWindow);

			this.windowManager = new WindowManager();
			this.windowManager.items.push(this.mainMenuWindow,this.retrieveTableWindow,this.retrieveRawFormWindow,this.retrieveChatWindow,this.retrieveDistanceMeasurerWindow);
		}
	}

	TrackerPageDebug.prototype.domInit = function(elem,params) {
		if (params.contestId)
			this.options.contestId = params.contestId;
		if (params.raceId)
			this.options.raceId = params.raceId;
		if (params.apiVersion)
			this.options.apiVersion = params.apiVersion;
		if (params.apiDomain)
			this.options.apiDomain = params.apiDomain;
		if (params.imgRootUrl)
			this.options.imgRootUrl = params.imgRootUrl;
		if (params.width)
			this.options.width = params.width;
		if (params.height)
			this.options.height = params.height;
		if (params.mode)
			this.options.mode = params.mode;
		if (params.mapWidget)
			this.options.mapWidget = params.mapWidget;
		if (params.mapOptions)
			this.options.mapOptions = params.mapOptions;
		if (params.isOnline)
			this.options.isOnline = params.isOnline;
		if (params.titleUrl)
			this.options.titleUrl = params.titleUrl;
		if (params.debug)
			this.options.debug = params.debug;
		this.rebuild();
		if (params.callback)
			params.callback(this);
		this.emit("domInit");
	}

	TrackerPageDebug.prototype.setOption = function(p,v) {
		this.options[p] = v;
	}

	TrackerPageDebug.prototype.rebuild = function() {
		var self = this;
		self.clear();
		self.width(self.options.width);
		self.height(self.options.height);
		self.imgRootUrl(self.options.imgRootUrl);
		self.mapWidget(self.options.mapWidget);
		self.mapOptions(self.options.mapOptions);
		self.isOnline(self.options.isOnline);
		self.titleUrl(self.options.titleUrl);
		self.debug(self.options.debug);

		if (self.isOnline()) self.server.setOption("isOnline",true);

		// Когда онлайн убираем хвосты 10 минутных треков, на реплее включаем
		self.tracksVisualMode(self.isOnline()?config.tracksVisualModeOnline:config.tracksVisualModeReplay);

		// Сначала проставляем mode из настроек виджета
		self.mode(self.options.mode);
		// Для данного mode создаем все окна и виджеты
		self.createWindows();
		// Теперь проставляем isReady, и созданные виджеты вставляются в DOM 
		self.isReady(!!self.options.raceId);

		if (self.isReady()) {
			self.loadRaceData(function(raceData) {
				if (self.map)
					self.map.update("static");
				if (self.mode() == "full") {
					self.loadUfosData(function() {
						self.playerInit();
						self.isLoaded(true);
						self.emit("loaded",raceData);
					});
				}
				else if (self.mode() == "retrieve") {
					self.loadUfosData(function() {
						self.retrieveInit();
						self.isLoaded(true);
						self.emit("loaded",raceData);
					});
				}
				else {
					self.isLoaded(true);
					self.emit("loaded",raceData);
				}
			});
		}
	}

	TrackerPageDebug.prototype.clear = function() {
		this.ufos([]);
		this.waypoints([]);
	}

	TrackerPageDebug.prototype.loadServerTime = function(callback) {
	  var self = this;
	  this.dataSource.get({
	    type:'serverTime',
	    callback:function(data){
	      self.serverKey(data.time * 1000);
	      if (callback && typeof callback == "function")
	        callback();
	    }
	  })
	};

	TrackerPageDebug.prototype.loadRaceData = function(callback) {
		var self = this;
		self.loading(true);
	    self.loadServerTime(function(){
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
	          if (self.mainMenu && data.titles)
	            self.mainMenu.setTitles(data.titles);
	          var waypoints2load = [];
	          if (data.waypoints) {
	            for (var i = 0; i < data.waypoints.length; i++) {
	              var w = new Waypoint(data.waypoints[i]);
	              waypoints2load.push(w);
	            }
	          }
	          self.waypoints(waypoints2load);
	          if (self.map)
	            self.map.calculateAndSetDefaultPosition();
	          if (callback && typeof callback == "function")
	            callback(data);
	        },
	        error: function(jqXHR,textStatus,errorThrown) {
	          self.emit("loadingError");
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
				var ufos2load = [];
				if (ufos) {
					for (var i = 0; i < ufos.length; i++) {
						var w = new Ufo(ufos[i]);
						ufos2load.push(w);
					}
				}
				self.ufos(ufos2load);
				self.loading(false);
				if (callback && typeof callback == "function")
					callback();
			},
			error: function(jqXHR,textStatus,errorThrown) {
				self.emit("loadingError");
			}
		});
	}

	TrackerPageDebug.prototype.resetUfosTracks = function() {
		this.ufos().forEach(function(ufo) {
			ufo.resetTrack();
		});
	}

	TrackerPageDebug.prototype.playerInit = function() {
		var self = this;
		var renderFrame = function(callback) {
			self.loading(true);
			self.currentDataSourceGetKey = self.currentKey();
			self.dataSource.get({
				type: "timeline",
				dt: self.currentDataSourceGetKey,
				timeMultiplier: self.playerSpeed(),
				dtStart: self.startKey(),
				isOnline: self.isOnline(),
//				mode: self.isCurrentlyOnline() ? "simple" : "linear",
				mode: self.isCurrentlyOnline() ? "simple" : "simple",
				callback: function(data,query) {
					if (query.dt != self.currentDataSourceGetKey) return;
					// в data ожидается массив с ключами - id-шниками пилотов и данными - {lat и lng} - текущее положение
					self.loading(false);
					self.ufos().forEach(function(ufo) {
						if (data && data[ufo.id()]) {
							rw = data[ufo.id()];
							ufo.alt(rw.alt);
							ufo.dist(rw.dist);
							ufo.gSpd(rw.gspd);
							ufo.vSpd(rw.vspd);
							ufo.noData(false);
							if (rw.position.lat && rw.position.lng) {
								ufo.noPosition(false);
								if (!ufo.position() || 
									!ufo.position().lat || 
									!ufo.position().lng ||
									Math.abs(rw.position.lat-ufo.position().lat) > 0.0000001 ||
									Math.abs(rw.position.lng-ufo.position().lng) > 0.0000001) {
									ufo.position({lat:rw.position.lat,lng:rw.position.lng,dt:rw.position.dt});
								}
								if (!ufo.track() || !ufo.track().dt || ufo.track().dt != rw.track.dt)
									ufo.track({lat:rw.track.lat,lng:rw.track.lng,dt:rw.track.dt});
							}
							else {
								ufo.noPosition(true);
							}
							if (rw.state && rw.state != ufo.state()) {
								ufo.state(rw.state);
							}
							if (rw.stateChangedAt)
								ufo.stateChangedAt(rw.stateChangedAt);
						}
						else
							ufo.noData(true);
					});
					if (_updateIconsRequired)
						self.map.updateIcons();
					_updateIconsRequired = false;
					self.map.update();
					if (callback)
						callback(data);
				}
			});
		}

		var _inRunCycle = false;
		var _currentKeyUpdatedAt = null;
		var _currentKey = null;
		var _runTimeout = null;
		var _updateIconsRequired = false;

		var run = function(callback,force) {
			if (_inRunCycle && !force) return;
			_inRunCycle = true;
			if (!_currentKeyUpdatedAt || force) {
				_currentKeyUpdatedAt = (new Date).getTime();
				_currentKey = self.currentKey();
				if (_runTimeout) clearTimeout(_runTimeout);
				_runTimeout = null;
			}
			renderFrame(function() {
				if (self.playerState() == "play") {
					_runTimeout = setTimeout(function() {
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
					},50);
				}
				else {
					_currentKeyUpdatedAt = null;
					_currentKey = null;
					_inRunCycle = false;
				}
				if (callback && typeof callback == "function")
					callback();
			});
		}

		var tableTimerHandle = null;
		var updateTableData = function() {
			self.ufos().forEach(function(ufo) {
				ufo.updateTableData();
			});
			self.ufosTable.sortTableRows();
		}
		var runTableData = function() {
			updateTableData();
			if (self.playerState() == "play") {
				if (tableTimerHandle)
					clearTimeout(tableTimerHandle);
				tableTimerHandle = setTimeout(runTableData,self.options.renderTableDataInterval);
			}
		}

		self.playerControl.on("change",function(v) {
			self.currentKey(v);
			self.resetUfosTracks();
			_updateIconsRequired = true;
			run(runTableData,true);
		});

		self.playerState.subscribe(function(state) {
			if (state == "play") {
				run(runTableData,true);
			}
		});

		if (self.isOnline()) {
			self.currentKey.subscribe(function(key) {
				var dt = Math.abs(key-self.serverKey());
				if (!self.isCurrentlyOnline() && dt < config.dtDiffReply)
					self.setLiveMode();
				else if (self.isCurrentlyOnline() && dt > config.dtDiffReply)
					self.setReplyMode(false);
			});

			if (self.endKey() < self.serverKey())
				self.setStartMode();
			else
				self.setLiveMode();	
			self.playerControl.enableOfflineNotification(true);
		}
		else {
			self.setReplyMode();
			self.playerState("play");
			self.playerSpeed(2);
			run(runTableData);
		}
	}

	TrackerPageDebug.prototype.setLiveMode = function() {
		if (!this.isOnline() || this.isCurrentlyOnline()) return;
		this.isCurrentlyOnline(true);
		if (this.playerControl) {
			this.playerState("play");
			this.playerSpeed(1);
			this.playerControl.emit("change",this.serverKey());
		}
	}

	TrackerPageDebug.prototype.setStartMode = function() {
		this.playerControl.emit("change",this.raceKey());
		this.disableLiveButton(true);
	}

	TrackerPageDebug.prototype.setReplyMode = function() {
		if (!this.isOnline() || !this.isCurrentlyOnline()) return;
		this.isCurrentlyOnline(false);
		this.resetUfosTracks();
	}

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

	TrackerPageDebug.prototype.templates = ["main"];

	return TrackerPageDebug;
});
