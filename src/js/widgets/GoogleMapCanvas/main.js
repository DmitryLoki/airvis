define(["jquery","knockout","utils","EventEmitter","google.maps","./CanvasOverlay","config"],function($,ko,utils,EventEmitter,gmaps,CanvasOverlay,config) {

	var GoogleMap = function(options) {
		var self = this;
		this.config = config;
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
		this.currentKey = options.currentKey;
		this.raceKey = options.raceKey;
		this.playerState = options.playerState;
		this.imgRootUrl = options.imgRootUrl;
		this.zoom = ko.observable(config.map.zoom);
		this.isReady = ko.observable(false);
		this.mapOptions = options.mapOptions;
		this.mode = options.mode;
		this.activateMapScroll = ko.observable(false);
		this.raceType = options.raceType;
		this.raceTypeOptions = options.raceTypeOptions;
		this.trackedUfoId = options.trackedUfoId;

		this.mapWaypoints = [];
		this.waypoints.subscribe(function(waypoints) {
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
		this._minAlt = 0;
		this._maxAlt = 0;

		this.mapShortWay = null;
		this.shortWay.subscribe(function(w) {
            self.destroyShortWay(self.mapShortWay);
            self.mapShortWay = self.createShortWay(w);
		});

		this.mapOptions.subscribe(function(options) {
            if (!options) return;
            self.map.setOptions(options);
            self.activateMapScroll(options.scrollwheel);
		});

		this.activateMapScroll.subscribe(function(b) {
		    self.map.setOptions({scrollwheel:b});
		});

		this.setProfVisualMode = function() {
			self.profVisualMode("prof");
		}
		this.setUserVisualMode = function() {
			self.profVisualMode("user");
		}

		this.trackedUfoId.subscribe(function() {
			self.startUfoTracking();
		});
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

	GoogleMap.prototype.createWaypoint = function(data) {
		var self = this;
		var w = {
			id: data.id,
			name: data.name,
			type: data.type,
			center: data.center,
			radius: data.radius,
			openKey: data.openKey,
			shortWay: data.shortWay,
			prepareCoordsRequired: true,
			preparedCoords: null,
			preparedSpCoords: null
		}

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

		w.render = function(co,type) {
			if (!self.isReady() || self.cylindersVisualMode() == "off") return;
			if (w.prepareCoordsRequired) {
				w.preparedCoords = self.prepareCoords(w.center().lat,w.center().lng);
				w.preparedSpCoords = self.map.getProjection().fromLatLngToPoint(gmaps.geometry.spherical.computeOffset(new gmaps.LatLng(w.center().lat,w.center().lng),w.radius(),90));
				w.prepareCoordsRequired = false;
			}
			var p = co.abs2rel(w.preparedCoords,self.zoom());
			var sp = co.abs2rel(w.preparedSpCoords,self.zoom());
			var r = Math.sqrt(Math.pow(p.x-sp.x,2)+Math.pow(p.y-sp.y,2));
			if (!co.inViewport(p,r)) return;
			var context = co.getContext();

			if (type == "waypoint") {
				var color = config.canvas.waypoints.colors[w.type()] ? config.canvas.waypoints.colors[w.type()][w.state()] : config.canvas.waypoints.colors["default"][w.state()];

				var opacity = 0, a = Math.max(1-2*r/co.getHeight(),0), min = config.canvas.waypoints.minOpacity, max = config.canvas.waypoints.maxOpacity;
				opacity = min+(max-min)*a;

//				var opacity = 0, h = co.getHeight()/4;
//				if (r < h) opacity = config.canvas.waypoints.maxOpacity;
//				else if (r > 2*h) opacity = config.canvas.waypoints.minOpacity;
//				else opacity = config.canvas.waypoints.maxOpacity - (r-h)/h*(config.canvas.waypoints.maxOpacity-config.canvas.waypoints.minOpacity);
				color = color.replace(/opacity/,opacity);

/*
				var opacity = 0, h = co.getHeight()/4;
				if (r < h) opacity = config.canvas.waypoints.maxOpacity;
				else if (r > 2*h) opacity = config.canvas.waypoints.minOpacity;
				else opacity = config.canvas.waypoints.maxOpacity - (r-h)/h*(config.canvas.waypoints.maxOpacity-config.canvas.waypoints.minOpacity);
				color = color.replace(/opacity/,opacity);

				var opacity = 0, zo = config.canvas.waypoints.opacityByZoom;
				if (self.zoom() < zo.minZoom) opacity = zo.minOpacity;
				else if (self.zoom() < zo.maxZoom) opacity = zo[self.zoom()];
				else opacity = zo.maxOpacity;
				color = color.replace(/opacity/,opacity/100);
*/

				co.setProperties($.extend({},config.canvas.waypoints.basic,{fillStyle:color}));
				context.beginPath();
				context.arc(p.x,p.y,r,0,2*Math.PI);
				context.stroke();
				if (self.cylindersVisualMode() == "full")
					context.fill();
			}

			if (type == "label") {
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
			checked: data.checked,
			highlighted: data.highlighted,
			trackVisible: data.trackVisible,
			noData: data.noData,
			noPosition: data.noPosition,
			trackData: [],
			preparedCoords: null,
			prepareCoordsRequired: true,
			alt: data.alt
		}

		u.trackSubscribe = u.track.subscribe(function(v) {
			if (!self.isReady() || !u.visible() || self.tracksVisualMode() == "off") return;
			// если приходит специальное значение v.dt=null, обнуляем трек
			if (v.dt == null) {
				u.trackData = [];
				return;
			}
			if (!v.lat || !v.lng) return;
			// подготавливаем координаты и добавляем новую точку в trackData
			var coords = self.prepareCoords(v.lat,v.lng);
			v.x = coords.x;
			v.y = coords.y;
			u.trackData.push(v);
			// если 10 минут ограничение трека, убираем из начала трека старые точки
			if (self.tracksVisualMode() == "10min") {
				while (u.trackData[0] && (self.currentKey() > u.trackData[0].dt + 600000))
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
		u.checkedSubscribe = u.checked.subscribe(function() {
			u.updateIconRequired = true;
			self.update();
		});
		u.highlightedSubscribe = u.highlighted.subscribe(function(v) {
			self.update();
		});
		u.nameSubscribe = u.name.subscribe(function() {
			u.updateIconRequired = true;
			self.update();
		});
		u.positionSubscribe = u.position.subscribe(function(p) {
			u.prepareCoordsRequired = true;
		});
		u.altSubscribe = u.alt.subscribe(function() {
			if (self.heightsVisualMode() == "level+")
				u.updateIconRequired = true;
		});

		var setProperties = function(context,properties) {
			if (!context) return;
			for (var i in properties)
				if (properties.hasOwnProperty(i))
					context[i] = properties[i];
		}

		u._prepareIcon = function(co) {
			u.iconSize = config.canvas.ufos.sizes[self.modelsVisualMode()] || config.canvas.ufos.sizes["default"];
			u.iconCenter = {x:u.iconSize,y:u.iconSize*2};
			u.iconCanvas = document.createElement("canvas");
			u.iconCanvas.width = 200;
			u.iconCanvas.height = u.iconSize*3;
			var ic = u.iconCanvas.getContext("2d");

			// Тень от иконки
			if (u.state() == "landed" || self.heightsVisualMode() == "off") {
				ic.beginPath();
				setProperties(ic,$.extend({},config.canvas.ufos.basiс,config.canvas.ufos.shadow));
				ic.moveTo(u.iconCenter.x-u.iconSize/4,u.iconCenter.y);
				ic.lineTo(u.iconCenter.x,u.iconCenter.y-u.iconSize/10);
				ic.lineTo(u.iconCenter.x+u.iconSize/4,u.iconCenter.y);
				ic.lineTo(u.iconCenter.x,u.iconCenter.y+u.iconSize/10);
				ic.lineTo(u.iconCenter.x-u.iconSize/4,u.iconCenter.y);
				ic.fill();
			}

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

			// Кружок на выбранных пилотах
			if (u.checked()) {
				ic.beginPath();
				setProperties(ic,$.extend({},config.canvas.ufos.basic,{fillStyle:u.color()}));
				ic.arc(u.iconCenter.x,u.iconCenter.y-u.iconSize+2,config.canvas.ufos.checkedCircleSize,0,Math.PI*2);
				ic.fill();
				ic.stroke();
			}

			// Имя пилота
			if (self.namesVisualMode() == "on" || (self.namesVisualMode() == "auto" && self.zoom() >= config.namesVisualModeAutoMinZoom)) {
				setProperties(ic,$.extend({},config.canvas.ufos.basic,config.canvas.ufos.titles));
				if (u.checked()) 
					setProperties(ic,config.canvas.ufos.checkedTitles);
				ic.strokeText(u.name()+"("+u.id()+")",u.iconCenter.x,u.iconCenter.y-config.canvas.ufos.titleOffset);
				ic.fillText(u.name()+"("+u.id()+")",u.iconCenter.x,u.iconCenter.y-config.canvas.ufos.titleOffset);
			}

			// Подпись высоты
			if (self.heightsVisualMode() == "level+") {
				var t = u.alt() + "m";
				setProperties(ic,$.extend({},config.canvas.ufos.basic,config.canvas.ufos.altTitles));
				ic.strokeText(t,u.iconCenter.x+config.canvas.ufos.altTitleOffsetX,u.iconCenter.y+config.canvas.ufos.altTitleOffsetY);
				ic.fillText(t,u.iconCenter.x+config.canvas.ufos.altTitleOffsetX,u.iconCenter.y+config.canvas.ufos.altTitleOffsetY);
			}
		}

		u._prepareCoords = function() {
			if (!self.isReady() || u.noData() || !u.position()) {
				u.preparedCoords = null;
				return;
			}
			u.preparedCoords = self.prepareCoords(u.position().lat,u.position().lng);
		}

		var _drawEllipse = function(ctx, x, y, w, h) {
			var kappa = .5522848,
        	ox = (w / 2) * kappa, // control point offset horizontal
        	oy = (h / 2) * kappa, // control point offset vertical
        	xe = x + w,           // x-end
        	ye = y + h,           // y-end
        	xm = x + w / 2,       // x-middle
        	ym = y + h / 2;       // y-middle
    		ctx.beginPath();
			ctx.moveTo(x,ym);
			ctx.bezierCurveTo(x,ym-oy,xm-ox,y,xm,y);
			ctx.bezierCurveTo(xm+ox,y,xe,ym-oy,xe,ym);
			ctx.bezierCurveTo(xe,ym+oy,xm+ox,ye,xm,ye);
			ctx.bezierCurveTo(xm-ox,ye,x,ym+oy,x,ym);
			ctx.closePath();
			ctx.stroke();
			ctx.fill();
	    }

		u.render = function(co,type) {
			if (!self.isReady() || u.noData() || u.noPosition() || !u.visible()) return;
			if (!u.iconCanvas || u.updateIconRequired) {
				u._prepareIcon();
				u.updateIconRequired = false;
			}
			if (!u.preparedCoords || u.prepareCoordsRequired) {
				u._prepareCoords();
				u.prepareCoordsRequired = false;
			}
			var p = co.abs2rel(u.preparedCoords,self.zoom());
//			if (u.alt() < self._minAlt || self._minAlt == 0) self._minAlt = u.alt();
//			if (u.alt() > self._maxAlt || self._maxAlt == 0) self._maxAlt = u.alt();
			if (!co.inViewport(p,u.iconSize)) return;
			var context = co.getContext();

			var height = 0;
			if ((u.state() != "landed") && (u.alt() > 0) && (self.heightsVisualMode() == "level" || self.heightsVisualMode() == "level+"))
				height = Math.floor(u.alt()/100);
//				height = Math.floor(config.canvas.ufos.minStick + (config.canvas.ufos.maxStick-config.canvas.ufos.minStick)*(u.alt()-self._minAlt)/(self._maxAlt-self._minAlt));

			// Подсветка
			// TODO: укоротить копипастный код
			if (type == "highlight" && u.highlighted()) {
				co.setProperties(config.canvas.ufos.highlight);
				// Подсветка иконки
				context.beginPath();
				context.moveTo(p.x-u.iconCenter.x+u.iconCenter.x,p.y-u.iconCenter.y-height+u.iconCenter.y+8);
				if (u.state() == "landed") {
					context.lineTo(p.x-u.iconCenter.x+u.iconCenter.x-(u.iconSize+10)/2,p.y-u.iconCenter.y-height+u.iconCenter.y-(u.iconSize+10)*Math.sqrt(3)/2);
					context.lineTo(p.x-u.iconCenter.x+u.iconCenter.x+(u.iconSize+10)/2,p.y-u.iconCenter.y-height+u.iconCenter.y-(u.iconSize+10)*Math.sqrt(3)/2);
				}
				else {
					context.arc(p.x-u.iconCenter.x+u.iconCenter.x,p.y-u.iconCenter.y-height+u.iconCenter.y+8,u.iconSize+10,Math.PI*4/3,Math.PI*5/3);
				}
				context.moveTo(p.x-u.iconCenter.x+u.iconCenter.x,p.y-u.iconCenter.y-height+u.iconCenter.y+8);
				context.fill();
				// Подсветка кружка на выбранных
				if (u.checked()) {
					context.beginPath();
					context.arc(p.x-u.iconCenter.x+u.iconCenter.x,p.y-u.iconCenter.y-height+u.iconCenter.y-u.iconSize+2,config.canvas.ufos.checkedCircleSize+4,0,Math.PI*2);
					context.fill();
				}
				// Подсветка ножки элевации
				if (u.state() != "landed" && (self.heightsVisualMode() == "level" || self.heightsVisualMode() == "level+")) {
					_drawEllipse(context,p.x-5-3,p.y-3-3,10+6,6+6);
					context.beginPath();
					context.fillRect(p.x-1.5-3,p.y-height-4.5,3+6,height+5);					
				}
			}

			if (type == "icon") {
				context.drawImage(u.iconCanvas,p.x-u.iconCenter.x,p.y-u.iconCenter.y-height);
			}

			if ((type == "elev") && (u.state() != "landed") && (self.heightsVisualMode() == "level" || self.heightsVisualMode() == "level+")) {
				co.setProperties(config.canvas.ufos.stickDot);
				if (u.checked()) co.setProperties({fillStyle:u.color()});
				_drawEllipse(context,p.x-5,p.y-3,10,6);
				co.setProperties(config.canvas.ufos.stick);
				if (u.checked()) co.setProperties({fillStyle:u.color()});
				context.beginPath();
				context.fillRect(p.x-1.5,p.y-height-4.5,3,height+5);
				context.strokeRect(p.x-1.5,p.y-height-4.5,3,height+5);
			}

			if (type == "track" && self.tracksVisualMode() != "off" && u.trackData.length > 0) {
				co.setProperties(config.canvas.ufos.basic);
				if (u.checked()) co.setProperties({strokeStyle:u.color()});
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

		return u;
	}

	GoogleMap.prototype.destroyUfo = function(u) {
		u.trackSubscribe.dispose();
		u.visibleSubscribe.dispose();
		u.checkedSubscribe.dispose();
		u.stateSubscribe.dispose();
		u.nameSubscribe.dispose();
		u.altSubscribe.dispose();
		u.positionSubscribe.dispose();
	}

	GoogleMap.prototype.createShortWay = function(data) {
		var self = this;
		if (!data) return null;

		var w = {
			data:data
		}

		var _prepareCoords = function(rw) {
			if (rw.preparedCoordsExist && !rw.prepareCoordsRequired) return rw;
			var p = self.prepareCoords(rw.lat,rw.lng);
			rw.x = p.x;
			rw.y = p.y;
			rw.preparedCoordsExist = true;
			rw.prepareCoordsRequired = false;
			return rw;
		}

		w.render = function(co,type) {
			if (!self.isReady() || w.data.length == 0) return;
			co.setProperties(config.canvas.shortWay.basic);
			var context = co.getContext();

			if (type == "line") {
				context.beginPath();
				for (var i = 0; i < w.data.length; i++) {
					w.data[i] = _prepareCoords(w.data[i]);
					var p = co.abs2rel(w.data[i],self.zoom());
					if (i > 0) context.lineTo(p.x,p.y);
					else context.moveTo(p.x,p.y);
				}
				context.stroke();
			}

			if (type == "arrows") {
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
							var lP = {x:mP.x+s*Math.cos(a+Math.PI/8),y:mP.y+s*Math.sin(a+Math.PI/8)};
							context.lineTo(lP.x,lP.y);
							var lP = {x:mP.x+s*Math.cos(a-Math.PI/8),y:mP.y+s*Math.sin(a-Math.PI/8)};
							context.lineTo(lP.x,lP.y);
							context.lineTo(mP.x,mP.y);
							context.fill();
						}
					}
					prevP = p;
				}
			}

			if (type == "bearing" && self.raceType() == "opendistance" && self.raceTypeOptions()) {
				var lp = co.abs2rel(_prepareCoords(w.data[w.data.length-1]),self.zoom());

				var a = (self.raceTypeOptions().bearing || 0)/180*Math.PI;
				var d = Math.max(co.getWidth(),co.getHeight());
				if (Math.cos(a) > 0)
					d = Math.min(d,lp.y/Math.cos(a));
				else if (Math.cos(a) < 0)
					d = Math.min(d,(lp.y-co.getHeight())/Math.cos(a));
				if (Math.sin(a) > 0)
					d = Math.min(d,(co.getWidth()-lp.x)/Math.sin(a));
				else if (Math.sin(a) < 0)
					d = Math.min(d,-lp.x/Math.sin(a));
				var p = {x:lp.x+Math.sin(a)*d/2,y:lp.y-Math.cos(a)*d/2};
				context.beginPath();
				context.moveTo(lp.x,lp.y);
				context.lineTo(p.x,p.y);
				context.stroke();
				var s = config.canvas.shortWay.arrowSize/2;
				var cP = {x:p.x+s*Math.sin(a)*Math.cos(Math.PI/8),y:p.y-s*Math.cos(a)*Math.cos(Math.PI/8)};
				context.beginPath();
				context.moveTo(cP.x,cP.y);
				var lP = {x:cP.x+s*Math.sin(a+Math.PI+Math.PI/8),y:cP.y-s*Math.cos(a+Math.PI+Math.PI/8)};
				context.lineTo(lP.x,lP.y);
				var lP = {x:cP.x+s*Math.sin(a+Math.PI-Math.PI/8),y:cP.y-s*Math.cos(a+Math.PI-Math.PI/8)};
				context.lineTo(lP.x,lP.y);
				context.lineTo(cP.x,cP.y);
				context.fill();
			}
			
			if (type == "labels") {
				for (var i = 0; i < w.data.length; i++) {
					var t = _prepareCoords(w.data[i]);
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
		}

		return w;
	}

	GoogleMap.prototype.destroyShortWay = function() {
		if (this.mapShortWay) {
			delete this.mapShortWay;
		}
	}

	GoogleMap.prototype.calculateAndSetDefaultPosition = function() {
		if (!this.map || !this.shortWay()) return;

		if (this.raceType() == "opendistance") {
			this.map.setCenter(new gmaps.LatLng(this.shortWay()[0].lat,this.shortWay()[0].lng));
			this.map.setZoom(config.openDistanceDefaultZoom);
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
			if (ufo.highlighted())
				highlightedUfos.push(ufo);
			else if (ufo.checked())
				checkedUfos.push(ufo);
			else
				ufo.render(canvas,"elev");
		},this);
		// Затем иконки не подсвеченных и не выбранных пилотов
		this.mapUfos.forEach(function(ufo) {
			if (!ufo.highlighted() && !ufo.checked())
				ufo.render(canvas,"icon");
		},this);
		if (checkedUfos.length > 0) {
			// Затем ножки выбранных пилотов
			checkedUfos.forEach(function(ufo) {
				ufo.render(canvas,"elev");
			});
			// Затем иконки выбранных пилотов
			checkedUfos.forEach(function(ufo) {
				ufo.render(canvas,"icon");
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
			});
		}
	}

	GoogleMap.prototype._updateStaticCanvas = function(canvas) {
		var drawOrder = {}, drawOrderKeys = [];
		this.mapWaypoints.forEach(function(waypoint,i) {
			var order = config.waypointsDrawOrder[waypoint.type()] || 0;
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
        this.staticCanvasOverlay.relayout();
        this.canvasOverlay.relayout();
        this.update("static",true);
        this.update("dynamic",true);
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

		gmaps.event.addListenerOnce(this.map,"mousedown",function() {
			self.activateMapScroll(true);
		});
		gmaps.event.addListenerOnce(this.map,"click",function() {
			self.activateMapScroll(true);
		});

		var _staticCanvasOverlayIsReady = false, _canvasOverlayIsReady = false, _mapIsReady = false;
		var readyCallback = function() {
			gmaps.event.clearListeners(self.map,"idle");
			self.addCustomMapType();
			self.isReady(true);
			self.calculateAndSetDefaultPosition();
			self.updateIcons();
			self.updateAll();
		}

		this.staticCanvasOverlay = new CanvasOverlay({
			map: this.map,
			onAdd: function() {
				_staticCanvasOverlayIsReady = true;
				if (_staticCanvasOverlayIsReady && _canvasOverlayIsReady && _mapIsReady) readyCallback();
			}
		});

		this.canvasOverlay = new CanvasOverlay({
			map: this.map,
			onAdd: function() {
				_canvasOverlayIsReady = true;
				if (_staticCanvasOverlayIsReady && _canvasOverlayIsReady && _mapIsReady) readyCallback();
			}			
		});

		gmaps.event.addListener(this.map,"center_changed",function() {
			// событие center_changed возникает когда меняется размер карты (так же поступает bounds_changed, но он с глючной задержкой)
			self.updateAll();
		});
		gmaps.event.addListener(this.map,"dragend",function() {
			self.trackedUfoId(null);
		});
		gmaps.event.addListener(this.map,"zoom_changed",function() {
            self.zoom(self.map.getZoom());
            self.updateIcons();
            self.updateAll();

            var maxZoomTerrain = self.map.mapTypes.get("terrainPlus") ? self.map.mapTypes.get("terrainPlus").maxZoom : 0;
            var maxZoomHybrid = self.map.mapTypes.get("hybridPlus") ? self.map.mapTypes.get("hybridPlus").maxZoom : 0;
            if (self.map.getMapTypeId() == "terrainPlus" && self.zoom() == maxZoomTerrain && maxZoomTerrain < maxZoomHybrid)
            	self.map.setMapTypeId("hybridPlus");
            if (self.map.getMapTypeId() == "hybridPlus" && self.zoom() == maxZoomHybrid && maxZoomHybrid < maxZoomTerrain)
            	self.map.setMapTypeId("terrainPlus");
		});
		gmaps.event.addListener(this.map,"maptypeid_changed",function() {
			var mapType = self.map.mapTypes.get(self.map.getMapTypeId());
			if (mapType.maxZoomIncreased && self.zoom() > mapType.originalMaxZoom) 
				self.map.setZoom(mapType.originalMaxZoom);
		});
        gmaps.event.addListener(this.map,"idle",function() {
        	_mapIsReady = true;
			if (_staticCanvasOverlayIsReady && _canvasOverlayIsReady && _mapIsReady) readyCallback();
        });

        //Отключить зум контрол для тач-устройств
        if("ontouchstart" in document.documentElement) {
        	var o = this.mapOptions();
        	o.zoomControl = false;
        	this.mapOptions(o);
        }
		this.mapOptions.valueHasMutated();
	}
	
	GoogleMap.prototype.domDestroy = function(elem,params) {
		delete this.map;
	}

	GoogleMap.prototype.destroy = function() {
	}

	GoogleMap.prototype.templates = ["main"];

	return GoogleMap;
});
