define([
	"jquery",
	"knockout",
	"utils",
	"google.maps",
	"./CanvasOverlay",
	"./DivOverlay",
	"./ShortWay",
	"./Waypoint",
	"./Ufo",
	"config",
	"walk"
],function(
	$,
	ko,
	utils,
	gmaps,
	CanvasOverlay,
	DivOverlay,
	ShortWay,
	Waypoint,
	Ufo,
	config,
	walk
){

	var GoogleMap = function(options) {
		var self = this;
		this.ufos = options.ufos;
		this.waypoints = options.waypoints;
		this.shortWay = options.shortWay;
		this.tracksVisualMode = options.tracksVisualMode;
		this.cylindersVisualMode = options.cylindersVisualMode;
		this.heightsVisualMode = options.heightsVisualMode;
		this.modelsVisualMode = options.modelsVisualMode;
		this.shortWayVisualMode = options.shortWayVisualMode;
		this.namesVisualMode = options.namesVisualMode;
		this.profVisualMode = options.profVisualMode;
		this.mode = options.mode;
		this.currentKey = options.currentKey;
		this.raceKey = options.raceKey;
		this.zoom = ko.observable(config.map.zoom);
		this.mapOptions = options.mapOptions;
		this.raceType = options.raceType;
		this.raceTypeOptions = options.raceTypeOptions;
		this.trackedUfoId = options.trackedUfoId;
		this.optdistance = options.optdistance;
		this.isDistanceMeasurerEnabled = options.isDistanceMeasurerEnabled;

		this.isReady = ko.observable(false);

		// Минимальный зум карты, при котором показывается переключатель prof/user режима подписи цилиндров
		this.waypointsVisualAutoMinZoom = config.canvas.waypointsVisualAutoMinZoom;

		this.mapWaypoints = [];
		ko.utils.sync({
			source: this.waypoints,
			target: this.mapWaypoints,
			onAdd: function(w) {
				self.update("static");
				self.update("static");
				return new Waypoint(w,self);
			}
		});

		this.mapUfos = [];
		ko.utils.sync({
			source: this.ufos,
			target: this.mapUfos,
			onAdd: function(ufo) {
				return new Ufo(ufo,self);
			},
			afterAdd: function() {
				self.update();
				self.update();				
			}
		});

		this.mapShortWay = null;
		this.shortWay.subscribe(function(w) {
			if (self.mapShortWay) self.mapShortWay.destroy();
			self.mapShortWay = new ShortWay(w,self);
		});

		this.mapOptions.subscribe(function(options) {
            if (!options) return;
            self.map.setOptions(options);
		});

		this.setProfVisualMode = function() {
			self.profVisualMode("prof");
		}
		this.setUserVisualMode = function() {
			self.profVisualMode("user");
		}
		this.switchDistanceMeasurer = function() {
			self.emit("switchDistanceMeasurer");
		}

		this.trackedUfoId.subscribe(function() {
			self.startUfoTracking();
		});

		this.tracksVisualMode.subscribe(function(){self.update();});
		this.cylindersVisualMode.subscribe(function(){self.update("static");});
		this.heightsVisualMode.subscribe(function(){self.update();});
		this.modelsVisualMode.subscribe(function(){self.updateIcons();self.update();});
		this.shortWayVisualMode.subscribe(function(){self.update("static");});
		this.namesVisualMode.subscribe(function(){self.updateIcons();self.update();});
		this.profVisualMode.subscribe(function(){self.update("static");});
	}

	GoogleMap.prototype.centerMap = function(position) {
		if (position.lat && position.lng && this.map)
			this.map.setCenter(new gmaps.LatLng(position.lat,position.lng));
	}

	GoogleMap.prototype.zoominMap = function(zoom) {
		if (zoom > 0 && this.map && this.zoom() < zoom)
			this.map.setZoom(zoom);
	}

	GoogleMap.prototype.prepareCoords = function(lat,lng) {
		return this.map.getProjection().fromLatLngToPoint(new gmaps.LatLng(lat,lng));
	}

	GoogleMap.prototype.openPopup = function(ufo) {
		this.closePopup();
		this._popup = this.popupOverlay.createPopup();
		this._popup._ufo = ufo;
		this._popup.setHTML(this.templates.popup);
		ko.applyBindings(ufo,this._popup.getContainer());
		this.updatePopup();
		// обновляем карту чтобы пропало имя и подпись высоты у пилота, у которого открыт попап
		ufo.updateIconRequired = true;
		this.update();
	}

	GoogleMap.prototype.updatePopup = function() {
		if (!this._popup) return;
		var u = this._popup._ufo;
		if (!u.preparedCoords || u.prepareCoordsRequired) {
			u._prepareCoords();
			u.prepareCoordsRequired = false;
		}
		var p = this.popupOverlay.abs2rel(u.preparedCoords,this.zoom());
		this._popup.setPosition(p.x+u.iconSize/2,p.y-u._height-u.iconSize);
	}

	GoogleMap.prototype.closePopup = function() {
		if (this._popup) {
			var u = this._popup._ufo;
			u.updateIconRequired = true;
			this._popup.destroy();
			delete this._popup;
			// обновляем карту, чтобы имя пилота и подпись высоты появились обратно
			this.update();
		}		
	}

	GoogleMap.prototype.findUfoById = function($id) {
		for (var i = 0; i < this.mapUfos.length; i++)
			if (this.mapUfos[i].id() == id)
				return this.mapUfos[i];
		return null;
	}

	GoogleMap.prototype.openPopupById = function(id) {
		var ufo = this.findUfoById(id);
		ufo ? this.openPopup(ufo) : this.closePopup();
	}

	GoogleMap.prototype.hasPopup = function(ufo) {
		return this._popup && this._popup._ufo == ufo;
	}

	GoogleMap.prototype.calculateAndSetDefaultPosition = function() {
		if (!this.map || !this.shortWay()) return;
		if (this.raceType() == "opendistance") {
			this.map.setCenter(new gmaps.LatLng(this.shortWay()[0].lat,this.shortWay()[0].lng));
			this.map.setZoom(config.canvas.openDistanceDefaultZoom);
			return;
		}
		var bounds = new gmaps.LatLngBounds();
		for (var i = 0, l = this.shortWay().length; i < l; i++) {
			w = this.shortWay()[i];
			bounds.extend(new gmaps.LatLng(w.lat,w.lng));
		}
		this.map.fitBounds(bounds);
		// Допиливание неточностей fitBounds, в большинстве случаев зум можно увеличить на 1 и все равно все помещается
		if (!this.map.getProjection || !this.map.getProjection()) return;
		var boundsNE = this.map.getProjection().fromLatLngToPoint(bounds.getNorthEast());
		var boundsSW = this.map.getProjection().fromLatLngToPoint(bounds.getSouthWest());
		var boundsH = Math.abs(boundsNE.y-boundsSW.y);
		var boundsW = Math.abs(boundsNE.x-boundsSW.x);
		var b = this.map.getBounds();
		var bNE = this.map.getProjection().fromLatLngToPoint(b.getNorthEast());
		var bSW = this.map.getProjection().fromLatLngToPoint(b.getSouthWest());
		var bH = Math.abs(bNE.y-bSW.y);
		var bW = Math.abs(bNE.x-bSW.x);
		if (boundsH*2<bH && boundsW*2<bW)
			this.map.setZoom(this.map.getZoom()+1);
	}

	GoogleMap.prototype._updateDynamicCanvas = function(canvas) {
		// В самом низу рисуются треки
		if (this.tracksVisualMode() != "off") {
			this.mapUfos.forEach(function(ufo) {
				ufo.render(canvas,"track");
			},this);
		}
		// Затем - ножки не подсвеченных и не выбранных пилотов
		var highlightedUfos = [];
		var checkedUfos = [];
		this.mapUfos.forEach(function(ufo) {
			if (ufo.highlighted() || ufo.highlightedLevel()>0)
				highlightedUfos.push(ufo);
			else if (ufo.checked())
				checkedUfos.push(ufo);
			else
				ufo.render(canvas,"elev");
		},this);

		var overlayZ = 1;

		// Затем иконки не подсвеченных и не выбранных пилотов, и вместе с иконками двигаем overlay
		this.mapUfos.forEach(function(ufo) {
			if (!ufo.highlighted() && !ufo.checked()) {
				ufo.render(canvas,"icon");
				ufo._overlayZ = overlayZ++;
				ufo.render(canvas,"overlay");
			}
		},this);
		if (checkedUfos.length > 0) {
			// Затем ножки выбранных пилотов
			checkedUfos.forEach(function(ufo) {
				ufo.render(canvas,"elev");
			});
			// Затем иконки выбранных пилотов, и вместе с иконками двигаем overlay
			checkedUfos.forEach(function(ufo) {
				ufo.render(canvas,"icon");
				ufo._overlayZ = overlayZ++;
				ufo.render(canvas,"overlay");
			});
		}
		if (highlightedUfos.length > 0) {
			// Затем подсветки подсвеченных пилотов
			highlightedUfos.forEach(function(ufo) {
				ufo.render(canvas,"highlight");
			});
			// Затем ножки подсвеченных пилотов
			highlightedUfos.forEach(function(ufo) {
				ufo.render(canvas,"elev");
			});
			// Затем иконки подсвеченных пилотов
			highlightedUfos.forEach(function(ufo) {
				ufo.render(canvas,"icon");
				ufo._overlayZ = overlayZ++;
				ufo.render(canvas,"overlay");
			});
		}
	}

	GoogleMap.prototype._updateStaticCanvas = function(canvas) {
		var drawOrder = {}, drawOrderKeys = [];
		this.mapWaypoints.forEach(function(waypoint,i) {
			var order = config.canvas.waypoints.drawOrder[waypoint.type()] || 0;
			if (!drawOrder[order]) {
				drawOrder[order] = [];
				drawOrderKeys.push(order);
			}
			drawOrder[order].push(i);
		});
		drawOrderKeys.sort();
		for (var i = 0; i < drawOrderKeys.length; i++) {
			var order = drawOrderKeys[i];
			if (drawOrder.hasOwnProperty(order) && drawOrder[order].length > 0)
				for (var j = 0; j < drawOrder[order].length; j++)
					this.mapWaypoints[drawOrder[order][j]].render(canvas,"waypoint");
		}
		if (this.mapShortWay) {
			this.mapShortWay.render(canvas,"line");
			this.mapShortWay.render(canvas,"arrows");
			this.mapShortWay.render(canvas,"bearing");
			this.mapShortWay.render(canvas,"labels");
		}
		this.mapWaypoints.forEach(function(waypoint) {
			waypoint.render(canvas,"label");
		},this);
	}

	GoogleMap.prototype.updateIcons = function() {
		this.mapUfos.forEach(function(ufo) {
			ufo.updateIconRequired = true;
		},this);
	}

	GoogleMap.prototype.update = function(type,force) {
		var self = this;
		var canvas = type=="static" ? this.staticCanvasOverlay : this.canvasOverlay;
		if (!canvas) return;

		if (!force && canvas._updating) {
			canvas._updateRequired = true;
			return;
		}
		canvas._updating = true;
		canvas._updateRequired = false;
		clearTimeout(canvas._updatingTimeout);
		canvas.clear();
		if (type=="static") this._updateStaticCanvas(canvas);
		else this._updateDynamicCanvas(canvas);
		canvas._updatingTimeout = setTimeout(function() {
			canvas._updating = false;
			if (canvas._updateRequired)
				self.update(type);
		},100);
	}

	GoogleMap.prototype.updateAll = function() {
        this.update("static",true);
        this.update("dynamic",true);
        this.updatePopup();
	}

	GoogleMap.prototype.relayoutOverlays = function(debug) {
		if (!this.isReady()) return;
        this.staticCanvasOverlay.relayout("staticCanvasOverlay");
        this.canvasOverlay.relayout("canvasOverlay");
        this.mouseOverlay.relayout("mouseOverlay");
        this.popupOverlay.relayout("popupOverlay");
	}

/*
	GoogleMap.prototype.domInit = function(elem,params) {
		var self = this;
		setTimeout(function() {
			self._domInit.call(self,elem,params);
		},1000);
	}
*/

	GoogleMap.prototype.addCustomMapType = function() {
		var terrainMapType = this.map.mapTypes.get("terrain");
		var hybridMapType = this.map.mapTypes.get("hybrid");
		var terrainZoom = terrainMapType.maxZoom<hybridMapType.maxZoom?1:0;
		var hybridZoom = terrainMapType.maxZoom<hybridMapType.maxZoom?0:1;
		this.map.mapTypes.set("terrainPlus",$.extend({},terrainMapType,{maxZoom:terrainMapType.maxZoom+terrainZoom,originalMaxZoom:terrainMapType.maxZoom,maxZoomIncreased:terrainZoom>0}));
		this.map.mapTypes.set("hybridPlus",$.extend({},hybridMapType,{maxZoom:hybridMapType.maxZoom+hybridZoom,originalMaxZoom:hybridMapType.maxZoom,maxZoomIncreased:hybridZoom>0}));
	}

	GoogleMap.prototype.centerMapOnUfoPosition = function(id) {
		var self = this;
		if (!id) return false;
		var centered = false;
		this.mapUfos.forEach(function(ufo) {
			if (ufo.id() == id) {
				self.centerMap(ufo.position());
				centered = true;
			}
		});
		return centered;
	}

	GoogleMap.prototype.startUfoTracking = function() {
		var self = this;
		if (this._trackingTimeout) {
			clearTimeout(this._trackingTimeout);
		}
		if (!self.trackedUfoId()) return;
		if (this.centerMapOnUfoPosition(self.trackedUfoId())) {
			this._trackingTimeout = setTimeout(function() {
				self.startUfoTracking();
			},config.trackingTimeout);
		}
	}

	GoogleMap.prototype.domInit = function(elem,params) {
		var self = this;
		var div = ko.virtualElements.firstChild(elem);
		while(div && div.nodeType != 1)
			div = ko.virtualElements.nextSibling(div);
		ko.virtualElements.prepend(elem,div);

		this.map = new gmaps.Map(div,{
			zoom: config.map.zoom,
			center: new gmaps.LatLng(config.map.center.lat,config.map.center.lng),
			mapTypeId: "terrainPlus",
			mapTypeControlOptions: {
				mapTypeIds: ["terrainPlus","hybridPlus",gmaps.MapTypeId.ROADMAP,gmaps.MapTypeId.SATELLITE],
				 style: gmaps.MapTypeControlStyle.DROPDOWN_MENU
			}
		});

	   	var w = walk();
		w.step(function(step){self.staticCanvasOverlay = new CanvasOverlay({map:self.map,onAdd:function(){step.next();}});});
		w.step(function(step){self.canvasOverlay = new CanvasOverlay({map:self.map,onAdd:function(){step.next();}});});
		w.step(function(step){self.mouseOverlay = new DivOverlay({map:self.map,z:2,onAdd:function(){step.next();}});});
		w.step(function(step){self.popupOverlay = new DivOverlay({map:self.map,z:3,onAdd:function(){step.next();}});});
		w.step(function(step) {
	        gmaps.event.addListenerOnce(self.map,"idle",function() {
	        	step.next();
	        });
	    });
		w.wait(function() {
			self.addCustomMapType();
			self.isReady(true);
			self.relayoutOverlays();
			self.updateIcons();
			self.updateAll();
			self.emit("ready",self);
		});

		gmaps.event.addListener(this.map,"bounds_changed",function() {
			self.relayoutOverlays();
			self.updateAll();
		});

		// перегенерация иконок нужна чтобы в зависимости от зума рисовать или нет подписи
		// переключаем режим карты на граничном зуме
		// zoom_changed глючный, срабатывает до того, как сработает изменение границ, поэтому изменение границ и отрисовка подхватывается bounds_changed-событием, которое наступает позже
		gmaps.event.addListener(this.map,"zoom_changed",function() {
			self.zoom(self.map.getZoom());
            self.updateIcons();
            var maxZoomTerrain = self.map.mapTypes.get("terrainPlus") ? self.map.mapTypes.get("terrainPlus").maxZoom : 0;
            var maxZoomHybrid = self.map.mapTypes.get("hybridPlus") ? self.map.mapTypes.get("hybridPlus").maxZoom : 0;
            if (self.map.getMapTypeId() == "terrainPlus" && self.zoom() == maxZoomTerrain && maxZoomTerrain < maxZoomHybrid)
            	self.map.setMapTypeId("hybridPlus");
            if (self.map.getMapTypeId() == "hybridPlus" && self.zoom() == maxZoomHybrid && maxZoomHybrid < maxZoomTerrain)
            	self.map.setMapTypeId("terrainPlus");
		});

		// если вручную меняем тип карты и максимальный зум нового типа меньше текущего, ставится максимальный, но на него нет данных, его нужно уменьшить на 1
		gmaps.event.addListener(this.map,"maptypeid_changed",function() {
			var mapType = self.map.mapTypes.get(self.map.getMapTypeId());
			if (mapType.maxZoomIncreased && self.zoom() > mapType.originalMaxZoom) 
				self.map.setZoom(mapType.originalMaxZoom);
		});

		// отключить слежение за пилотом при перетаскивании карты
		gmaps.event.addListener(this.map,"dragstart",function() {
			self.trackedUfoId(null);
		});

		// скрыть попап при клике на карту
		gmaps.event.addListener(this.map,"click",function() {
			self.closePopup();
		});

        //Отключить зум контрол для тач-устройств
        if("ontouchstart" in document.documentElement) {
        	this.mapOptions($.extend(this.mapOptions(),{zoomControl:false}));
        }

		// активация зума колесом мыши после клика на карту (нужно в превью)
		if (this.mapOptions().activateScrollWheelOnClick && !this.mapOptions().scrollwheel) {
			gmaps.event.addListenerOnce(this.map,"mousedown",function() {
				self.mapOptions($.extend(self.mapOptions(),{scrollwheel:true}));
			});
			gmaps.event.addListenerOnce(this.map,"click",function() {
				self.mapOptions($.extend(self.mapOptions(),{scrollwheel:true}));
			});
		}

		this.mapOptions.valueHasMutated();
	}
	
	GoogleMap.prototype.domDestroy = function(elem,params) {
		delete this.map;
	}

	GoogleMap.prototype.templates = ["main","popup"];

	return GoogleMap;
});
