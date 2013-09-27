// TODO: Check & delete this
define(["jquery","es5-shim","ie-fix"], function($) {

	var executeFunctionByName = function(functionName,context,args) {
		var namespaces = functionName.split(".");
		var func = namespaces.pop();
		for(var i = 0; i < namespaces.length; i++) {
		  context = context[namespaces[i]];
		}
		return context[func].apply(this,args);
	}

	var cancelRequestAnimFrame = (function() {
	    return window.cancelAnimationFrame ||
	        window.webkitCancelRequestAnimationFrame ||
	        window.mozCancelRequestAnimationFrame ||
	        window.oCancelRequestAnimationFrame ||
	        window.msCancelRequestAnimationFrame ||
	        clearTimeout
	})();

	var requestAnimFrame = (function() {
	    return window.requestAnimationFrame || 
        window.webkitRequestAnimationFrame || 
        window.mozRequestAnimationFrame || 
        window.oRequestAnimationFrame || 
        window.msRequestAnimationFrame || 
        function(/* function */ callback, /* DOMElement */ element) {
            return window.setTimeout(callback,1000/60);
        };
	})();

	return {
		isWidget: function(obj) {
			return !!obj._widgetName;
		},
		inherits: function(ctor, superCtor) {
			ctor.super_ = superCtor;
			ctor.prototype = Object.create(superCtor.prototype, {
				constructor: {
					value: ctor,
					enumerable: false,
					writable: true,
					configurable: true
			    }
			});
			return ctor;			
		},
		log: function() {
			if(window.console && console.log){
				switch(arguments.length){
				case 1: console.log(arguments[0]); break;
				case 2: console.log(arguments[0], arguments[1]); break;
				case 3: console.log(arguments[0], arguments[1], arguments[2]); break;
				case 4: console.log(arguments[0], arguments[1], arguments[2], arguments[3]); break;
				default: console.log(Array.prototype.join.call(arguments, ', '));
				}
			}			
		},
		extend: $.extend,
		executeFunctionByName: executeFunctionByName,
		createObjectByName: function(objectName,context,args) {
			return new executeFunctionByName(objectName,context,args);
		},
		error: function(message) {
			alert(message);
			console.log("ERROR",message);
		},
		requestAnimFrame: requestAnimFrame.bind(window),
		cancelRequestAnimFrame: cancelRequestAnimFrame.bind(window)
	}
});