define(["google.maps","knockout","config"], function(gmaps,ko,config) {
    var DistanceMeasurer = function(options) {
        var self = this;
        this.rulers = [];
        this.map = null;
        this.distance = ko.observable(0);
        this.isEnabled = options.isEnabled;
        this.distanceLabel = ko.computed(function() {
            return (self.distance()/1000).toFixed(2) + ' km';
        });
    };

    DistanceMeasurer.prototype.switch = function(map) {
        if (map) this.map = map;
        this.isEnabled(!this.isEnabled());
        if (this.gmapsClickListener) gmaps.event.removeListener(this.gmapsClickListener);
        this.rulers.forEach(function(ruler) {
            ruler.setMap(null);
        });
        this.clearPolyline();
        this.rulers = [];
        this.distance(0);
        if (this.isEnabled()) {
            this.rulerpoly = new gmaps.Polyline(config.distanceMeasurer.lineStyle);
            this.gmapsClickListener = gmaps.event.addListener(this.map,"click",this.clickHandler.bind(this));
            this.rulerpoly.setMap(this.map);
        }
        this.modalWindow.visible(this.isEnabled());
    }

    DistanceMeasurer.prototype.clearPolyline = function() {
        if (this.rulerpoly) {
            this.rulerpoly.setPath([]);
        }
    }

    DistanceMeasurer.prototype.clickHandler = function(e) {
        this.rulers.push(this.createRuler(e.latLng));
        this.updatePolyline();
    }

    DistanceMeasurer.prototype.updatePolyline = function() {
        if (this.rulers.length > 1) {
            this.drawRulerPolyline();
            this.distance(this.calcDistance());
        } else {
            this.clearPolyline();
            this.distance(0);
        }
    }

    DistanceMeasurer.prototype.createRuler = function(latLng) {
        var self = this;
        var ruler = new google.maps.Marker({
            position: latLng,
            map: this.map,
            draggable: true,
            icon: config.distanceMeasurer.icons.normal
        });
        var setRulerIcon = function(ruler, icon) {
            return function() {
                ruler.setIcon(config.distanceMeasurer.icons[icon])
            }
        }
        gmaps.event.addListener(ruler,"mouseover",setRulerIcon(ruler,"cross"));
        gmaps.event.addListener(ruler,"mouseout",setRulerIcon(ruler,"normal"));
        gmaps.event.addListener(ruler,"drag",function() {
            self.updatePolyline();
        });
        gmaps.event.addListener(ruler,"click",function() {
            ruler.setMap(null);
            var rulerIndex = self.rulers.indexOf(ruler);
            self.rulers.splice(rulerIndex, 1);
            self.updatePolyline();
        });
        return ruler;
    }

    DistanceMeasurer.prototype.drawRulerPolyline = function() {
        this.rulerpoly.setPath(this.getRulersPositions());
    }

    DistanceMeasurer.prototype.getRulersPositions = function() {
        return this.rulers.map(function(ruler) {
            return ruler.position;
        });
    }

    DistanceMeasurer.prototype.calcDistance = function() {
        return this.rulerpoly ? gmaps.geometry.spherical.computeLength(this.rulerpoly.getPath().getArray()) : 0;
    }

    DistanceMeasurer.prototype.windowDrag = function(self,e) {
        if (this.modalWindow) {
            this.modalWindow.emit("dragStart",this.modalWindow,e);
        }
    }

    DistanceMeasurer.prototype.windowClose = function() {
        this.switch(this.map);
    }

    DistanceMeasurer.prototype.domInit = function(element, params) {
        var self = this;
        this.modalWindow = params.modalWindow;
    };

    DistanceMeasurer.prototype.templates = ["main"];
    return DistanceMeasurer;
});