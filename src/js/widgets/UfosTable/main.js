define(["jquery","knockout","widget!Checkbox","config","CountryCodes","jquery.tinyscrollbar"], function($,ko,Checkbox,config,countryCodes) {
	var UfosTable = function(options) {
		var self = this;

		this.ufos = options.ufos;
		this.raceKey = options.raceKey;
		this.raceType = options.raceType;
		this.optdistance = options.optdistance;

		this.inModalWindow = ko.observable(false);
		this.mode = ko.observable(config.ufosTable.mode);

		this.tableUfos = ko.observableArray([]);
		this.ufos.subscribe(function(ufos) {
			var rev1 = {}, rev2 = {}, values2push = [];
			for (var i = 0, l = ufos.length; i < l; i++)
				rev1[ufos[i].id()] = i;
			for (var i = 0, l = self.tableUfos().length; i < l; i++)
				rev2[self.tableUfos()[i].id()] = i;
			for (var i = 0, l = ufos.length; i < l; i++) {
				if (rev2[ufos[i].id()] == null) {
					values2push.push(self.createUfo(ufos[i]));
					rev2[ufos[i].id()] = self.tableUfos.length - 1;
				}
			}
			if (values2push.length > 0)
				ko.utils.arrayPushAll(self.tableUfos,values2push);
			for (var i = 0, l = self.tableUfos().length; i < l; i++) {
				if (rev1[self.tableUfos()[i].id()] == null) {
					self.destroyUfo(self.tableUfos()[i]);
					self.tableUfos.splice(i,1);
					i--;
				}
			}
			self.sortTableRows();
			self.updateScroll();
			self.updateScroll();
		});

		this.checkedLength = ko.observable(0);
		this._checkedLength = ko.computed(function() {
			var checked = 0;
			var total = 0;
			self.tableUfos().forEach(function(w) {
				if (w.checked()) checked++;
				total++;
			});
			self.checkedLength(checked);
			return checked;
		})

		this.allCheckedVisible = ko.computed({
			read: function() {
				var total = 0, visible = 0;
				self.tableUfos().forEach(function(w) {
					if (!w.checked()) return;
					if (w.visible()) visible++;
					total++;
				});
				return total==visible?1:(visible>0?2:0);
			},
			write: function(val) {
				self.tableUfos().forEach(function(w) {
					if (!w.checked()) return;
					w.visible(val==1);
				});
			}
		});
		this.allCheckedVisibleCheckbox = new Checkbox({checked:this.allCheckedVisible,color:config.ufosTable.allVisibleCheckboxColor,css:"checkbox-white",mode:"half"});

		this.allUncheckedVisible = ko.computed({
			read: function() {
				var total = 0, visible = 0;
				self.tableUfos().forEach(function(w) {
					if (w.checked()) return;
					if (w.visible()) visible++;
					total++;
				});
				return total==visible?1:(visible>0?2:0);
			},
			write: function(val) {
				self.tableUfos().forEach(function(w) {
					if (w.checked()) return;
					w.visible(val==1);
				});
			}
		});
		this.allUncheckedVisibleCheckbox = new Checkbox({checked:this.allUncheckedVisible,color:config.ufosTable.allVisibleCheckboxColor,css:"checkbox-white",mode:"half"});

		this.tableHeight = ko.observable(config.windows.ufosTable.tableHeight);
		this.checkedTableHeight = ko.observable(config.windows.ufosTable.checkedTableHeight);
		this.distToGoalText = ko.computed(function() {
			if (self.raceType() == "opendistance") return "Dist, km";
			else return "Dist to<br>goal, km";
		});
		this.checkedTableTotalHeight = ko.computed(function() {
			return self.checkedLength() * config.windows.ufosTable.tableRowHeight;
		});
		this.checkedTableTotalHeight.subscribe(function(h) {
			if (self._manuallyResized) {
				if (h < self.checkedTableHeight()) {
					self.checkedTableHeight(h);
					self._manuallyResized = false;
				}
			}
			else {
				var newHeight = Math.min(h,config.windows.ufosTable.checkedTableHeight);
				if (newHeight != self.checkedTableHeight()) {
					self.tableHeight(Math.max(self.tableHeight()+self.checkedTableHeight()-newHeight,config.windows.ufosTable.tableMinHeight));
					self.checkedTableHeight(newHeight);
				}
			}
			self.updateScroll();
			self.updateScroll();
		});
	}

	UfosTable.prototype.sortTableRows = function() {
		var self = this;
		this.tableUfos.sort(function(a,b) {
			var undef1 = !a || !a.tableData || a.noData();
			var undef2 = !b || !b.tableData || b.noData();
			if (undef1 || undef2) return undef1 && undef2 ? 0 : (undef1 ? 1 : -1);
			var d1 = a.tableData.dist()>0 ? a.tableData.dist() : null;
			var d2 = b.tableData.dist()>0 ? b.tableData.dist() : null;
			var s1 = a.tableData.state ? a.tableData.state() : null;
			var s2 = b.tableData.state ? b.tableData.state() : null;
			var c1 = a.tableData.stateChangedAt ? a.tableData.stateChangedAt() : null;
			var c2 = b.tableData.stateChangedAt ? b.tableData.stateChangedAt() : null;
			if (s1 == null && s2 != null) return 1;
			if (s1 != null && s2 == null) return -1;
			if (s1 == "finished" && s2 == "finished") {
				if (c1 && c2) return c1 == c2 ? 0 : (c1 < c2 ? -1 : 1);
				if (c1) return 1;
				if (c2) return -1;
				return 0;
			}
			else if (s1 == "finished") return -1;
			else if (s2 == "finished") return 1;
			if (s1 == "landed" && s2 != "landed") return 1;
			if (s2 == "landed" && s1 != "landed") return -1;
			if (d1 != null && d2 != null) {
				d1 = Math.floor(d1*10);
				d2 = Math.floor(d2*10);
				if (self.raceType() == "opendistance")
					return d1 == d2 ? 0 : (d1 < d2 ? 1 : -1);
				else
					return d1 == d2 ? 0 : (d1 < d2 ? -1 : 1);
			}
			if (d2 != null) return 1;
			if (d1 != null) return -1;
			return 0;
		});
		for (var i = 0, l = this.tableUfos().length; i < l; i++)
			this.tableUfos()[i].i(i+1);
	}

	UfosTable.prototype.getTimeStr = function(h,m,s) {
		return (h<10?"0":"") + h + ":" + (m<10?"0":"") + m + ":" + (s<10?"0":"") + s;
	}

	UfosTable.prototype.createUfo = function(data) {
		var self = this;
		var w = {
			id: data.id,
			name: data.name,
			country: data.country,
			color: data.color,
			state: data.state,
			stateChangedAt: data.stateChangedAt,
			dist: data.dist,
			visible: data.visible,
			checked: data.checked,
			highlighted: data.highlighted,
			trackVisible: data.trackVisible,
			noData: data.noData,
			position: data.position,
			tableData: data.tableData
		}
		w.i = ko.observable(0);
		w.tableData.distFrom = ko.computed(function() {
			return w.tableData.dist() > 0 ? Math.floor((self.optdistance() - w.tableData.dist())*10)/10 : Math.floor(self.optdistance()*10)/10;
		});
		w.visibleCheckboxColor = ko.computed(function() {
			return w.checked() ? w.color() : "rgba(0,47,64,0.75)";
		});
		w.visibleCheckbox = new Checkbox({checked:w.visible,color:w.visibleCheckboxColor});
		w.finishedTime = ko.computed(function() {
			if (!w.tableData || !w.tableData.state || w.tableData.state()!="finished" || !w.tableData.stateChangedAt || !w.tableData.stateChangedAt()) return null;
			var d = Math.abs(w.tableData.stateChangedAt() - Math.floor(self.raceKey()/1000));
			return self.getTimeStr(Math.floor(d/3600),Math.floor(d%3600/60),d%60);
		});
		w.speed = ko.computed(function() {
			if (!(w.tableData.gSpd()>=0)) return "";
			return Math.floor(w.tableData.gSpd()*36)/10;
		});
		w.country3 = ko.computed(function() {
			return w.country() && countryCodes[w.country()] ? countryCodes[w.country()] : w.country();
		});
		w.switchCheck = function() {
			w.checked(!w.checked());
			// при перемещении пилотов из одной таблицы в другую не срабатывает событие mouseout (поскольку до этого перестраивается дом)
			w.highlighted(false);
		}
		w.switchTracking = function() {

		}
		w.highlightOn = function() {
			w.highlighted(true);
		}
		w.highlightOff = function() {
			w.highlighted(false);
		}
		w.centerMap = function() {
			if (w.position() && w.position().lat && w.position().lng) {
				self.emit("centerMap",w.position());
				self.emit("zoominMap",config.trackingZoom);
			}
		}
		w.checkedSubscribe = w.checked.subscribe(function(v) {
			if (v && self.allCheckedVisible() == 1) w.visible(true);
			else if (v && self.allCheckedVisible() == 0) w.visible(false);
			else if (!v && self.allUncheckedVisible() == 1) w.visible(true);
			else if (!v && self.allUncheckedVisible() == 0) w.visible(false);
		});
		return w;
	}

	UfosTable.prototype.destroyUfo = function(ufo) {
		w.allCheckedVisible.dispose();
	}

	UfosTable.prototype.windowDrag = function(self,e) {
		if (this.modalWindow)
			this.modalWindow.emit("dragStart",this.modalWindow,e);
	}

	UfosTable.prototype.windowClose = function() {
		if (this.modalWindow)
			this.modalWindow.visible(false);
	}

	UfosTable.prototype.windowSwitchMode = function() {
		var self = this;
		if (this.mode() == "short") {
			if (this.modalWindow)
				this.modalWindow.width(config.windows.ufosTable.wideWidth);
			// В css при изменении ширины идет transition: width 0.5s, поэтому здесь - костыльный таймаут
			setTimeout(function() {
				self.mode("full");
			},500);
		}
		else {
			this.mode("short");
			this.modalWindow.width(config.windows.ufosTable.width);
		}
	}

	UfosTable.prototype.updateScroll = function(type) {
		var self = this;
		if (this._updatingScroll) {
			this._needUpdateScroll = true;
			return;
		}
		this._updatingScroll = true;
		this._needUpdateScroll = false;
		if (this.checkedScrollbarContainer)
			this.checkedScrollbarContainer.tinyscrollbar_update("relative");
		if (this.uncheckedScrollbarContainer)
			this.uncheckedScrollbarContainer.tinyscrollbar_update("relative");
		setTimeout(function() {
			self._updatingScroll = false;
			if (self._needUpdateScroll)
				self.updateScroll();
		},200);
	}

	UfosTable.prototype.getEventCoords = function(e,eventType) {
		if (eventType == "touch") {
			if (e.originalEvent) e = e.originalEvent;
			if (e.touches && e.touches.length > 0)
				return {pageX:e.touches[0].clientX,pageY:e.touches[0].clientY};
			if (e.changedTouches && e.changedTouches.length > 0)
				return {pageX:e.changedTouches[0].clientX,pageY:e.changedTouches[0].clientY};
			if (e.targetTouches && e.targetTouches.length > 0)
				return {pageX:e.targetTouches[0].clientX,pageY:e.targetTouches[0].clientY};
		}
		else
			return {pageX:e.pageX,pageY:e.pageY};
	}

	UfosTable.prototype.resizeTable = function(type,obj,e) {
		var self = this;
		var eventType = e.type.match(/^touch/) ? "touch" : "mouse";
		var startE = this.getEventCoords(e,eventType);
		var cursor = e.target ? $(e.target).css("cursor") : "";
		var height = type=="checked" ? this.checkedTableHeight : this.tableHeight;
		var startHeight = height();
		if (type == "checked")
			this._manuallyResized = true;
		var mouseMove = function(e) {
			e = self.getEventCoords(e,eventType);
			var h = Math.max(e.pageY-startE.pageY+startHeight,type=="checked"?config.windows.ufosTable.checkedTableMinHeight:config.windows.ufosTable.tableMinHeight);
			if (type == "checked") h = Math.min(h,self.checkedTableTotalHeight());
			height(h);
			self.updateScroll();
		}
		$("body").addClass("airvis-document-overwrite-cursor-" + cursor);
		$(document).on("mousemove touchmove",mouseMove).one("mouseup mouseleave touchend touchcancel",function(e) {
			$("body").removeClass("airvis-document-overwrite-cursor-" + cursor);
			$(document).off("mousemove touchmove",mouseMove);
		});
	}

	UfosTable.prototype.domInit = function(element, params) {
		var self = this;
		this.modalWindow = params.modalWindow;
		var div = ko.virtualElements.firstChild(element);
		while (div && div.nodeType != 1)
			div = ko.virtualElements.nextSibling(div);
		this.container = $(div);
		this.checkedScrollbarContainer = this.container.find("#airvis-scrollbar-checked").tinyscrollbar({margin:10});
		this.uncheckedScrollbarContainer = this.container.find("#airvis-scrollbar-unchecked").tinyscrollbar({margin:10});
	};

	UfosTable.prototype.templates = ["main"];

	return UfosTable;
});
