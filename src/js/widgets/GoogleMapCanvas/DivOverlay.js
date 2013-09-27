define(["jquery","google.maps","EventEmitter","./BasicOverlay"],function($,gmaps,EventEmitter,BasicOverlay) {

	var DivOverlay = function(options) {
		this._map = options.map;
		this._z = options.z;
		this._container = options.container;
		this._mapDiv = this._map.getDiv();
		this._onAddCallback = options.onAdd;
		this.setMap(this._map);
	}

	DivOverlay.prototype = new BasicOverlay();

	DivOverlay.prototype.setContainerSize = function(w,h) {
		if (!this._container) return;
		this._container.style.width = 0;
		this._container.style.height = 0;
	}

	DivOverlay.prototype.setContainerOffset = function(l,t) {
		if (!this._container) return;
		this._container.style.left = Math.floor(l) + "px";
		this._container.style.top = Math.floor(t) + "px";
	}

	DivOverlay.prototype.clear = function() {
        if(!this._container) return;
       	this._container.innerHTML = "";
	}

	DivOverlay.prototype.onAdd = function() {
		this._container = document.createElement("container");
		this._container.style.position = "absolute";
		if (this._z > 0)
			this._container.style.zIndex = this._z;
		this.getPanes().floatPane.appendChild(this._container);
		this.relayout("onAdd DivOverlay");
		if (typeof this._onAddCallback === "function")
			this._onAddCallback();
	}

	DivOverlay.prototype.onRemove = function() {
		if (!this._container) return;
		this._container.parentNode.removeChild(this._container);
	}

	DivOverlay.prototype.getContainer = function() {
		return this._container;
	}

	DivOverlay.prototype.addChild = function(child) {
		if (!this._container) return;
		this._container.appendChild(child);
	}

	DivOverlay.prototype.removeChild = function(child) {
		if (!this._container) return;
		this._container.removeChild(child);
	}

	DivOverlay.prototype.createOverlay = function() {
		var self = this;
		var o = function() { 
			this.initialize();
		};
		$.extend(o.prototype,EventEmitter.prototype);
		o.prototype.initialize = function() {
			var obj = this;
			this.div = document.createElement("div");
			this.div.style.position = "absolute";
			this.div.style.cursor = "pointer";
			this.div.addEventListener("mouseover",function(e) {
				e.stopPropagation();
				e.preventDefault();
				obj.emit("over");
			},false);
			this.div.addEventListener("mouseout",function(e) {
				e.stopPropagation();
				e.preventDefault();
				obj.emit("out");
			});
			this.div.addEventListener("click",function(e) {
				e.stopPropagation();
				e.preventDefault();
				obj.emit("click");
			});
			self.addChild(this.div);
		}
		o.prototype.setPosition = function(l,t,z) {
			this.div.style.left = Math.floor(l) + "px";
			this.div.style.top = Math.floor(t) + "px";
			this.div.style.zIndex = Math.floor(z);
		}
		o.prototype.setSize = function(w,h) {
			this.div.style.width = Math.floor(w) + "px";
			this.div.style.height = Math.floor(h) + "px";
		}
		o.prototype.hide = function() {
			this.div.style.display = "none";
		}
		o.prototype.show = function() {
			this.div.style.display = "block";
		}
		return new o;
	}

	DivOverlay.prototype.createPopup = function() {
		var self = this;
		var o = function() {
			this.initialize();
		}
		$.extend(o.prototype,EventEmitter.prototype);
		o.prototype.initialize = function() {
			var obj = this;
			this.div = document.createElement("div");
			this.div.style.position = "absolute";
			self.addChild(this.div);
		}
		o.prototype.setPosition = function(l,t) {
			this.div.style.left = Math.floor(l) + "px";
			this.div.style.top = Math.floor(t) + "px";
		}
		o.prototype.hide = function() {
			this.div.style.display = "none";
		}
		o.prototype.show = function() {
			this.div.style.display = "block";
		}
		o.prototype.setHTML = function(html) {
			this.div.innerHTML = html;
		}
		o.prototype.getContainer = function() {
			return this.div;
		}
		o.prototype.destroy = function() {
			self.removeChild(this.div);
		}
		return new o;
	}

	DivOverlay.prototype.removeOverlay = function(o) {
		if (o && o.div)
			this.removeChild(o.div);
	}

	return DivOverlay;
});