define(["jquery","knockout","google.maps","config"],function($,ko,gmaps,config) {
 	var Ufo = function(data,mapWidget) {
		var u = this;

		u.i = data.i;
		u.id = data.id;
		u.name = data.name;
		u.color = data.color;
		u.state = data.state;
		u.stateChangedAt = data.stateChangedAt;
		u.position = data.position;
		u.track = data.track;
		u.visible = data.visible;
		u.checked = data.checked;
		u.highlighted = data.highlighted;
		u.trackVisible = data.trackVisible;
		u.noData = data.noData;
		u.noPosition = data.noPosition;
		u.alt = data.alt;
		u.country = data.country;
		u.country3 = data.country3;
		u.switchCheck = data.switchCheck;
		u.dist = data.dist;
		u.gspd = data.gspd;
		u.speed = data.speed;
		u.vSpd = data.vSpd;
		u.distFrom = data.distFrom;
		u.colored = data.colored;
		u.resetTrack = data.resetTrack;
		u.finishedTime = data.finishedTime;

		u.highlightedLevel = ko.observable(0);
		u.trackData = [];
		u.preparedCoords = null;
		u.prepareCoordsRequired = true;

		u.distFrom = ko.computed(function() {
			return u.dist() > 0 ? Math.floor((mapWidget.optdistance() - u.dist())*10)/10 : Math.floor(mapWidget.optdistance()*10)/10;
		});

		var getTimeStr = function(h,m,s) {
			return (h<10?"0":"") + h + ":" + (m<10?"0":"") + m + ":" + (s<10?"0":"") + s;
		}
		u.finishedTime = ko.computed(function() {
			if (u.state()!=="finished" || !u.stateChangedAt()) return null;
			var d = Math.abs(u.stateChangedAt() - Math.floor(mapWidget.raceKey()/1000));
			return getTimeStr(Math.floor(d/3600),Math.floor(d%3600/60),d%60);
		});

		u._overlay = mapWidget.mouseOverlay.createOverlay();
		u._overlay.on("over",function() {
			u.highlighted(true);
		}).on("out",function() {
			u.highlighted(false);
		}).on("click",function() {
			mapWidget.openPopup(u);
		});

		u.trackSubscribe = u.track.subscribe(function(v) {
			if (!mapWidget.isReady() || mapWidget.tracksVisualMode() == "off") return;
			// если приходит специальное значение v.dt=null, обнуляем трек
			if (v.dt == null) {
				u.trackData = [];
				return;
			}
			if (!v.lat || !v.lng) return;
			// подготавливаем координаты и добавляем новую точку в trackData
			var coords = mapWidget.prepareCoords(v.lat,v.lng);
			v.x = coords.x;
			v.y = coords.y;
			u.trackData.push(v);
			// если 10 минут ограничение трека, убираем из начала трека старые точки
			if (mapWidget.tracksVisualMode() == "5min") {
				while (u.trackData[0] && (mapWidget.currentKey() > u.trackData[0].dt + 300000))
					u.trackData.splice(0,1);
			}
		});

		u.visibleSubscribe = u.visible.subscribe(function() {
//			u.resetTrack();
			mapWidget.update();
		});
		u.stateSubscribe = u.state.subscribe(function() {
			u.updateIconRequired = true;
			mapWidget.update();
		});
		u.coloredSubscribe = u.colored.subscribe(function() {
			u.updateIconRequired = true;
			mapWidget.update();
		});
		u.highlightedSubscribe = u.highlighted.subscribe(function(v) {
			if (v) {
				u.highlightedLevel(config.canvas.ufos.highlightSize);
			}
			mapWidget.update();
		});
		u.highlightedLevel.subscribe(function() {
			mapWidget.update();
		});
		u.nameSubscribe = u.name.subscribe(function() {
			u.updateIconRequired = true;
		});
		u.positionSubscribe = u.position.subscribe(function(p) {
			u.prepareCoordsRequired = true;
		});
		u.altSubscribe = u.alt.subscribe(function() {
			if (mapWidget.heightsVisualMode() == "level+")
				u.updateIconRequired = true;
		});

		var setProperties = function(context,properties) {
			if (!context) return;
			for (var i in properties)
				if (properties.hasOwnProperty(i))
					context[i] = properties[i];
		}

		u._prepareIcon = function(co) {
			u.iconSize = config.canvas.ufos.sizes[mapWidget.modelsVisualMode()] || config.canvas.ufos.sizes["default"];
			u.iconCenter = {x:u.iconSize,y:u.iconSize*2};
			u.iconCanvas = document.createElement("canvas");
			u.iconCanvas.width = 180;
			u.iconCanvas.height = u.iconSize*3;

			// проставляем размеры оверлея в mouseOverlay слое
			u._overlay.setSize(u.iconSize,u.iconSize);

			var ic = u.iconCanvas.getContext("2d");

			// Тень от иконки
			if (u.state() == "landed" || mapWidget.heightsVisualMode() == "off") {
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
			if (u.colored()) {
				ic.beginPath();
				setProperties(ic,$.extend({},config.canvas.ufos.basic,{fillStyle:u.color()}));
				ic.arc(u.iconCenter.x,u.iconCenter.y-u.iconSize+2,config.canvas.ufos.checkedCircleSize,0,Math.PI*2);
				ic.fill();
				ic.stroke();
			}

			if (!mapWidget.hasPopup(u)) {
				// Имя пилота
				if (mapWidget.namesVisualMode() == "on" || (mapWidget.namesVisualMode() == "auto" && mapWidget.zoom() >= config.namesVisualModeAutoMinZoom)) {
					setProperties(ic,$.extend({},config.canvas.ufos.basic,config.canvas.ufos.titles));
					if (u.colored()) 
						setProperties(ic,config.canvas.ufos.checkedTitles);
//					ic.strokeText(u.name()+"("+u.id()+")",u.iconCenter.x+config.canvas.ufos.titleOffsetX,u.iconCenter.y-u.iconSize*Math.sqrt(3)/2+config.canvas.ufos.titleOffsetY);
//					ic.fillText(u.name()+"("+u.id()+")",u.iconCenter.x+config.canvas.ufos.titleOffsetX,u.iconCenter.y-u.iconSize*Math.sqrt(3)/2+config.canvas.ufos.titleOffsetY);
					ic.strokeText(u.name()+"("+u.id()+")",u.iconCenter.x+config.canvas.ufos.titleOffsetX,u.iconCenter.y+config.canvas.ufos.titleOffsetY);
					ic.fillText(u.name()+"("+u.id()+")",u.iconCenter.x+config.canvas.ufos.titleOffsetX,u.iconCenter.y+config.canvas.ufos.titleOffsetY);
				}

				// Подпись высоты
				if (mapWidget.heightsVisualMode() == "level+") {
					var t = u.alt() + "m";
					setProperties(ic,$.extend({},config.canvas.ufos.basic,config.canvas.ufos.altTitles));
//					ic.strokeText(t,u.iconCenter.x+config.canvas.ufos.altTitleOffsetX,u.iconCenter.y+config.canvas.ufos.altTitleOffsetY-u.iconSize*Math.sqrt(3)/2);
//					ic.fillText(t,u.iconCenter.x+config.canvas.ufos.altTitleOffsetX,u.iconCenter.y+config.canvas.ufos.altTitleOffsetY-u.iconSize*Math.sqrt(3)/2);
					ic.strokeText(t,u.iconCenter.x+config.canvas.ufos.altTitleOffsetX,u.iconCenter.y+config.canvas.ufos.altTitleOffsetY);
					ic.fillText(t,u.iconCenter.x+config.canvas.ufos.altTitleOffsetX,u.iconCenter.y+config.canvas.ufos.altTitleOffsetY);
				}
			}
		}

		u._prepareCoords = function() {
			if (!mapWidget.isReady() || u.noData() || !u.position()) {
				u.preparedCoords = null;
				return;
			}
			u.preparedCoords = mapWidget.prepareCoords(u.position().lat,u.position().lng);
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
			if (!mapWidget.isReady() || u.noData() || u.noPosition() || !u.visible()) {
				u._overlay.hide();
				if (mapWidget._popup && mapWidget._popup._ufo == u) mapWidget._popup.hide();
				return;
			}
			if (!u.iconCanvas || u.updateIconRequired) {
				u._prepareIcon();
				u.updateIconRequired = false;
			}
			if (!u.preparedCoords || u.prepareCoordsRequired) {
				u._prepareCoords();
				u.prepareCoordsRequired = false;
			}

			var p = co.abs2rel(u.preparedCoords,mapWidget.zoom());
			if (!co.inViewport(p,u.iconSize)) {
				u._overlay.hide();
				if (mapWidget._popup && mapWidget._popup._ufo == u) mapWidget._popup.hide();
				return;
			}

			var context = co.getContext();

			u._height = 0;
			if ((u.state() != "landed") && (u.alt() > 0) && (mapWidget.heightsVisualMode() == "level" || mapWidget.heightsVisualMode() == "level+"))
				u._height = Math.floor(u.alt()/100);

			// Подсветка
			// Затухание подсветки
			if (type == "highlight" && (u.highlighted() || u.highlightedLevel()>0)) {
				if (u.highlighted()) {
					u._highlightedDt = (new Date).getTime();
				}
				else {
					var h = Math.floor(u.highlightedLevel() - ((new Date).getTime()-u._highlightedDt)/config.canvas.ufos.highlightDelay);
					u.highlightedLevel(h>0?h:0);
				}
			}

			// TODO: укоротить копипастный код
			if (type == "highlight" && u.highlightedLevel() > 0) {
				var h = u.highlightedLevel();
				co.setProperties(config.canvas.ufos.highlight);
				// Подсветка иконки
				context.beginPath();
				context.moveTo(p.x,p.y-u._height+h*2);
				var hLength = u.iconSize+h*2*Math.sqrt(3);
				if (u.state() == "landed") {
					context.lineTo(p.x-hLength/2,p.y-u._height+h*2-hLength*Math.sqrt(3)/2);
					context.lineTo(p.x+hLength/2,p.y-u._height+h*2-hLength*Math.sqrt(3)/2);
				}
				else {
					context.arc(p.x,p.y-u._height+h*2,hLength-1.5,Math.PI*4/3,Math.PI*5/3);
				}
				context.moveTo(p.x-u.iconCenter.x+u.iconCenter.x,p.y-u.iconCenter.y-u._height+u.iconCenter.y+h);
				context.fill();
				// Подсветка ножки элевации
				if (u.state() != "landed" && (mapWidget.heightsVisualMode() == "level" || mapWidget.heightsVisualMode() == "level+")) {
					_drawEllipse(context,p.x-5-h,p.y-3-h,10+h*2,6+h*2);
					context.beginPath();
					context.fillRect(p.x-1.5-h,p.y-u._height-4.5,3+h*2,u._height+5);					
				}
			}

			if (type == "icon") {
				context.drawImage(u.iconCanvas,p.x-u.iconCenter.x,p.y-u.iconCenter.y-u._height);
			}

			if ((type == "elev") && (u.state() != "landed") && (mapWidget.heightsVisualMode() == "level" || mapWidget.heightsVisualMode() == "level+")) {
				co.setProperties(config.canvas.ufos.stickDot);
				if (u.colored()) co.setProperties({fillStyle:u.color()});
				_drawEllipse(context,p.x-5,p.y-3,10,6);
				co.setProperties(config.canvas.ufos.stick);
				if (u.colored()) co.setProperties({fillStyle:u.color()});
				context.beginPath();
				context.fillRect(p.x-1.5,p.y-u._height-4.5,3,u._height+5);
				context.strokeRect(p.x-1.5,p.y-u._height-4.5,3,u._height+5);
			}

			if (type == "track" && mapWidget.tracksVisualMode() != "off" && u.trackData.length > 0) {
				co.setProperties(config.canvas.ufos.basic);
				if (u.colored()) co.setProperties({strokeStyle:u.color()});
				context.beginPath();
				for (var i = 0; i < u.trackData.length; i++) {
					if (u.trackData[i].dt == null) continue;
					var pp = co.abs2rel(u.trackData[i],mapWidget.zoom());
					if (i > 0) context.lineTo(pp.x,pp.y);
					else context.moveTo(pp.x,pp.y);
				}
				context.lineTo(p.x,p.y);
				context.stroke();
			}

			if (type == "overlay") {
				u._overlay.show();
				u._overlay.setPosition(p.x-u.iconCenter.x/2,p.y-u.iconSize-u._height,u._overlayZ);
				if (mapWidget._popup && mapWidget._popup._ufo == u) {
					mapWidget._popup.show();
					mapWidget.updatePopup();
				}
			}
		}

		u.destroy = function() {
			u.trackSubscribe.dispose();
			u.visibleSubscribe.dispose();
			u.coloredSubscribe.dispose();
			u.stateSubscribe.dispose();
			u.nameSubscribe.dispose();
			u.altSubscribe.dispose();
			u.positionSubscribe.dispose();
			if (u._mouseDiv)
				mapWidget.mouseOverlay.removeChild(u._mouseDiv);			
		}

		return u;
	}

	return Ufo;
});