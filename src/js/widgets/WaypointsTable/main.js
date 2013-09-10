define(['knockout', "jquery", "filters", "ShortWay"], function (ko, $, filters, ShortWay) {
    var WaypointsTable = function (options) {
        var self = this;
        this.shortWayCalculator = new ShortWay;
        this.tableWaypoints = ko.observableArray();
        this.shortWaysPoints = options.shortWays;
        options.waypoints.subscribe(function (wpts) {
            self.tableWaypoints.removeAll();
            ko.utils.arrayPushAll(self.tableWaypoints, self.createTableWaypoints(wpts));
        });
    };

    WaypointsTable.prototype.windowDrag = function(self,e) {
        if (this.modalWindow)
            this.modalWindow.emit("dragStart",this.modalWindow,e);
    }

    WaypointsTable.prototype.windowClose = function() {
        if (this.modalWindow)
            this.modalWindow.visible(false);
    }


    WaypointsTable.prototype.createTableWaypoints = function (waypointsData) {
        var self = this,
            tableWaypoints = [],
            ordinalPointsCounter = 1,
            distAccumulator = 0;

        //Считаем leg
        waypointsData.forEach(function (waypointData, i) {
            var leg = ko.computed(function () {
                return i > 0 && self.shortWaysPoints()
                    ? self.shortWayCalculator.distanceBetween(self.shortWaysPoints()[i].lat, self.shortWaysPoints()[i].lng, self.shortWaysPoints()[i - 1].lat, self.shortWaysPoints()[i - 1].lng)
                    : 0
            });
            var waypoint = {
                num: ko.computed(function () {
                    //Для ordianl точек выводим их порядковый номер
                    if (waypointData.type() == 'ordinal') return ordinalPointsCounter++;
                    //Для остальных возвращаем их тип
                    return waypointData.type().toUpperCase();
                }),
                isTOWaypoint: (function () {
                    return waypointData.type() == 'to'
                }),
                name: waypointData.name,
                radius: ko.computed(function () {
                    return (waypointData.radius() / 1000).toFixed(1)
                }),
                type: ko.computed(function () {
                    var type = waypointData.checkedOn();
                    if(!type) return '';
                    return type.substr(0,1).toUpperCase() + type.substr(1);
                }),
                leg: ko.computed(function () {
                    return (leg() / 1000).toFixed(1);
                }),
                openTime: ko.computed(function () {
                    if(waypointData.type() == 'es' || waypointData.type() == 'goal') return '';
                    return waypointData.openKey() ? formatTime(waypointData.openKey()) : ''
                }),
                closeTime: ko.computed(function () {
                    if(waypointData.type() == 'ss') return '';
                    return waypointData.closeKey() ? formatTime(waypointData.closeKey()) : ''
                })
            };
            waypoint.dist = ko.computed(function () {
                distAccumulator += leg() / 1000;
                return distAccumulator.toFixed(1);
            });
            tableWaypoints.push(waypoint);
        });
        return tableWaypoints;
    };

    function formatTime(timestamp) {
        // timestamp -> 'hh:mm:ss' -> 'hh:mm'
        return filters
            .formatTime(new Date(timestamp))
            .replace(/(\d{2}:\d{2}):\d{2}$/,'$1');
    }

    WaypointsTable.prototype.domInit = function (element, params) {
        this.modalWindow = params.modalWindow;
    };

    WaypointsTable.prototype.templates = ["main"];

    return WaypointsTable;
});