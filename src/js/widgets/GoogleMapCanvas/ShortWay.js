define(["config"],function(config) {
	var ShortWay = function(data,mapWidget) {
		var w = this;

		w.data = data;

		var _prepareCoords = function(rw) {
			if (rw.preparedCoordsExist && !rw.prepareCoordsRequired) return rw;
			var p = mapWidget.prepareCoords(rw.lat,rw.lng);
			rw.x = p.x;
			rw.y = p.y;
			rw.preparedCoordsExist = true;
			rw.prepareCoordsRequired = false;
			return rw;
		}

		w.render = function(co,type) {
			if (!mapWidget.isReady() || !w.data || w.data.length == 0) return;
			co.setProperties(config.canvas.shortWay.basic);
			var context = co.getContext();

			if (type == "line") {
				context.beginPath();
				for (var i = 0; i < w.data.length; i++) {
					w.data[i] = _prepareCoords(w.data[i]);
					var p = co.abs2rel(w.data[i],mapWidget.zoom());
					if (i > 0) context.lineTo(p.x,p.y);
					else context.moveTo(p.x,p.y);
				}
				context.stroke();
			}

			if (type == "arrows") {
				var prevP = null;
				for (var i = 0; i < w.data.length; i++) {
					var p = co.abs2rel(w.data[i],mapWidget.zoom());
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

			if (type == "bearing" && mapWidget.raceType() == "opendistance" && mapWidget.raceTypeOptions()) {
				var lp = co.abs2rel(_prepareCoords(w.data[w.data.length-1]),mapWidget.zoom());

				var a = (mapWidget.raceTypeOptions().bearing || 0)/180*Math.PI;
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
					var p = co.abs2rel(t,mapWidget.zoom());
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

		w.destroy = function() { }
	}

	return ShortWay;
});