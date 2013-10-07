define(["jquery","knockout","widget!Checkbox","./Ufo","config","jquery.tinyscrollbar"], function($,ko,Checkbox,Ufo,config) {
	var UfosTable = function(options) {
		var self = this;

		this.$ = $;
		this.ufos = options.ufos;
		this.raceType = options.raceType;
		this.trackedUfoId = options.trackedUfoId;
		this.cookiesEnabled = options.cookiesEnabled;

		this.inModalWindow = ko.observable(false);

		// Расширенная или свернутая таблица
		this.windowMode = ko.observable(config.windows.ufosTable.windowMode);

		/* Режим показа: 
			default - обычные пилоты
			search - когда что-то вбито в строку поиска
			countries - когда нужно показать все страны, а в поиске "Countries"
			checkLeading - когда показываются опции для выбора top5-top10 leading
			leading - когда показываются leading-пилоты, а под ними - остальные
		*/
		this.mode = ko.observable("default");

		/*
			сортировка пилотов:
			rating - по рейтингу
			altitude - по высоте
		*/
		this.order = ko.observable("rating");
		this.order.subscribe(function(v) {
			self.sort();
			self.sort();
		});

		this._q = ko.observable(this.cookiesEnabled()?$.cookie("searchQuery")||"":"");
		this.q = ko.computed({
			read: self._q,
			write: function(v) {
				if (self.cookiesEnabled()) $.cookie("searchQuery",v);
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

		// при изменении checked или visible у tablePilots c throttle в секунду обновляем куки
		// при этом основываемся на this.ufos, потому что this.tableUfos пересортируются раз в 5 секунд при плее.
		this.checkedCookie = ko.computed(function() {
			var ar = [];
			self.ufos().forEach(function(ufo) {
				if (ufo.checked()) ar.push(ufo.id());
			});
			if (!self.isReady || !self.cookiesEnabled()) return;
			$.cookie("checkedUfos",ar.join(","));
		}).extend({throttle:1000});
		this.visibleCookie = ko.computed(function() {
			var ar = [];
			self.ufos().forEach(function(ufo) {
				if (!ufo.visible()) ar.push(ufo.id());
			});
			if (!self.isReady || !self.cookiesEnabled()) return;
			$.cookie("invisibleUfos",ar.join(","));
		}).extend({throttle:1000});

		this.leadingCnt = ko.observable(0);
		this.leadingOptions = [
			{cnt:5,text:"Top 5 leading",order:"rating"},
			{cnt:10,text:"Top 10 leading",order:"rating"},
			{cnt:20,text:"Top 20 leading",order:"rating"},
			{cnt:30,text:"Top 30 leading",order:"rating"},
			{text:"sep"},
			{cnt:5,text:"Top 5 altitude",order:"altitude"},
			{cnt:10,text:"Top 10 altitude",order:"altitude"},
			{cnt:20,text:"Top 20 altitude",order:"altitude"},
			{cnt:30,text:"Top 30 altitude",order:"altitude"}
		];
		this.leadingCounter = ko.computed(function() {
			for (var i = 0; i < self.tableUfos().length; i++)
				self.tableUfos()[i].leading(i<self.leadingCnt());
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
		}).extend({throttle:50});
		this.allCheckedVisibleCheckbox = new Checkbox({checked:this.allCheckedVisible,color:config.windows.ufosTable.allCheckboxColor,css:"checkbox-white",mode:"half"});

		this.allUncheckedVisible = ko.computed({
			read: function() {
				var total = 0, visible = 0;
				self.tableUfos().forEach(function(w) {
					if (w.checked()) return;
					if (self.mode() == "leading" && !w.leading()) return;
					if (w.visible()) visible++;
					total++;
				});
				return total==visible?1:(visible>0?2:0);
			},
			write: function(val) {
				self.tableUfos().forEach(function(w) {
					if (w.checked()) return;
					if (self.mode() == "leading" && !w.leading()) return;
					w.visible(val==1);
				});
			}
		}).extend({throttle:50});
		this.allUncheckedVisibleCheckbox = new Checkbox({checked:this.allUncheckedVisible,color:config.windows.ufosTable.allCheckboxColor,css:"checkbox-white",mode:"half"});

		this.allNonLeadingVisible = ko.computed({
			read: function() {
				var total = 0; visible = 0;
				self.tableUfos().forEach(function(w) {
					if (w.checked() || w.leading()) return;
					if (w.visible()) visible++;
					total++;
				});
				return total==visible?1:(visible>0?2:0);
			},
			write: function(val) {
				self.tableUfos().forEach(function(w) {
					if (w.checked() || w.leading()) return;
					w.visible(val==1);
				});
			}
		}).extend({throttle:50});
		this.allNonLeadingVisibleCheckbox = new Checkbox({checked:this.allNonLeadingVisible,color:config.windows.ufosTable.allCheckboxColor,css:"checkbox-white",mode:"half"});

		this.tableHeight = ko.observable(config.windows.ufosTable.tableHeight);
		this.checkedTableHeight = ko.observable(0);
		this.checkedTableTotalHeight = ko.computed(function() {
			return self.checkedLength() * config.windows.ufosTable.tableRowHeight + config.windows.ufosTable.firstTableRowOffset;
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

		// Сложный код с qTableCountries обусловлен желанием меньше обновлять дом
		this._qTableCountries = ko.observableArray([]);
		this.qTableCountries = ko.observableArray([]);
		ko.utils.sync({
			source: this._qTableCountries,
			target: this.qTableCountries,
			onAdd: function(w) {
				return self.createCountry(w.id,w.expand,w.ufos);
			},
			afterAdd: function() {
				self.updateScroll();
				self.updateScroll();				
			}
		});

		this.qTableUfos = ko.computed(function() {
			self.updateScroll();
			self.updateScroll();
			var countries = [], c = {}, out = [];
			if (self.q().length == 0) {
				self._qTableCountries([]);
				self.mode("default");
			}
			else if (self.q() == "Countries") {
				self.mode("countries");
				self.tableUfos().forEach(function(ufo) {
					if (ufo.checked()) return;
					if (!c[ufo.country3()]) c[ufo.country3()] = [];
					c[ufo.country3()].push(ufo);
				});
				$.map(c,function(v,i){return i;}).sort().forEach(function(i) {
					countries.push({id:i,expand:false,ufos:c[i]});
				});
				self._qTableCountries(countries);
			}
			else if (self.q() == "Top leading") {
				self.mode("checkLeading");
			}
			else if (self.q().match(/Top \d+ leading/)) {
				var m = self.q().match(/Top (\d+) leading/);
				self.leadingCnt(m[1]);
				self.mode("leading");
				self.order("rating");
			}
			else if (self.q().match(/Top \d+ altitude/)) {
				var m = self.q().match(/Top (\d+) altitude/);
				self.leadingCnt(m[1]);
				self.mode("leading");
				self.order("altitude");
			}
			else {
				self.mode("search");
				var q_ar = self.q().toLowerCase().split(/ /);
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
							if (!c[ufo.country3()]) c[ufo.country3()] = [];
							c[ufo.country3()].push(ufo);
						}
					});
					return found;
				});
				$.map(c,function(v,i){return i;}).sort().forEach(function(i) {
					countries.push({id:i,expand:true,ufos:c[i]});
				});
				self._qTableCountries(countries);
			}
			if (self.mode() !== "leading") {
				self.leadingCnt(0);
				self.order("rating");
			}
			return out;
		});
	}

	UfosTable.prototype.uncheckAll = function() {
		this.tableUfos().forEach(function(ufo) {
			ufo.checked(false);
		});
	}

	UfosTable.prototype.rowComparator = function(a,b,type) {
		var alphabetical = (a.name().replace(/^.*?\.\s*/,"")<b.name().replace(/^.*?\.\s*/,"")?-1:1);
		var undef1 = !a || a.noData();
		var undef2 = !b || b.noData();
		if (undef1 || undef2) return undef1 && undef2 ? alphabetical : (undef1 ? 1 : -1);
		var d1 = type=="altitude"?-a.tData.alt:a.tData.dist;
		var d2 = type=="altitude"?-b.tData.alt:b.tData.dist;
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
			if (this.raceType() == "opendistance")
				return d1 == d2 ? alphabetical : (d1 < d2 ? 1 : -1);
			else
				return d1 == d2 ? alphabetical : (d1 < d2 ? -1 : 1);
		}
		if (d2 != null) return 1;
		if (d1 != null) return -1;
		return 0;
	}

	UfosTable.prototype.rowSorter = function(type) {
		var self = this;
		return function(a,b) {
			return self.rowComparator(a,b,type);
		}
	}

	UfosTable.prototype.sortTableRows = function() {
		var self = this;
		this.tableUfos.sort(self.rowSorter(self.order()));
		if (self.order() == "altitude") {
			var ar = [], ar2id = {};
			self.tableUfos().forEach(function(item,i) {
				ar.push(item);
				ar2id[item.id()] = i;
			});
			ar.sort(self.rowSorter("rating"));
			for (var i = 0; i < ar.length; i++)
				self.tableUfos()[ar2id[ar[i].id()]].i(i+1);
		}
		else {
			for (var i = 0, l = this.tableUfos().length; i < l; i++)
				this.tableUfos()[i].i(i+1);
		}
	}

	UfosTable.prototype.update = function() {
		var self = this;
		if (this._updating) {
			this._updateRequired = true;
			return;
		}
		this._updating = true;
		clearTimeout(this._updatingTimeout);
		this.tableUfos().forEach(function(ufo) {
			ufo.updateTableData();
		});
		this.sortTableRows();
		this._updatingTimeout = setTimeout(function() {
			self._updating = false;
			if (self._updateRequired) {
				self._updateRequired = false;
				self.update();
			}
		},config.table.updatingTimeout);
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
		this.q("");
	}

	UfosTable.prototype.switchCountriesMode = function() {
		if (this.mode() == "countries") {
			this.clearSearch();
		}
		else {
			this.q("Countries");
		}
	}

	UfosTable.prototype.switchLeadingMode = function() {
		if (this.mode() == "leading" || this.mode() == "checkLeading") {
			this.clearSearch();
		}
		else {
			this.q("Top leading");
		}
	}

	UfosTable.prototype.setLeading = function(item) {
		this.leadingCnt(item.cnt);
		this.order(item.order);
		this.q(item.text);
	}

	UfosTable.prototype.showInfo = function() {

	}

	UfosTable.prototype.createCountry = function(id,expanded,ufos) {
		var self = this;
		var w = {
			id: id,
			code: id,
			ufos: ufos,
			expanded: ko.observable(expanded),
			rowType: "country"
		}
		w.checkAll = function() {
			ufos.forEach(function(ufo) {
				ufo.checked(true);
			});
			self.updateScroll();
			self.updateScroll();
		}
		w.switch = function() {
			w.expanded(!w.expanded());
			self.updateScroll();
			self.updateScroll();
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
		if (this.windowMode() == "short") {
			if (this.modalWindow)
				this.modalWindow.width(config.windows.ufosTable.wideWidth);
			// В css при изменении ширины идет transition: width 0.5s, поэтому здесь - костыльный таймаут
			setTimeout(function() {
				self.windowMode("full");
			},500);
		}
		else {
			this.windowMode("short");
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

    UfosTable.prototype.keepWindowOnDefaultPosition = function(){
        if(this.modalWindow) {
            this.modalWindow.visible.subscribe(function(visible){
                if(visible) {
                    self.modalWindow.left(config.windows.ufosTable.left);
                    self.modalWindow.top(config.windows.ufosTable.top);
                }
            })
        }
    }

	UfosTable.prototype.domInit = function(element, params) {
		var self = this;
		this.modalWindow = params.modalWindow;
        //При открытии окна ставим его нa координаты по умолчанию
        this.keepWindowOnDefaultPosition();
		var div = ko.virtualElements.firstChild(element);
		while (div && div.nodeType != 1)
			div = ko.virtualElements.nextSibling(div);
		this.container = $(div);
		this.checkedScrollbarContainer = this.container.find("#airvis-scrollbar-checked").tinyscrollbar({margin:10});
		this.uncheckedScrollbarContainer = this.container.find("#airvis-scrollbar-unchecked").tinyscrollbar({margin:10});

		this.isReady = true;
		this.emit("ready");
	};

	UfosTable.prototype.templates = ["main","table","row"];

	return UfosTable;
});
