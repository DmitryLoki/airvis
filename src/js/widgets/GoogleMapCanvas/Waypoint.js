define(["knockout","google.maps","config"],function(ko,gmaps,config) {
	var Waypoint = function(data,mapWidget) {
		var w = this;

		w.id = data.id;
		w.name = data.name;
		w.type = data.type;
		w.center = data.center;
		w.radius = data.radius;
		w.openKey = data.openKey;
		w.checkedOn = data.checkedOn;
		w.prepareCoordsRequired = true;
		w.preparedCoords = null;
		w.preparedSpCoords = null;

		// Здесь заводим еще переменную, иначе computed каждый тик вызывает свой subscribe
		w.stateUpdate = ko.observable();
		w.state = ko.computed(function() {
			var v = mapWidget.mode() == "simple" ? "opened" : (w.openKey() < mapWidget.currentKey() ? "opened" : "closed");
			w.stateUpdate(v);
			return v;
		},w);

		w.stateUpdate.subscribe(function(v){mapWidget.update("static");});
		w.name.subscribe(function(v){mapWidget.update("static");});
		w.type.subscribe(function(v){mapWidget.update("static");});
		w.radius.subscribe(function(v){mapWidget.update("static");});
		w.openKey.subscribe(function(v){mapWidget.update("static");});
		w.checkedOn.subscribe(function(v){mapWidget.update("static");});
		w.center.subscribe(function(v) {
			w.prepareCoordsRequired = true;
			mapWidget.update("static");
		});

		w.render = function(co,type) {
			if (!mapWidget.isReady() || mapWidget.cylindersVisualMode() == "off") return;
			if (w.prepareCoordsRequired) {
				w.preparedCoords = mapWidget.prepareCoords(w.center().lat,w.center().lng);
				w.preparedSpCoords = mapWidget.map.getProjection().fromLatLngToPoint(gmaps.geometry.spherical.computeOffset(new gmaps.LatLng(w.center().lat,w.center().lng),w.radius(),90));
				w.prepareCoordsRequired = false;
			}
			var p = co.abs2rel(w.preparedCoords,mapWidget.zoom());
			var sp = co.abs2rel(w.preparedSpCoords,mapWidget.zoom());
			var r = Math.sqrt(Math.pow(p.x-sp.x,2)+Math.pow(p.y-sp.y,2));
//			console.log(w.preparedCoords,p,mapWidget.zoom());
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
				if (mapWidget.zoom() < zo.minZoom) opacity = zo.minOpacity;
				else if (mapWidget.zoom() < zo.maxZoom) opacity = zo[mapWidget.zoom()];
				else opacity = zo.maxOpacity;
				color = color.replace(/opacity/,opacity/100);
*/

				co.setProperties($.extend({},config.canvas.waypoints.basic,{fillStyle:color}));
				context.beginPath();
				context.arc(p.x,p.y,r,0,2*Math.PI);
				context.stroke();
				if (mapWidget.cylindersVisualMode() == "full")
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

				if (mapWidget.profVisualMode() == "user" && title.length == 0) return;

				if (mapWidget.profVisualMode() == "prof") {
					if (w.name().length > 0)
						title += (title.length>0?" / ":"") + w.name();
					var r = w.radius();
					if (r >= 1000) r = Math.floor(r/100)/10 + "km";
					else r = r + "m";

					if (w.type() != "to") {
						title += (title.length>0?" / ":"") + "R " + r;
					}
					
					var s = w.checkedOn().toUpperCase();
					if (s.length > 0 && (w.type() == "ss" || w.type() == "ordinal" && s=="EXIT"))
						title += " / " + s;
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

		w.destroy = function() { }
	}

	return Waypoint;
});