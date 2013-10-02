define(["jquery","knockout","CountryCodes","config","widget!Checkbox"],function($,ko,countryCodes,config,Checkbox) {

	var Ufo = function(data,tableWidget) {
		var u = this;
 		for (var i in data)
			u[i] = data[i];

		u.rowType = "ufo";

		u.visibleCheckboxColor = ko.computed(function() {
			return u.colored() ? u.color() : config.canvas.ufos.visibleCheckboxColor;
		});
		u.visibleCheckbox = new Checkbox({checked:u.visible,color:u.visibleCheckboxColor});
		u.fullTrackEnabledCheckbox = new Checkbox({checked:u.fullTrackEnabled,color:u.visibleCheckboxColor});

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