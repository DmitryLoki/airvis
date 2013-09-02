define(["jquery","knockout","widget!Checkbox","./Ufo","config","jquery.tinyscrollbar"], function($,ko,Checkbox,Ufo,config) {
	var UfosTable = function(options) {
		var self = this;

		this.ufos = options.ufos;
		this.raceKey = options.raceKey;
		this.raceType = options.raceType;
		this.optdistance = options.optdistance;
		this.trackedUfoId = options.trackedUfoId;

		this.inModalWindow = ko.observable(false);
		this.mode = ko.observable(config.ufosTable.mode);

		this._q = ko.observable("");
		this.q = ko.computed({
			read: this._q,
			write: function(v) {
				self._q(v);
			}
		}).extend({throttle:200});

		this.tableUfos = ko.observableArray([]);
		ko.utils.sync({
			source: this.ufos,
			target: this.tableUfos,
			onAdd: function(ufo) {
				return new Ufo(ufo,self);
			},
			afterAdd: function() {
				self.sortTableRows();
				self.updateScroll();
				self.updateScroll();
			}
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

		this.qTableUfos = ko.computed(function() {
			self.updateScroll();
			self.updateScroll();
			if (self.q().length == 0) return self.tableUfos();
			var q_ar = self.q().toLowerCase().split(/ /);
			var countries = {};
			var out = $.grep(self.tableUfos(),function(ufo) {
				if (ufo.checked()) return;
				var str = (" " + ufo.name() + " #" + ufo.id() + " " + ufo.id()).replace(/\s*\.\s*/," ").toLowerCase();
				var country_str = (" " + ufo.country3()).toLowerCase();
				var found = false;
				q_ar.forEach(function(q) {
					if (!q || q.length == 0) return;
					var r = new RegExp(" "+q);
					if (str.match(r))
						found = true;
					if (country_str.match(r)) {
						if (!countries[ufo.country3()]) countries[ufo.country3()] = [];
						countries[ufo.country3()].push(ufo);
					}
				});
				return found;
			});
			$.each(countries,function(code,ufos) {
				out.push(self.createCountry(code,ufos));
				ufos.forEach(function(ufo) {
					out.push(ufo);
				});
			});
			return out;
		});
	}

	UfosTable.prototype.uncheckAll = function() {
		this.tableUfos().forEach(function(ufo) {
			ufo.checked(false);
		});
	}

	UfosTable.prototype.sortTableRows = function() {
		var self = this;
		this.tableUfos.sort(function(a,b) {
			var alphabetical = (a.name().replace(/^.*?\.\s*/,"")<b.name().replace(/^.*?\.\s*/,"")?-1:1);
			var undef1 = !a || a.noData();
			var undef2 = !b || b.noData();
			if (undef1 || undef2) return undef1 && undef2 ? alphabetical : (undef1 ? 1 : -1);
			var d1 = a.dist()>0 ? a.dist() : null;
			var d2 = b.dist()>0 ? b.dist() : null;
			var s1 = a.state ? a.state() : null;
			var s2 = b.state ? b.state() : null;
			var c1 = a.stateChangedAt ? a.stateChangedAt() : null;
			var c2 = b.stateChangedAt ? b.stateChangedAt() : null;

			if (s1 == null && s2 != null) return 1;
			if (s1 != null && s2 == null) return -1;
			if (s1 == "finished" && s2 == "finished") {
				if (c1 && c2) return c1 == c2 ? alphabetical : (c1 < c2 ? -1 : 1);
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
					return d1 == d2 ? alphabetical : (d1 < d2 ? 1 : -1);
				else
					return d1 == d2 ? alphabetical : (d1 < d2 ? -1 : 1);
			}
			if (d2 != null) return 1;
			if (d1 != null) return -1;
			return 0;
		});
		for (var i = 0, l = this.tableUfos().length; i < l; i++)
			this.tableUfos()[i].i(i+1);
	}

	UfosTable.prototype.sort = function() {
		var self = this;
		if (this._sorting) {
			this._sortRequired = true;
			return;
		}
		this._sorting = true;
		clearTimeout(this._sortingTimeout);
		this.sortTableRows();
		this._sortingTimeout = setTimeout(function() {
			self._sorting = false;
			if (self._sortRequired) {
				self._sortRequired = false;
				self.sort();
			}
		},config.table.sortingTimeout);
	}

	UfosTable.prototype.clearSearch = function() {
		this._q("");
	}

	UfosTable.prototype.showCountries = function() {

	}

	UfosTable.prototype.showTop = function() {

	}

	UfosTable.prototype.showInfo = function() {

	}

	UfosTable.prototype.getTimeStr = function(h,m,s) {
		return (h<10?"0":"") + h + ":" + (m<10?"0":"") + m + ":" + (s<10?"0":"") + s;
	}

	UfosTable.prototype.createCountry = function(code,ufos) {
		var self = this;
		var w = {
			code: code,
			length: ufos.length,
			rowType: "country"
		}
		w.checkAll = function() {
			ufos.forEach(function(ufo) {
				ufo.checked(true);
			});
		}
		return w;
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

		this.isReady = true;
		this.emit("ready");
	};

	UfosTable.prototype.templates = ["main"];

	return UfosTable;
});
