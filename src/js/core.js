define(["utils","filters","knockout","knockout.mapping","jquery"], function(utils,filters,ko,komap,$) {
	function koWidgetBindingInit() { // <!-- ko widget: { data: btn1, type: "Button", title: "button #1" } --><!-- /ko -->
		function init(elem, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
	    	var val = valueAccessor();
	    	var widget = ko.utils.unwrapObservable(val.data);
	    	var type = ko.utils.unwrapObservable(val.type);

	    	if(!utils.isWidget(widget))
	    		throw new TypeError('Model property is not widget!');
	    	if(type && type != widget._widgetName)
	    		throw new TypeError('Widget type is not equal to declaration! (' + type + ' != ' + widget._widgetName + ')');

	    	if (!widget.savedNodes)
		    	widget.savedNodes = ko.utils.cloneNodes(ko.virtualElements.childNodes(elem),true);
		    if (!widget.nodesBindingContext)
			    widget.nodesBindingContext = bindingContext;

	    	elem._widget = widget;
	    	ko.renderTemplate('main', bindingContext.extend({
	    		$data: widget,
	    		$root: widget,
	    		filters: filters,
	    		templates: widget.templates
	    	}), {}, elem, 'replaceChildren');
	    	if(widget.domDestroy)
	    		ko.utils.domNodeDisposal.addDisposeCallback(elem,function() {
	    			widget.domDestroy(elem, val);
	    			delete elem._widget;
	    		});
	    	if(widget.domInit)
	    		widget.domInit(elem, val);
	    	return {controlsDescendantBindings:true};
		}

		function update(elem,valueAccessor,allBindingsAccessor,viewModel,bindingContext) {
	    	var val = valueAccessor();
	    	var widget = ko.utils.unwrapObservable(val.data);

	    	if(elem._widget !== widget){
	    		elem._widget.domDestroy(elem, val);
	    		init(elem,valueAccessor,allBindingsAccessor,viewModel);
	    	}
		}

		ko.bindingHandlers.widget = {init:init,update:update};
		ko.virtualElements.allowedBindings.widget = true;
	}

	function koDomNodesBindingInit() {
		ko.bindingHandlers.domNodes = {
			init: function() {
				return { controlsDescendantBindings: true };
			},
			update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
				var nodes = ko.utils.unwrapObservable(valueAccessor());
				ko.virtualElements.setDomNodeChildren(element, ko.utils.cloneNodes(nodes));
				ko.applyBindingsToDescendants(viewModel.nodesBindingContext,element);
			}
		}
		ko.virtualElements.allowedBindings.domNodes = true;
	}

	// TODO: Test it and pull to github!
	function koSyncInit() {
		ko.utils.sync = function(options) {
			if (typeof options !== "object" || !options.source || !options.target || !options.onAdd) {
				throw new Error("ko.utils.sync requires object with source and target (observable)Arrays and onAdd method");
			}
			if (!options.propName) {
				options.propName = "id";
			}
			return options.source.subscribe(function(items) {
 	    	    var rev1 = {}, rev2 = {}, values2push = [];

 	    	    if (items.length == 0) {
 	    	    	var targetItems = ko.utils.unwrapObservable(options.target);
 	    	    	if (targetItems.length == 0) return;
 	    	    	if (typeof options.onRemove === "function") {
	 	    	    	for (var i = 0, l = targetItems.length; i < l; i++) {
	 	    	    		options.onRemove(targetItems[i]);
	 	    	    	} 	    	    		
 	    	    	}
		    		if (ko.isObservable(options.target)) {
    	    			options.target([]);
    	    		}
    	    		else {
    	    			options.target = [];
    	    		}
 	   	    		return;
 	    	    }

            	for (var i = 0, l = items.length; i < l; i++) {
            		var propValue = ko.utils.unwrapObservable(items[i][options.propName]);
            		rev1[propValue] = i;
            	}
            	var targetItems = ko.utils.unwrapObservable(options.target);
            	for (var i = 0, l = targetItems.length; i < l; i++) {
            		var propValue = ko.utils.unwrapObservable(targetItems[i][options.propName]);
            		rev2[propValue] = i;
            	}
            	for (var i = 0, l = items.length; i < l; i++) {
            		var propValue = ko.utils.unwrapObservable(items[i][options.propName]);
            		if (rev2[propValue] === undefined) {
            			values2push.push(options.onAdd(items[i]));
            			rev2[propValue] = targetItems.length;
            		}
            	}
            	if (values2push.length > 0) {
            		ko.utils.arrayPushAll(options.target,values2push);
            		if (typeof options.afterAdd === "function") {
            			options.afterAdd();
            		}
            	}
            	for (var l = targetItems.length, i = l-1; i >= 0; i--) {
            		var propValue = ko.utils.unwrapObservable(targetItems[i][options.propName]);
            		if (rev1[propValue] === undefined) {
            			if (typeof options.onRemove === "function") {
            				options.onRemove(targetItems[i]);
            			}
            			options.target.splice(i,1);
            		}
            	}
			});
		}
	}

	function koTemplateEngineInit() {
		var WidgetTemplate = function(template) {
			this.name = template;
		};
		WidgetTemplate.prototype.text = function() {
			return this.templates ? this.templates[this.name] : '';
		};
		var WidgetTemplateEngine = function() {
			WidgetTemplateEngine.super_.apply(this);
		};
		utils.inherits(WidgetTemplateEngine, ko.nativeTemplateEngine);
		WidgetTemplateEngine.prototype.makeTemplateSource = function(template) {
			return new WidgetTemplate(template);
		};
		WidgetTemplateEngine.prototype._origRenderTemplateSource = WidgetTemplateEngine.prototype.renderTemplateSource;
		WidgetTemplateEngine.prototype.renderTemplateSource = function(templateSource, bindingContext, options) {
			templateSource.templates = bindingContext.templates;
			return this._origRenderTemplateSource(templateSource, bindingContext, options);
		};

		ko.setTemplateEngine(new WidgetTemplateEngine);
	}

	function appInit(widget, doc) {
		koWidgetBindingInit();
		koDomNodesBindingInit();
		koTemplateEngineInit();
		koSyncInit();
		ko.applyBindings(widget, doc.documentElement);
		if(widget.domInit)
			widget.domInit(doc.documentElement);
	}

	return {
		appInit: appInit
	};
});
