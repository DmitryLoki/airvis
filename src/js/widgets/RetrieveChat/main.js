define(["jquery","knockout","config","jquery.tinyscrollbar"], function($,ko,config) {
	var RetrieveChat = function(options) {
		var self = this;

		this.server = options.server;
		this.ufo = options.ufo;
		this.smsData = options.smsData;
		this.inModalWindow = ko.observable(false);
    this.ufo.subscribe(function(){
      //отметить все смс-ки как прочитанные
      if(!self.ufo()) return;
      var smsData = self.ufo().smsData();
      if(smsData.length)
        smsData.forEach(function(sms){
          sms.readed(true);
        });
      self.ufo().smsData.notifySubscribers(self.ufo().smsData());
    });
		this.chatData = ko.observableArray([]);
		this.chatDataInitializer = ko.computed(function() {
			if (!self.ufo()) return null;
			if (self.inModalWindow()) self.modalWindow.title("Chat with " + self.ufo().name());
			var sms2add = [];
			self.smsData().forEach(function(sms) {
				if (sms.target == self.ufo().personId())
					sms2add.push(sms);
			});
			self.chatData(sms2add);
			self.updateScrollbar(false, true);
			return null;
		});

		this.form = {
      userPin: ko.observable(""),
			loading: ko.observable(false),
			text: ko.observable(""),
			send: function() {
				self.form.loading(true);
				self.form.ajax = self.server.post({
					type: "sms",
					data: {
						from: config.users[this.form.userPin()],
						to: self.ufo().personId(),
						body: self.form.text(),
						sender: "web_app"
					},
					callback: function(result) {
						self.form.loading(false);
						self.form.text("");
            self.form.userPin("");
						if (result.error)
							console.warn("Failed sending message");
						self.emit("newMessage");
					}
				});
			},
			cancel: function() {
				if (self.form.ajax)
					self.ajax.abort();
				self.form.loading(false);
			}
		}
    this.form.userPin.subscribe(function(){console.log('asd')})
	}

	RetrieveChat.prototype.updateScrollbar = function(it, scrollToBottom) {
		var self = this;
		if (this.scrollbarContainer)
			this.scrollbarContainer.tinyscrollbar_update(scrollToBottom?'bottom':'');
		if (!it) setTimeout(function() {
			self.updateScrollbar(1,scrollToBottom);
		},100);
	};

  RetrieveChat.prototype.checkUserPinOk = function(){
    return !!config.users[this.form.userPin()];
  };

	RetrieveChat.prototype.domInit = function(element, params) {
		var self = this;
		this.modalWindow = params.modalWindow;
		if (this.modalWindow) {
			this.inModalWindow(true);
			this.modalWindow.on("close",function() {
				self.ufo(null);
			});
			this.modalWindow.on("resize",function() {
				self.updateScrollbar();
			});
      this.modalWindow.on("open",function() {
        self.updateScrollbar(false, true);
        self.form.userPin("");
      })
		}
		var div = ko.virtualElements.firstChild(element);
		while (div && div.nodeType != 1)
			div = ko.virtualElements.nextSibling(div);
		this.container = $(div);
		this.scrollbarContainer = this.container.find(".airvis-scrollbar").tinyscrollbar();
		this.updateScrollbar();
	};

	RetrieveChat.prototype.templates = ["main"];

	return RetrieveChat;
});