define(["jquery","utils","knockout","jquery.color"],function($,utils,ko) {
	var TopBar = function() {
		var self = this;

/* TODO: переделать это порно.
	У каждого итема меню должно быть 4 состояния: обычное, обычное наведенное, выделенное, выделенное наведенное
	Между каждыми состояниями должна идти анимация
	Состояние меняется, очевидно, если навели или убрали мышь, и когда случается еще одно observable-событие (buttonOn)
*/

		this.items = ko.observableArray();

		this.items.subscribe(function(items) {
			items.forEach(function(item) {
				item.buttonOn.subscribe(function(visible) {
                    var t = extractTarget(item);
                    setButtonBackgroundColor(visible, t);
				});
			});
		});

		this.switchVisibility = function(item,e) {
			item.slideSwitch(e);
		}

		this.registerSwitch = function(nodes,item) {
			for (var i = 0; i < nodes.length && nodes[i].nodeType != 1; i++);
			if (i >= nodes.length) return;
			item.registerSwitch(nodes[i]);
			self.mouseout(item,{target:$(nodes[i]).find("a")});
		}

		this.unregisterSwitch = function(node,i,item) {
			item.unregisterSwitch();
		}

        function extractTarget(item, e) {
            if (!e && item.prevE) e = item.prevE;
            item.prevE = e;
            var t = $(e.target).stop(true);
            return t;
        }

        this.mouseover = function(item,e) {
            var t = extractTarget(item, e);
            item.isHovered = true;
			if (!item.buttonOn())
				t.animate({backgroundColor:"#ffffff",color:"#002a3a"},200);
			else
				t.animate({backgroundColor:"#ffffff",color:"#002a3a"},200);
		}

        function setButtonBackgroundColor(isOn, button) {
            if (!isOn)
                button.animate({backgroundColor: "rgba(255,255,255,0.75)", color: "#002a3a"});
            else
                button.animate({backgroundColor: "transparent", color: "#ffffff"}, 200);
        }

        this.mouseout = function(item,e) {
			var t = extractTarget(item, e);
			item.isHovered = false;
			setButtonBackgroundColor(item.buttonOn(), t);
		}
	}

	TopBar.prototype.templates = ["main"];

	return TopBar;
});