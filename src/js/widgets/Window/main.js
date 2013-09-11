define(["jquery","knockout"],function($,ko) {

	var Window = function(options) {
		var self = this;

		var defaults = {
			visible: true,
			nodes: [],
			width: 300,
			height: "auto",
			top: 0,
			left: 0,
			right: 0,
			bottom: 0,
			xPosition: "left",	// допускается left, center, right
			yPosition: "top",	// допускается top, middle, bottom
			contentCss: "",
			menuTitle: "",
			menuTitlePosition: "left",
			touched: false // проставляется при первом драге, если драгов не было и xPosition=center, при ресайзе окна ставится опять посередине
		}

		if (!options) options = {};

		self.visible = this.asObservable(options.visible,defaults.visible);
		self.touched = this.asObservable(options.touched,defaults.touched);
		self.width = this.asObservable(options.width,defaults.width);
		self.height = this.asObservable(options.height,defaults.height);
		self.top = this.asObservable(options.top,defaults.top);
		self.left = this.asObservable(options.left,defaults.left);
		self.right = this.asObservable(options.right,defaults.right);
		self.bottom = this.asObservable(options.bottom,defaults.bottom);
		self.xPosition = this.asObservable(options.xPosition,defaults.xPosition);
		self.yPosition = this.asObservable(options.yPosition,defaults.yPosition);
		self.contentCss = this.asObservable(options.contentCss,defaults.contentCss);
		self.menuTitlePosition = this.asObservable(options.menuTitlePosition,defaults.menuTitlePosition);
		self.menuTitle = this.asObservable(options.menuTitle,defaults.menuTitle);

		self.nodes = ko.observableArray(defaults.nodes);

		self._visible = ko.observable(self.visible());
		self._opacity = ko.observable(1);

		self.cssPosition = ko.computed(function() {
			var out = {opacity:self._opacity()};
			if (self.width() && self.width()!="auto") 
				out.width = self.width() + "px";
			if (self.top() && self.top()!="auto")
				out.top = self.top() + "px";
			if (self.left() && self.left()!="auto")
				out.left = self.left() + "px";
			return out;
		});

		// Хак для transition у display, порядок проставления свойств имеет значение, 0 у opacity - в кавычках
		self._visTimeout = null;
		self.visible.subscribe(function(v) {
			if (v) {
				self._opacity("0");
				self._visible(true);
				clearTimeout(self._visTimeout);
				self._visTimeout = setTimeout(function() {
					self._opacity("1");
				},50);
			}
			else {
				self._visible(true);
				self._opacity("0");
				clearTimeout(self._visTimeout);
				self._visTimeout = setTimeout(function() {
					self._visible(false);
				},1000);
			}
		});
	}


	Window.prototype.recomputePosition = function() {
		if (this.touched()) return;
		var wW = $(window).width();
		var wH = $(window).height();
		if (this.xPosition() == "right" && this.right() && this.right()!="auto" && this.width()>0) this.left(wW-this.right()-this.width());
		if (this.xPosition() == "center" && this.width()>0) this.left(Math.floor((wW-this.width())/2));
		if (this.yPosition() == "bottom" && this.bottom() && this.bottom()!="auto" && this.height()>0) this.top(wH-this.bottom()-this.height());
		if (this.yPosition() == "middle" && this.height()>0) this.top(Math.floor((wH-this.height())/2));
	}

	Window.prototype.domInit = function(element,params,parentElement) {
		var self = this;
		if (params.data.savedNodes)
			this.nodes(params.data.savedNodes);
		if (params.contentCss)
			this.contentCss(params.contentCss);
		this.recomputePosition();
		this.on("dragStart",function() {
			self.touched(true);
		});

		this.windowResize = function() {
			if (!self.touched())
				self.recomputePosition();
		}

		$(window).on("resize",this.windowResize);
	}

	Window.prototype.domDestroy = function() {
		$(window).off("resize",this.windowResize);
	}

	Window.prototype.asObservable = function(v,defaultV) {
		if (ko.isObservable(v) || ko.isComputed(v)) return v;
		return ko.observable(typeof v == "function" ? v() : (typeof v == "undefined" ? defaultV : v));
	}

	Window.prototype.templates = ["main"];

	return Window;
});