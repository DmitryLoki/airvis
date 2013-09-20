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
		u.leading = data.leading;
		u.colored = data.colored;
		u.rowType = "ufo";
		u.distFrom = data.distFrom;

		u.tableData = {
			dist: ko.observable(u.dist()),
			alt: ko.observable(u.alt()),
			speed: ko.observable(u.speed()),
			vSpd: ko.observable(u.vSpd())
		}

		u.updateTableData = function() {
			u.tableData.dist(u.dist());
			u.tableData.alt(u.alt());
			u.tableData.speed(u.speed());
			u.tableData.vSpd(u.vSpd());
		}

		u.distFrom = ko.computed(function() {
			return u.dist() > 0 ? Math.floor((tableWidget.optdistance() - u.dist())*10)/10 : Math.floor(tableWidget.optdistance()*10)/10;
		});
		u.visibleCheckboxColor = ko.computed(function() {
			return u.colored() ? u.color() : config.canvas.ufos.visibleCheckboxColor;
		});
		u.visibleCheckbox = new Checkbox({checked:u.visible,color:u.visibleCheckboxColor});
		u.trackVisibleCheckbox = new Checkbox({checked:u.trackVisible,color:u.visibleCheckboxColor});

		var getTimeStr = function(h,m,s) {
			return (h<10?"0":"") + h + ":" + (m<10?"0":"") + m + ":" + (s<10?"0":"") + s;
		}
		u.finishedTime = ko.computed(function() {
			if (u.state()!=="finished" || !u.stateChangedAt()) return null;
			var d = Math.abs(u.stateChangedAt() - Math.floor(tableWidget.raceKey()/1000));
			return getTimeStr(Math.floor(d/3600),Math.floor(d%3600/60),d%60);
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

		/*
		u.visibilityControl = ko.computed(function() {
			if (u.checked() && tableWidget.allCheckedVisible() == 1) u.visible(true);
			else if (u.checked() && tableWidget.allCheckedVisible() == 0) u.visible(false);
			else if (!u.checked()) {
				if (tableWidget.mode() == "leading") {
					if (u.leading() && tableWidget.allUncheckedVisible() == 1) u.visible(true);
					else if (u.leading() && tableWidget.allUncheckedVisible() == 0) u.visible(false);
					else if (!u.leading() && tableWidget.allNonLeadingVisible() == 1) u.visible(true);
					else if (!u.leading() && tableWidget.allNonLeadingVisible() == 0) u.visible(false);
				}
				else {
					if (tableWidget.allUncheckedVisible() == 1) u.visible(true);
					else if (tableWidget.allUncheckedVisible() == 0) u.visible(false);
				}
			}
			return 0;
		});
		*/

		var checkedAndLeadingSubscribe = function() {
			if (u.checked() && tableWidget.allCheckedVisible() == 1) u.visible(true);
			else if (u.checked() && tableWidget.allCheckedVisible() == 0) u.visible(false);
			else if (!u.checked()) {
				if (tableWidget.mode() == "leading") {
					if (u.leading() && tableWidget.allUncheckedVisible() == 1) u.visible(true);
					else if (u.leading() && tableWidget.allUncheckedVisible() == 0) u.visible(false);
					else if (!u.leading() && tableWidget.allNonLeadingVisible() == 1) u.visible(true);
					else if (!u.leading() && tableWidget.allNonLeadingVisible() == 0) u.visible(false);
				}
				else {
					if (tableWidget.allUncheckedVisible() == 1) u.visible(true);
					else if (tableWidget.allUncheckedVisible() == 0) u.visible(false);
				}
			}
		}
		u.checked.subscribe(checkedAndLeadingSubscribe);
		u.leading.subscribe(checkedAndLeadingSubscribe);

		return u;
	}

	return Ufo;
});