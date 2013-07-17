define(["jquery","knockout","utils","EventEmitter","google.maps","./CanvasOverlay","config"],function($,ko,utils,EventEmitter,gmaps,CanvasOverlay,config) {

	var GoogleMap = function(options) {
		var self = this;
		this.config = config;
		this.ufos = options.ufos;
		this.waypoints = options.waypoints;
		this.shortWay = options.shortWay;
		this.tracksVisualMode = options.tracksVisualMode;
		this.cylindersVisualMode = options.cylindersVisualMode;
		this.modelsVisualMode = options.modelsVisualMode;
		this.shortWayVisualMode = options.shortWayVisualMode;
		this.namesVisualMode = options.namesVisualMode;
		this.profVisualMode = options.profVisualMode;
		this.currentKey = options.currentKey;
		this.raceKey = options.raceKey;
		this.playerState = options.playerState;
		this.imgRootUrl = options.imgRootUrl;
		this.zoom = ko.observable(config.map.zoom);
		this.isReady = ko.observable(false);
		this.mapOptions = options.mapOptions;
		this.mode = options.mode;
		this.activateMapScroll = ko.observable(false);

		this.mapWaypoints = [];
		this.waypoints.subscribe(function(waypoints) {
			if (!self.isReady()) return;
			var rev1 = {}, rev2 = {};
			for (var i = 0; i < waypoints.length; i++)
				rev1[waypoints[i].id()] = i;
			for (var i = 0; i < self.mapWaypoints.length; i++)
				rev2[self.mapWaypoints[i].id()] = i;
			for (var i = 0; i < waypoints.length; i++) {
				if (rev2[waypoints[i].id()] == null) {
					self.mapWaypoints.push(self.createWaypoint(waypoints[i]));
					rev2[waypoints[i].id()] = self.mapWaypoints.length - 1;
				}
			}
			for (var i = 0; i < self.mapWaypoints.length; i++) {
				if (rev1[self.mapWaypoints[i].id()] == null) {
					self.destroyWaypoint(self.mapWaypoints[i]);
					self.mapWaypoints.splice(i,1);
					i--;
				}
			}
		});

		this.mapUfos = [];
		this.ufos.subscribe(function(ufos) {
			if (!self.isReady()) return;
			var rev1 = {}, rev2 = {};
			for (var i = 0; i < ufos.length; i++)
				rev1[ufos[i].id()] = i;
			for (var i = 0; i < self.mapUfos.length; i++)
				rev2[self.mapUfos[i].id()] = i;
			for (var i = 0; i < ufos.length; i++) {
				if (rev2[ufos[i].id()] == null) {
					self.mapUfos.push(self.createUfo(ufos[i]));
					rev2[ufos[i].id()] = self.mapUfos.length - 1;
				}
			}
			for (var i = 0; i < self.mapUfos.length; i++) {
				if (rev1[self.mapUfos[i].id()] == null) {
					self.detroyUfo(self.mapUfos[i]);
					self.mapUfos.splice(i,1);
					i--;
				}
			}
		});

		this.mapShortWay = null;
		this.shortWay.subscribe(function(w) {
			if (!self.isReady()) return;
			self.destroyShortWay(self.mapShortWay);
			self.mapShortWay = self.createShortWay(w);
		});

		this.mapOptions.subscribe(function(options) {
			if (!self.isReady() || !options) return;
			self.map.setOptions(options);
			self.activateMapScroll(options.scrollwheel);
		});

		this.activateMapScroll.subscribe(function(b) {
			if (!self.isReady()) return;
			self.map.setOptions({scrollwheel:b});
		});

		this.setProfVisualMode = function() {
			self.profVisualMode("prof");
		}
		this.setUserVisualMode = function() {
			self.profVisualMode("user");
		}
	}

	GoogleMap.prototype.prepareCoords = function(lat,lng) {
		return this.map.getProjection().fromLatLngToPoint(new gmaps.LatLng(lat,lng));
	}

	GoogleMap.prototype.createWaypoint = function(data) {
		var self = this;
		var w = {
			id: data.id,
			name: data.name,
			type: data.type,
			center: data.center,
			radius: data.radius,
			openKey: data.openKey,
			shortWay: data.shortWay
		}

		w.spherePoint = ko.computed(function() {
			if (!w.center() || !w.radius()) return null;
			var rp = gmaps.geometry.spherical.computeOffset(new gmaps.LatLng(w.center().lat,w.center().lng),w.radius(),90);
			return self.map.getProjection().fromLatLngToPoint(rp);
		});

		// Здесь заводим еще переменную, иначе computed каждый тик вызывает свой subscribe
		w.stateUpdate = ko.observable();
		w.state = ko.computed(function() {
			var v = self.mode() == "simple" ? "opened" : (w.openKey() < self.currentKey() ? "opened" : "closed");
			w.stateUpdate(v);
			return v;
		});
		w.stateUpdate.subscribe(function(state) {
			self.update("static");
		});

		w.render = function(co) {
			if (self.cylindersVisualMode() == "off") return;
			var coords = self.prepareCoords(w.center().lat,w.center().lng);
			var p = co.abs2rel(coords,self.zoom());
			var sp = co.abs2rel(w.spherePoint(),self.zoom());
			var r = Math.sqrt(Math.pow(p.x-sp.x,2)+Math.pow(p.y-sp.y,2));
			if (co.inViewport(p,r)) {
				var context = co.getContext();
				var color = config.canvas.waypoints.colors[w.type()] ? config.canvas.waypoints.colors[w.type()][w.state()] : config.canvas.waypoints.colors["default"][w.state()];

				var opacity = 0, h = co.getHeight()/4;
				if (r < h) opacity = config.canvas.waypoints.maxOpacity;
				else if (r > 2*h) opacity = config.canvas.waypoints.minOpacity;
				else opacity = config.canvas.waypoints.maxOpacity - (r-h)/h*(config.canvas.waypoints.maxOpacity-config.canvas.waypoints.minOpacity);
				color = color.replace(/opacity/,opacity);

				co.setProperties($.extend({},config.canvas.waypoints.basic,{fillStyle:color}));
				context.beginPath();
				context.arc(p.x,p.y,r,0,2*Math.PI);
				context.stroke();
				if (self.cylindersVisualMode() == "full")
					context.fill();
			}
		}

		w.renderLabels = function(co) {
			if (self.cylindersVisualMode() == "off") return;
			var coords = self.prepareCoords(w.center().lat,w.center().lng);
			var p = co.abs2rel(coords,self.zoom());
			var sp = co.abs2rel(w.spherePoint(),self.zoom());
			var r = Math.sqrt(Math.pow(p.x-sp.x,2)+Math.pow(p.y-sp.y,2));
			if (co.inViewport(p,r)) {
				var context = co.getContext();
				var color = config.canvas.waypoints.colors[w.type()] ? config.canvas.waypoints.colors[w.type()][w.state()] : config.canvas.waypoints.colors["default"][w.state()];
				color = color.replace(/opacity/,config.canvas.waypoints.maxOpacity);
				var textColor = config.canvas.waypoints.colors[w.type()] ? config.canvas.waypoints.colors[w.type()][w.state()+"Text"] : config.canvas.waypoints.colors["default"][w.state()+"Text"];
				co.setProperties($.extend({},config.canvas.waypoints.basic,{fillStyle:color}));
				var center = co.getCenter();
				var angle = Math.atan2(p.y-center.y,p.x-center.x);
				if (w.id()%2) angle += Math.PI;
				var r1 = r;
				var p1 = {x:p.x-r1*Math.cos(angle),y:p.y-r1*Math.sin(angle)};
				if (!co.inViewport(p1,0)) {
					angle -= Math.PI;
					var p1 = {x:p.x-r1*Math.cos(angle),y:p.y-r1*Math.sin(angle)};
				}
				var r2 = r + config.canvas.waypoints.titleSize;
				var p2 = {x:p.x-r2*Math.cos(angle),y:p.y-r2*Math.sin(angle)};
				var r3 = r + config.canvas.waypoints.titleSize - config.canvas.waypoints.titleRadius;
				var p3 = {x:p.x-r3*Math.cos(angle),y:p.y-r3*Math.sin(angle)};

				var title = config.waypointsNames[w.type()] ? config.waypointsNames[w.type()] : "";

				if (self.profVisualMode() == "user" && title.length == 0) return;

				if (self.profVisualMode() == "prof") {
					if (w.name().length > 0)
						title += (title.length>0?" / ":"") + w.name();
					var r = w.radius();
					if (r >= 1000) r = Math.floor(r/100)/10 + "km";
					else r = r + "m";
					title += (title.length>0?" / ":"") + "R " + r;
				}

				context.beginPath();
				context.moveTo(p1.x,p1.y);
				context.lineTo(p3.x,p3.y);
				context.stroke();
				var tl = context.measureText(title).width;
				var tr = config.canvas.waypoints.titleRadius;
				var p4 = {x:p2.x,y:p2.y};
				if (p2.x < p1.x)
					p4.x -= tl;
				context.beginPath();
				context.moveTo(p4.x,p4.y+tr);
				context.arc(p4.x,p4.y,tr,Math.PI/2,Math.PI*3/2);
				context.lineTo(p4.x+tl,p4.y-tr);
				context.arc(p4.x+tl,p4.y,tr,-Math.PI/2,Math.PI/2);
				context.lineTo(p4.x,p4.y+tr);
				context.stroke();
				context.fill();
				co.setProperties($.extend({},config.canvas.waypoints.basic,{fillStyle:textColor}));
				context.fillText(title,p4.x,p4.y+config.canvas.waypoints.titleOffset);
			}
		}
		return w;
	}

	GoogleMap.prototype.destroyWaypoint = function(w) {
	}

	GoogleMap.prototype.createUfo = function(data) {
		var self = this;
		var u = {
			id: data.id,
			name: data.name,
			color: data.color,
			state: data.state,
			stateChangedAt: data.stateChangedAt,
			position: data.position,
			track: data.track,
			visible: data.visible,
			trackVisible: data.trackVisible,
			noData: data.noData,
			trackData: []
		}

		var setProperties = function(context,properties) {
			if (!context) return;
			for (var i in properties)
				if (properties.hasOwnProperty(i))
					context[i] = properties[i];
		}

		u.prepareIcon = function(co) {
			u.iconSize = config.canvas.ufos.sizes[self.modelsVisualMode()] || config.canvas.ufos.sizes["default"];
			u.iconCenter = {x:u.iconSize,y:u.iconSize};
			u.iconCanvas = document.createElement("canvas");
			u.iconCanvas.width = 100;
			u.iconCanvas.height = u.iconSize*2;
			var ic = u.iconCanvas.getContext("2d");
			// Тень от иконки
			ic.beginPath();
			setProperties(ic,$.extend({},config.canvas.ufos.basiс,config.canvas.ufos.shadow));
			ic.moveTo(u.iconCenter.x-u.iconSize/4,u.iconCenter.y);
			ic.lineTo(u.iconCenter.x,u.iconCenter.y-u.iconSize/10);
			ic.lineTo(u.iconCenter.x+u.iconSize/4,u.iconCenter.y);
			ic.lineTo(u.iconCenter.x,u.iconCenter.y+u.iconSize/10);
			ic.lineTo(u.iconCenter.x-u.iconSize/4,u.iconCenter.y);
			ic.fill();
			// Иконка
			ic.beginPath();
			setProperties(ic,$.extend({},config.canvas.ufos.basic,config.canvas.ufos.icons[u.state()] || config.canvas.ufos.icons["default"]));
			ic.moveTo(u.iconCenter.x,u.iconCenter.y);
			if (u.state() == "landed") {
				ic.lineTo(u.iconCenter.x-u.iconSize/2,u.iconCenter.y-u.iconSize*Math.sqrt(3)/2);
				ic.lineTo(u.iconCenter.x+u.iconSize/2,u.iconCenter.y-u.iconSize*Math.sqrt(3)/2);
			}
			else {
				ic.arc(u.iconCenter.x,u.iconCenter.y,u.iconSize-1,Math.PI*4/3,Math.PI*5/3);
			}
			ic.lineTo(u.iconCenter.x,u.iconCenter.y);
			ic.fill();
			ic.stroke();
			// Имя пилота
			if (self.namesVisualMode() == "on" || (self.namesVisualMode() == "auto" && self.zoom() >= config.namesVisualModeAutoMinZoom)) {
				setProperties(ic,$.extend({},config.canvas.ufos.basic,config.canvas.ufos.titles));
				ic.strokeText(u.name(),u.iconCenter.x,u.iconCenter.y-config.canvas.ufos.nameOffset);
				ic.fillText(u.name(),u.iconCenter.x,u.iconCenter.y-config.canvas.ufos.nameOffset);
			}
		}

		u.render = function(co) {
			if (u.noData() || !u.visible()) return;
			if (!u.iconCanvas || u.updateIconRequired) {
				u.prepareIcon();
				u.updateIconRequired = false;
			}
			var p = co.abs2rel(u.coords(),self.zoom());
			if (co.inViewport(p,u.iconSize)) {
				var context = co.getContext();
				context.drawImage(u.iconCanvas,p.x-u.iconCenter.x,p.y-u.iconCenter.y);
			}
		}

		u.renderTrack = function(co) {
			if (u.noData() || !u.visible()) return;
			if (self.tracksVisualMode() == "off" || u.trackData.length <= 1) return;
			var p = co.abs2rel(u.coords(),self.zoom());
			if (co.inViewport(p,0)) {
				var context = co.getContext();
				co.setProperties($.extend({},config.canvas.ufos.basic,{strokeStyle:u.color()}));
				context.beginPath();
				for (var i = 0; i < u.trackData.length; i++) {
					if (u.trackData[i].dt == null) continue;
					var pp = co.abs2rel(u.trackData[i],self.zoom());
					if (i > 0) context.lineTo(pp.x,pp.y);
					else context.moveTo(pp.x,pp.y);
				}
				context.lineTo(p.x,p.y);
				context.stroke();
			}
		}

		u.coords = ko.computed(function() {
			if (u.noData() || !u.position()) return null;
			return self.prepareCoords(u.position().lat,u.position().lng);
		});

		u.trackSubscribe = u.track.subscribe(function(v) {
			if (!u.visible() || self.tracksVisualMode() == "off") return;
			// если приходит специальное значение v.dt=null, обнуляем трек
			if (v.dt == "null") {
				u.trackData = [];
				return;
			}
			// подготавливаем координаты и добавляем новую точку в trackData
			var coords = self.prepareCoords(v.lat,v.lng);
			v.x = coords.x;
			v.y = coords.y;
			u.trackData.push(v);
			// если 10 минут ограничение трека, убираем из начала трека старые точки
			if (self.tracksVisualMode() == "10min") {
				while (u.trackData[0] && (self.currentKey() > u.trackData[0].dt + 60000))
					u.trackData.splice(0,1);
			}
		});

		u.visibleSubscribe = u.visible.subscribe(function() {
			self.update();
		});
		u.stateSubscribe = u.state.subscribe(function() {
			u.updateIconRequired = true;
			self.update();
		});
		u.nameSubscribe = u.name.subscribe(function() {
			u.updateIconRequired = true;
			self.update();
		});

		return u;
	}

	GoogleMap.prototype.destroyUfo = function(u) {
		u.trackSubscribe.dispose();
		u.visibleSubscribe.dispose();
		u.stateSubscribe.dispose();
		u.nameSubscribe.dispose();
	}

	GoogleMap.prototype.createShortWay = function(data) {
		var self = this;
		if (!data) return null;

		for (var i = 0; i < data.length; i++) {
			var p = self.prepareCoords(data[i].lat,data[i].lng);
			data[i].x = p.x;
			data[i].y = p.y;
		}

		var w = {
			data:data
		};

		w.render = function(co) {
			co.setProperties(config.canvas.shortWay.basic);
			var context = co.getContext();
			context.beginPath();
			for (var i = 0; i < w.data.length; i++) {
				var p = co.abs2rel(w.data[i],self.zoom());
				if (i > 0) context.lineTo(p.x,p.y);
				else context.moveTo(p.x,p.y);
			}
			context.stroke();
			var prevP = null;
			for (var i = 0; i < w.data.length; i++) {
				var p = co.abs2rel(w.data[i],self.zoom());
				if (i > 0) {
					var l = Math.sqrt(Math.pow(p.x-prevP.x,2)+Math.pow(p.y-prevP.y,2));
					var s = config.canvas.shortWay.arrowSize/2;
					if (l > s) {
						var mP = {x:Math.floor((p.x+prevP.x)/2),y:Math.floor((p.y+prevP.y)/2)};
						var a = Math.atan2(prevP.y-p.y,prevP.x-p.x);
						context.beginPath();
						context.moveTo(mP.x,mP.y);
						var lP = {x:mP.x+s*Math.cos(a+Math.PI/6),y:mP.y+s*Math.sin(a+Math.PI/6)};
						context.lineTo(lP.x,lP.y);
						var lP = {x:mP.x+s*Math.cos(a-Math.PI/6),y:mP.y+s*Math.sin(a-Math.PI/6)};
						context.lineTo(lP.x,lP.y);
						context.lineTo(mP.x,mP.y);
						context.fill();
					}
				}
				prevP = p;
			}
		}

		w.renderLabels = function(co) {
			co.setProperties(config.canvas.shortWay.basic);
			var context = co.getContext();
			for (var i = 0; i < w.data.length; i++) {
				var t = w.data[i];
				var p = co.abs2rel(t,self.zoom());
				if (t.type == "ordinal") {
					co.setProperties(config.canvas.shortWay.basic);
					context.beginPath();
					context.arc(p.x,p.y,config.canvas.shortWay.circleSize,0,2*Math.PI);
					context.fill();
					co.setProperties($.extend({},config.canvas.shortWay.basic,config.canvas.shortWay.text));
					context.fillText(t.id-1,p.x,p.y);
				}
			}
		}
		return w;
	}

	GoogleMap.prototype.destroyShortWay = function() {
		if (this.mapShortWay) {
			if (this.mapShortWay._models)
				for (var i = 0; i < this.mapShortWay._models.length; i++)
					this.mapShortWay._models[i].setMap(null);
			this.mapShortWay.styleSubscribe.dispose();
			this.mapShortWay.visibleSubscribe.dispose();
			delete this.mapShortWay;
		}
	}

	GoogleMap.prototype.calculateAndSetDefaultPosition = function() {
		if (!this.map || !this.shortWay()) return;
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
		if (this.tracksVisualMode() != "off") {
			this.mapUfos.forEach(function(ufo) {
				ufo.renderTrack(canvas);
			},this);
		}
		this.mapUfos.forEach(function(ufo) {
			ufo.render(canvas);
		},this);
	}

	GoogleMap.prototype._updateStaticCanvas = function(canvas) {
		this.mapWaypoints.forEach(function(waypoint) {
			waypoint.render(canvas);
		},this);
		if (this.mapShortWay)
			this.mapShortWay.render(canvas);
		if (this.mapShortWay)
			this.mapShortWay.renderLabels(canvas);
		this.mapWaypoints.forEach(function(waypoint) {
			waypoint.renderLabels(canvas);
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

	GoogleMap.prototype.domInit = function(elem,params) {
		var self = this;
		var div = ko.virtualElements.firstChild(elem);
		while(div && div.nodeType != 1)
			div = ko.virtualElements.nextSibling(div);
		ko.virtualElements.prepend(elem,div);
		this.map = new gmaps.Map(div,{
			zoom: config.map.zoom,
			center: new gmaps.LatLng(config.map.center.lat,config.map.center.lng),
			mapTypeId: gmaps.MapTypeId[config.map.type]
		});
		gmaps.event.addListenerOnce(this.map,"mousedown",function() {
			self.activateMapScroll(true);
		});
		gmaps.event.addListenerOnce(this.map,"click",function() {
			self.activateMapScroll(true);
		});

		this.staticCanvasOverlay = new CanvasOverlay({
			map: this.map,
			container: gmaps.ControlPosition.TOP_CENTER
		});

		this.canvasOverlay = new CanvasOverlay({
			map: this.map,
			container: gmaps.ControlPosition.BOTTOM_CENTER
		});

		gmaps.event.addListener(this.map,"center_changed",function() {
			// событие center_changed возникает когда меняется размер карты (так же поступает bounds_changed, но он с глючной задержкой)
			self.staticCanvasOverlay.relayout();
			self.canvasOverlay.relayout();
			self.update("static",true);
			self.update("dynamic",true);
		});
		gmaps.event.addListener(this.map,"zoom_changed",function() {
			self.zoom(self.map.getZoom());
			self.updateIcons();
			self.update("static",true);
			self.update("dynamic",true);
		});

		this.isReady(true);
		this.mapOptions.valueHasMutated();
	}
	
	GoogleMap.prototype.domDestroy = function(elem,params) {
		delete this.map;
	}

	GoogleMap.prototype.templates = ["main"];

	return GoogleMap;
});
