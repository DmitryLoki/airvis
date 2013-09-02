define(["jquery","knockout","CountryCodes","config","widget!Checkbox"],function($,ko,countryCodes,config,Checkbox) {

	var Ufo = function(data,tableWidget) {
		var u = this;

		u.i = data.i;
		u.id = data.id;
		u.name = data.name;
		u.country = data.country;
		u.country3 = data.country3;
		u.speed = data.speed;
		u.color = data.color;
		u.state = data.state;
		u.stateChangedAt = data.stateChangedAt;
		u.dist = data.dist;
		u.visible = data.visible;
		u.checked = data.checked;
		u.alt = data.alt;
		u.vSpd = data.vSpd;
		u.highlighted = data.highlighted;
		u.trackVisible = data.trackVisible;
		u.noData = data.noData;
		u.noPosition = data.noPosition;
		u.position = data.position;
		u.switchCheck = data.switchCheck;
		u.rowType = "ufo";

		u.distFrom = ko.computed(function() {
			return u.dist() > 0 ? Math.floor((tableWidget.optdistance() - u.dist())*10)/10 : Math.floor(tableWidget.optdistance()*10)/10;
		});
		u.visibleCheckboxColor = ko.computed(function() {
			return u.checked() ? u.color() : config.canvas.ufos.visibleCheckboxColor;
		});
		u.visibleCheckbox = new Checkbox({checked:u.visible,color:u.visibleCheckboxColor});
		u.finishedTime = ko.computed(function() {
			if (u.state()!=="finished" || !u.stateChangedAt()) return null;
			var d = Math.abs(u.stateChangedAt() - Math.floor(tableWidget.raceKey()/1000));
			return tableWidget.getTimeStr(Math.floor(d/3600),Math.floor(d%3600/60),d%60);
		});
		u.switchTracking = function() {
			var b = tableWidget.trackedUfoId() == u.id() ? null : u.id();
			if (!u.visible() || u.noData() || u.noPosition()) b = null;
			if (b) {
				tableWidget.emit("zoominMap",config.canvas.trackingZoom);
			}
			tableWidget.trackedUfoId(b);
		}
		u.highlightOn = function() {
			u.highlighted(true);
		}
		u.highlightOff = function() {
			u.highlighted(false);
		}
		u.centerMap = function() {
			tableWidget.trackedUfoId(null);
			if (u.position() && u.position().lat && u.position().lng) {
				tableWidget.emit("centerMap",u.position());
				tableWidget.emit("zoominMap",config.canvas.trackingZoom);
			}
		}
		u.searchCountry = function() {
			tableWidget.q(u.country3());
		}
		u.checkedSubscribe = u.checked.subscribe(function(v) {
			if (v && tableWidget.allCheckedVisible() == 1) u.visible(true);
			else if (v && tableWidget.allCheckedVisible() == 0) u.visible(false);
			else if (!v && tableWidget.allUncheckedVisible() == 1) u.visible(true);
			else if (!v && tableWidget.allUncheckedVisible() == 0) u.visible(false);
		});
		return u;
	}

	return Ufo;
});