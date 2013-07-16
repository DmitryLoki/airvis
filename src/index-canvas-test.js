
var initialize = function() {
    var options = {
        zoom: 8,
        center: new google.maps.LatLng(45,14),
        mapTypeId: google.maps.MapTypeId.ROADMAP
    }
	var mapDiv = document.getElementById("map");
	var map = new google.maps.Map(mapDiv,options);
}

google.maps.event.addDomListenerOnce(window,"load",initialize);