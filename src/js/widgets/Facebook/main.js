//define(["utils","knockout","facebook"],function(utils,ko,FB) {
define(["utils","knockout"],function(utils,ko) {
	var Facebook = function() {
//		console.log("facebook",FB);
	}

/*
	Facebook.prototype.domInit = function(elem,params) {
		var div = ko.virtualElements.firstChild(elem);
		while(div && div.nodeType != 1)
			div = ko.virtualElements.nextSibling(div);
		FB.XFBML.parse(div);
	}
*/

	Facebook.prototype.templates = ["main"];

	return Facebook;
});