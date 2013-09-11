define(["jquery","knockout"],function($,ko) {

	var Window = function(options) {
		var self = this;

		var defaults = {
			showHeader: true,
			absoluteCloseIcon: false,
			closeCrossIcon: false,
			visible: true,
			resizable: true,
			resizableY: false,
			resizableX: false,
			contentCss: "",
			title: "",
			menuTitlePosition: "left",
			nodes: [],
			width: 300,
			height: "auto",
			top: 0,
			left: 0,
			right: 0,
			bottom: 0,
			minWidth: 0,
			minHeight: 0,
			xPosition: "left",
			yPosition: "top"
		}

		if (!options) options = {};

		self.showHeader = this.asObservable(options.showHeader,defaults.showHeader);
		self.absoluteCloseIcon = this.asObservable(options.absoluteCloseIcon,defaults.absoluteCloseIcon);
		self.closeCrossIcon = this.asObservable(options.closeCrossIcon,defaults.closeCrossIcon);
		self.visible = this.asObservable(options.visible,defaults.visible);
		self.resizable = this.asObservable(options.resizable,defaults.resizable);
		self.resizableY = this.asObservable(options.resizableY,defaults.resizableY);
		self.resizableX = this.asObservable(options.resizableX,defaults.resizableX);
		self.contentCss = this.asObservable(options.contentCss,defaults.contentCss);
		self.title = this.asObservable(options.title,defaults.title);
		self.menuTitlePosition = this.asObservable(options.menuTitlePosition,defaults.menuTitlePosition);
		self.width = this.asObservable(options.width,defaults.width);
		self.height = this.asObservable(options.height,defaults.height);
		self.top = this.asObservable(options.top,defaults.top);
		self.left = this.asObservable(options.left,defaults.left);
		self.right = this.asObservable(options.right,defaults.right);
		self.bottom = this.asObservable(options.bottom,defaults.bottom);
		self.minWidth = this.asObservable(options.minWidth,defaults.minWidth);
		self.minHeight = this.asObservable(options.minHeight,defaults.minHeight);
		self.xPosition = this.asObservable(options.xPosition,defaults.xPosition);
		self.yPosition = this.asObservable(options.yPosition,defaults.yPosition);

		self.buttonOn = ko.observable(this.visible());

		self.nodes = ko.observableArray(defaults.nodes);
		self.css = ko.observable({});

		self.cssPosition = ko.computed(function() {
			var out = {};
			if (self.width()) 
				out.width = self.width() + (self.width()=="auto"?"":"px");
			if (self.height()) 
				out.height = self.height() + (self.height()=="auto"?"":"px");
			if (self.top()) 
				out.top = self.top() + (self.top()=="auto"?"":"px");
			if (self.left()) 
				out.left = self.left() + (self.left()=="auto"?"":"px");
			return out;
		});

		self.visible.subscribe(function(v) {
			if (v) self.setAbsoluteContentPosition();
			self.emit(v?"open":"close");
		});
	}

	Window.prototype.hide = function(self,e) {
		this.slideUp(e);
	}

	Window.prototype.show = function(self,e) {
		this.slideDown(e);
	}

	Window.prototype.domInit = function(element,params,parentElement) {
		if (params.data.savedNodes)
			this.nodes(params.data.savedNodes);
		if (params.contentCss)
			this.contentCss(params.contentCss);

		var div = ko.virtualElements.firstChild(element);
		while (div && div.nodeType != 1)
			div = ko.virtualElements.nextSibling(div);

		this.container = $(div);

		if (div) {
			var obj = $(div);
			this.width(obj.width());
			this.height(obj.height());

			var windowWidth = $(window).width();
			if (this.width() >= windowWidth && this.minWidth() > 0) {
				if (windowWidth > this.minWidth() + 10)
					this.width(windowWidth - 10);
				else
					this.width(this.minWidth());
			}

			if (this.xPosition() == "center") {
				var x = Math.floor(($(window).width()-this.width())/2);
				this.left(x);
			}
			if (this.xPosition() == "right") {
				var x = $(window).width() - this.width() - this.right();
				this.left(x);
			}
			if (this.yPosition() == "middle") {
				var y = Math.floor(($(window).height()-this.height())/2);
				this.top(y);
			}
			if (this.yPosition() == "bottom") {
				var y = $(window).height() - this.height() - this.bottom();
				this.top(y);
			}
			this.setAbsoluteContentPosition();
		}
	}

	Window.prototype.setAbsoluteContentPosition = function() {
		if (!this.container || !this.visible()) return;
		var content = this.container.find(".airvis-window-content");
		var position = content.position();
		content.addClass("airvis-window-content-absolute").css({top:position.top+"px",left:position.left+"px"});		
	}

	Window.prototype.asObservable = function(v,defaultV) {
		if (ko.isObservable(v) || ko.isComputed(v)) return v;
		return ko.observable(typeof v == "function" ? v() : (typeof v == "undefined" ? defaultV : v));
	}

	Window.prototype.dragStart = function(self,e) {
		this.emit("dragStart",self,e);
	}

	Window.prototype.resizeStart = function(dir,self,e) {
		this.emit("resizeStart",dir,self,e);
	}

	Window.prototype.registerSwitch = function(node) {
		this.switchNode = node;
	}

	Window.prototype.unregisterSwitch = function() {
		delete this.switchNode;
	}

	Window.prototype.slideSwitch = function() {
		if (this.visible()) this.slideUp();
		else this.slideDown();
	}

	Window.prototype.slideUp = function() {
		var self = this;
		this.buttonOn(false);
		this.container.fadeOut("fast",function() {
			self.visible(false);
      self.emit('hided');
		});
/*
		this.visible(false);
		if (this.switchNode) {
			var target = $(this.switchNode);
			var sq = $("<div class='airvis-slideSq'></div>").appendTo("body");
			sq.css({
				top: this.top() + "px",
				left: this.left() + "px",
				width: this.width() + "px",
				height: this.height() + "px"
			}).animate({
				top: target.offset().top + "px",
				left: target.offset().left + "px",
				width: target.outerWidth() + "px",
				height: target.outerHeight() + "px"
			},400,function() {
				sq.remove();
			});
		}
*/
	}

	Window.prototype.slideDown = function() {
		var self = this;
		this.buttonOn(true);
		this.container.fadeIn("fast",function() {
			self.visible(true);
      self.emit('showed');
		});
/*		
		if (this.switchNode) {
			var target = $(this.switchNode);
			var sq = $("<div class='airvis-slideSq'></div>").appendTo("body");
			sq.css({
				top: target.offset().top + "px",
				left: target.offset().left + "px",
				width: target.outerWidth() + "px",
				height: target.outerHeight() + "px"
			}).animate({
				top: this.top() + "px",
				left: this.left() + "px",
				width: this.width() + "px",
				height: this.height() + "px"
			},400,function() {
				sq.remove();
				self.visible(true);
			});
		}
		else
			self.visible(true);
*/
	}

	Window.prototype.templates = ["main"];

	return Window;
});