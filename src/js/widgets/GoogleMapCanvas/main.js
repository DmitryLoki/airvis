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
		this.cookiesEnabled = options.cookiesEnabled;

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

		this.tracksVisualMode.subscribe(function(){self.destroyTracks();self.updateAndRedraw();});
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

	GoogleMap.prototype.switchPopup = function(ufo) {
		if (this._popup) {
			var u = this._popup._ufo;
			u.updateIconRequired = true;
			this._popup.destroy();
			delete this._popup;
		}
		if (ufo) {
			this._popup = this.popupOverlay.createPopup();
			this._popup._ufo = ufo;
			this.updatePopup();
			this._popup.setHTML(this.templates.popup);
			ko.applyBindings(ufo,this._popup.getContainer());
			// обновляем карту чтобы пропало имя и подпись высоты у пилота, у которого открыт попап
			ufo.updateIconRequired = true;
		}
		this.update();
	}

	GoogleMap.prototype.updatePopup = function() {
		if (!this._popup || !this._popup._ufo) return;
		if (!this._popup._ufo.visible() || this._popup._ufo.noData() || this._popup._ufo.noPosition()) 
			return this.switchPopup();
		var p = this._popup._ufo.getPopupPosition(this.popupOverlay);
		this._popup.setPosition(p.x,p.y);
	}

	GoogleMap.prototype.findUfoById = function($id) {
		for (var i = 0; i < this.mapUfos.length; i++)
			if (this.mapUfos[i].id() == id)
				return this.mapUfos[i];
		return null;
	}

	GoogleMap.prototype.openPopupById = function(id) {
		this.switchPopup(this.findUfoById(id));
	}

	GoogleMap.prototype.hasPopup = function(ufo) {
		return this._popup && this._popup._ufo == ufo;
	}

	GoogleMap.prototype.savePosition = function() {
		var self = this;
		if (!this.map || !this.isReady() || !this.shortWay() || !this.cookiesEnabled()) return;
		if (this._savingPostion) {
			this._requireSavePosition = true;
			return;
		}
		this._savingPostion = true;
		this._requireSavePosition = false;
		var c = this.map.getCenter();
		$.cookie("mapPosition",c.lat() + "," + c.lng() + "," + this.zoom() + "," + this.map.getMapTypeId());
		setTimeout(function() {
			self._savingPostion = false;
			if (self._requireSavePosition)
				self.savePosition();
		},1000);
	}

	GoogleMap.prototype.restorePosition = function() {
		if (!this.map || !this.isReady() || !this.cookiesEnabled()) return false;
		var a = ($.cookie("mapPosition")||"").split(/,/);
		if (!a || a.length!=4) return false;
		this.map.setMapTypeId(a[3]);
		this.map.setCenter(new gmaps.LatLng(a[0],a[1]));
		this.map.setZoom(Math.floor(a[2]));
		return true;
	}

	GoogleMap.prototype.calculateAndSetDefaultPosition = function() {
		if (!this.map || !this.shortWay()) return;
		if ($.cookie("mapPosition") && this.restorePosition()) return;
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

	GoogleMap.prototype._updateDynamicCanvas = function() {
		var self = this;
		var overlayZ = 1;

		// Треки будем рисовать на собственном канвасе. Полные треки рисуются даже если tracksVisualMode==off
		if (this.tracksVisualMode() == "off" && this.updateStaticTracksRequired) {
			this.tracksOverlay.clear();
			this.mapUfos.forEach(function(ufo) {
				if (ufo.fullTrackEnabled()) {
					ufo.resetTrack();
					ufo.render(self.tracksOverlay,"staticTrackUpdate");
				}
			});
			this.updateStaticTracksRequired = false;
		}

		// Дальше работаем с обычными треками. При этом полные треки для нас не отличаются от обычных за исключением того, что от них не отрезаем начало в режиме 5min
		if (this.tracksVisualMode() != "off") {
			// в режиме 5min проверяем, не пора ли удалить начала треков. удаляем раз в 10сек.
			if (!this.updateStaticTracksRequired && this.tracksVisualMode()=="5min") {
				var d = (new Date).getTime();
				if (!this.updateStaticTracksRequiredLast || d-this.updateStaticTracksRequiredLast>10000) {
					this.updateStaticTracksRequiredLast = d;
					this.mapUfos.forEach(function(ufo) {
						if (!ufo.fullTrackEnabled() && ufo.trackStartChanged(self.currentKey()-300000)) {
							ufo.cutTrackStart(self.currentKey()-300000);
							self.updateStaticTracksRequired = true;
						}
					});
				}
			}
			if (this.updateStaticTracksRequired) {
				this.tracksOverlay.clear();
			}
			this.mapUfos.forEach(function(ufo) {
				if (self.updateStaticTracksRequired)
					ufo.resetTrack();
				ufo.render(self.tracksOverlay,"staticTrackUpdate");
			});
			this.updateStaticTracksRequired = false;
		}

		this.canvasOverlay.clear();

		// Рисуем кусочек трека от последней статичной точки до параплана
		if (this.tracksVisualMode() !== "off") {
			this.mapUfos.forEach(function(ufo) {
				ufo.render(self.canvasOverlay,"trackEnd");
			});
		}
		// Затем - ножки не подсвеченных и не выбранных пилотов
		var highlightedUfos = [];
		var checkedUfos = [];
		this.mapUfos.forEach(function(ufo) {
//			if (ufo.highlighted() || ufo.highlightedLevel()>0)
			if (ufo.highlighted())
				highlightedUfos.push(ufo);
			else if (ufo.checked())
				checkedUfos.push(ufo);
			else
				ufo.render(self.canvasOverlay,"elev");
		});
		// Затем иконки не подсвеченных и не выбранных пилотов, и вместе с иконками двигаем overlay
		this.mapUfos.forEach(function(ufo) {
			if (!ufo.highlighted() && !ufo.checked()) {
				ufo.render(self.canvasOverlay,"icon");
				ufo._overlayZ = overlayZ++;
				ufo.render(self.canvasOverlay,"overlay");
			}
		});
		if (checkedUfos.length > 0) {
			// Затем ножки выбранных пилотов
			checkedUfos.forEach(function(ufo) {
				ufo.render(self.canvasOverlay,"elev");
			});
			// Затем иконки выбранных пилотов, и вместе с иконками двигаем overlay
			checkedUfos.forEach(function(ufo) {
				ufo.render(self.canvasOverlay,"icon");
				ufo._overlayZ = overlayZ++;
				ufo.render(self.canvasOverlay,"overlay");
			});
		}
		if (highlightedUfos.length > 0) {
			// Затем подсветки подсвеченных пилотов
			highlightedUfos.forEach(function(ufo) {
				ufo.render(self.canvasOverlay,"highlight");
			});
			// Затем ножки подсвеченных пилотов
			highlightedUfos.forEach(function(ufo) {
				ufo.render(self.canvasOverlay,"elev");
			});
			// Затем иконки подсвеченных пилотов
			highlightedUfos.forEach(function(ufo) {
				ufo.render(self.canvasOverlay,"icon");
				ufo._overlayZ = overlayZ++;
				ufo.render(self.canvasOverlay,"overlay");
			});
		}
		// все отрисовали, все координаты готовы. Если открыт попап, передвинем его
		this.updatePopup();
	}

	GoogleMap.prototype._updateStaticCanvas = function() {
		var drawOrder = {}, drawOrderKeys = [];

		this.staticCanvasOverlay.clear();

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
					this.mapWaypoints[drawOrder[order][j]].render(this.staticCanvasOverlay,"waypoint");
		}
		if (this.mapShortWay) {
			this.mapShortWay.render(this.staticCanvasOverlay,"line");
			this.mapShortWay.render(this.staticCanvasOverlay,"arrows");
			this.mapShortWay.render(this.staticCanvasOverlay,"bearing");
			this.mapShortWay.render(this.staticCanvasOverlay,"labels");
		}
		this.mapWaypoints.forEach(function(waypoint) {
			waypoint.render(this.staticCanvasOverlay,"label");
		},this);
	}

	GoogleMap.prototype.updateIcons = function() {
		this.mapUfos.forEach(function(ufo) {
			ufo.updateIconRequired = true;
		},this);
	}


	GoogleMap.prototype.update = function(type,force) {
		var self = this;
		var s = type ? type + "Canvas" : "usualCanvas";
		if (this["_updating"+s] && !force) {
			this["_updateRequired"+s] = true;
			return;
		}
		this["_updating"+s] = true;
		this["_updateRequired"+s] = false;
		clearTimeout(this["_updatingTimeout"+s]);
		if (type == "static") this._updateStaticCanvas();
		else this._updateDynamicCanvas();
		this["_updatingTimeout"+s] = setTimeout(function() {
			self["_updating"+s] = false;
			if (self["_updateRequired"+s])
				self.update(type);
		},100);
	}

	GoogleMap.prototype.updateAndRedraw = function(type,force) {
		this.updateStaticTracksRequired = true;
		this.update(type,force);
	}

	GoogleMap.prototype.destroyTracks = function() {
		this.mapUfos.forEach(function(ufo) {
			ufo.destroyTrack();
		});
		this.updateStaticTracksRequired = true;
	}

	GoogleMap.prototype.updateAll = function() {
        this.update("static",true);
        this.updateAndRedraw("dynamic",true);
	}

	GoogleMap.prototype.relayoutOverlays = function(debug) {
		if (!this.isReady()) return;
        this.staticCanvasOverlay.relayout();
        this.canvasOverlay.relayout();
        this.tracksOverlay.relayout();
        this.mouseOverlay.relayout();
        this.popupOverlay.relayout();
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
		w.step(function(step){self.staticCanvasOverlay = new CanvasOverlay({map:self.map,z:1,onAdd:function(){step.next();}});});
		w.step(function(step){self.tracksOverlay = new CanvasOverlay({map:self.map,z:2,onAdd:function(){step.next();}});});
		w.step(function(step){self.canvasOverlay = new CanvasOverlay({map:self.map,z:3,onAdd:function(){step.next();}});});
		w.step(function(step){self.mouseOverlay = new DivOverlay({map:self.map,z:4,onAdd:function(){step.next();}});});
		w.step(function(step){self.popupOverlay = new DivOverlay({map:self.map,z:5,onAdd:function(){step.next();}});});
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
			self.savePosition();
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
			self.savePosition();
		});

		// отключить слежение за пилотом при перетаскивании карты
		gmaps.event.addListener(this.map,"dragstart",function() {
			self.trackedUfoId(null);
		});

		// скрыть попап при клике на карту
		gmaps.event.addListener(this.map,"click",function() {
			self.switchPopup();
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
