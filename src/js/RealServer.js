 define(["jquery"],function($) {

	var RealServer = function(options) {
		this.apiDomain = options.apiDomain;
		this.apiVersion = options.apiVersion;
		this.contestId = options.contestId;
		this.raceId = options.raceId;
		this.isOnline = options.isOnline;
	}

	RealServer.prototype.get = function(query) {
		var mult = 1000;
		var testPilotCut = 7; //260
		var testPilotOn = false;
		if (query.type == "race") {

/*
			$.ajax({
				url: "http://apidev.airtribune.com/v0.1.4/track/group/r-10641273-40ff-4ebd-aec3-22fd3629eba3_online",
				dataType: "json",
				data: {
					from_time:0,
					to_time:5378652400
				},
				success: function(result) {
					var diff = {};
					for (var dt in result.timeline) {
						for (var pilot_id in result.timeline[dt]) {
							var d = result.timeline[dt][pilot_id];
							var str = pilot_id + "_" + d.lat + "_" + d.lon;
							if (!diff[str]) diff[str] = 0;
							diff[str]++; 
						}
					}
					console.log(diff);
				}
			});
*/

			$.ajax({
				url: this.apiDomain() + "/" + this.apiVersion() + "/contest/" + this.contestId() + "/race/" + this.raceId(),
				dataType: "json",
				success: function(result,textStatus,request) {
					var data = {
						startKey: result.start_time*mult,
						endKey: result.end_time*mult,
						raceKey: result.start_time*mult,
						timeoffset: result.timeoffset,
						optdistance: result.optdistance,
						raceType: result.race_type,
						raceTypeOptions: {},
						titles: {
							mainTitle: result.contest_title,
							placeTitle: result.country + ", " + result.place,
							dateTitle: "",
							taskTitle: result.race_title + (result.optdistance && !result.race_title.match(/\d+km$/) ? " - " + result.optdistance + "km" : "")
						},
						waypoints: [],
						serverKey: (new Date(request.getResponseHeader("Date"))).getTime() || (new Date).getTime()
					}
					if (data.raceType == "opendistance")
						data.raceTypeOptions.bearing = result.bearing;

					var d = new Date(data.startKey);
//					data.titles.dateTitle = d.toDateString();
					var m_ar = "Jan Fab Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(/ /);
					data.titles.dateTitle = d.getDate() + " " + m_ar[d.getMonth()] + ", " + d.getFullYear();
					if (result.checkpoints && result.checkpoints.features) {
						for (var i = 0; i < result.checkpoints.features.length; i++) {
							rw = result.checkpoints.features[i];
							data.waypoints.push({
								id: i,
								name: rw.properties.name,
								type: rw.properties.checkpoint_type,
								center: {
									lat: rw.geometry.coordinates[0],
									lng: rw.geometry.coordinates[1]
								},
								radius: rw.properties.radius,
								openKey: rw.properties.open_time*mult,
								closeKey: rw.properties.close_time*mult,
								checkedOn: rw.properties.checked_on
							});
							if (rw.properties && rw.properties.checkpoint_type == "ss")
								data.raceKey = rw.properties.open_time*mult;
						}
					}
					if (query.callback)
						query.callback(data);
				},
				error: function(jqXHR,textStatus,errorThrown) {
					if (query.error)
						query.error(jqXHR,textStatus,errorThrown);
				}
			});
		}
		else if (query.type == "ufos") {
			var colors_str = "#FAF0E6,#FFDAB9,#FFDEAD,#6495ED,#483D8B,#6A5ACD,#8470FF,#4169E1,#0000FF,#1E90FF,#00BFFF,#87CEEB,#4682B4,#B0C4DE,#ADD8E6,#AFEEEE,#00CED1,#48D1CC,#00FFFF,#5F9EA0,#66CDAA,#7FFFD4,#006400,#556B2F,#8FBC8F,#2E8B57,#3CB371,#20B2AA,#98FB98,#00FF00,#00FA9A,#ADFF2F,#32CD32,#9ACD32,#228B22,#6B8E23,#BDB76B,#FFFF00,#FFD700,#EEDD82,#DAA520,#B8860B,#BC8F8F,#CD5C5C,#A0522D,#DEB887,#F5DEB3,#F4A460,#D2691E,#B22222,#E9967A,#FA8072,#FFA500,#FF7F50,#F08080,#FF6347,#FF4500,#FF0000,#FF69B4,#FF1493,#FFC0CB,#FFB6C1,#DB7093,#B03060,#C71585,#D02090,#FF00FF,#EE82EE,#DA70D6,#BA55D3,#9932CC,#D8BFD8,#FFE4C4,#EED5B7,#FFFACD,#836FFF,#6959CD,#473C8B,#4876FF,#3A5FCD,#0000FF,#1E90FF,#1874CD,#4F94CD,#00BFFF,#009ACD,#87CEFF,#98F5FF,#7AC5CD,#00E5EE,#66CDAA,#9AFF9A,#00FF7F,#00CD66,#00FF00,#00CD00,#C0FF3E,#9ACD32,#FFF68F,#FFFF00,#CDCD00,#CD9B1D,#FFB90F,#8B658B,#FFC1C1,#CD9B9B,#FF6A6A,#CD5555,#FF8247,#FFA54F,#CD853F,#FF7F24,#CD661D,#FF3030,#CD2626,#CD7054,#FFA07A,#FFA500,#CD8500,#FF7256,#CD5B45,#FF4500,#CD3700,#FF1493,#CD1076,#FF6EB4,#CD6090,#FFB5C5,#FF82AB,#CD6889,#FF34B3,#CD2990,#FF3E96,#CD3278,#CD00CD,#8B008B,#FF83FA,#CD69C9,#8B4789,#FFBBFF,#EEAEEE,#CD96CD,#E066FF,#B452CD,#BF3EFF,#9A32CD,#9B30FF,#7D26CD,#AB82FF,#8968CD";
			var colors_ar = colors_str.split(/,/);
			var getRandomColor = function() {
				var letters = "0123456789ABCDEF".split("");
			    var color = "#";
    			for (var i = 0; i < 6; i++ )
			        color += letters[Math.round(Math.random() * 15)];
    			return color;
			}
			$.ajax({
				url: this.apiDomain() + "/" + this.apiVersion() + "/contest/" + this.contestId() + "/race/" + this.raceId() + "/paragliders",
				dataType: "json",
				success: function(result) {
					var data = [];
					for (var i = 0; i < result.length; i++) {
						var rw = result[i];
						if (testPilotOn && rw.contest_number!=testPilotCut) continue;
						data.push({
							id: rw.contest_number,
							personId: rw.person_id,
							name: rw.name,
							country: rw.country,
							color: colors_ar[i] //getRandomColor()
						});
					}
					if (query.callback)
						query.callback(data);
				},
				error: function(jqXHR,textStatus,errorThrown) {
					if (query.error)
						query.error(jqXHR,textStatus,errorThrown);
				}
			});
		}
		else if (query.type == "timeline") {
			var ajaxRequestData = {
				from_time: Math.floor(query.first/1000),
				to_time: Math.floor(query.last/1000)
			};
			if (query.loadStartData)
				ajaxRequestData.start_positions = 1;
			$.ajax({
				url: this.apiDomain() + "/" + this.apiVersion() + "/track/group/" + this.raceId() + (query.isOnline||this.isOnline()?"_online":""),
				dataType: "json",
				data: ajaxRequestData,
				success: function(result,textStatus,request) {
					if (!result.start) result.start = {};
					var data = {start:{},timeline:{}};
//					var tmp = {};
//					data.serverKey = (new Date(request.getResponseHeader("Date"))).getTime();
					$.each(result.start,function(pilot_id,rw) {
						if (testPilotOn && pilot_id!=testPilotCut) return;
						data.start[pilot_id] = {
							dist: (rw.dist/1000).toFixed(1),
							gspd: rw.gspd,
							vspd: rw.vspd,
							position: {
								lat: rw.lat,
								lng: rw.lon
							},
							alt: rw.alt,
							state: rw.state,
							stateChangedAt: rw.statechanged_at,
							dt: query.first
						}
//						tmp[pilot_id] = {state:rw.state,stateChangedAt:rw.statechanged_at};
					});

					// resort
					var keys = [];
					for (var dt in result.timeline)
						if (result.timeline.hasOwnProperty(dt))
							keys.push(dt);
					keys.sort();
					for (var key_i = 0; key_i < keys.length; key_i++) {
						var dt = keys[key_i];
						var rws = result.timeline[dt];
						dt *= 1000;
						data.timeline[dt] = {};
						$.each(rws,function(pilot_id,rw) {
							if (testPilotOn && pilot_id != testPilotCut) return;
							data.timeline[dt][pilot_id] = {
								dist: (rw.dist/1000).toFixed(1),
								gspd: rw.gspd,
								vspd: rw.vspd,
								position: {
									lat: rw.lat,
									lng: rw.lon
								},
								alt: rw.alt,
								state: rw.state,
								dt: dt
							}
							if (rw.state)
								data.timeline[dt][pilot_id].stateChangedAt = Math.floor(dt/1000);
//							if (rw.state) {
//								data.timeline[dt][pilot_id].stateChangedAt = Math.floor(dt/1000);
//								tmp[pilot_id] = {state:rw.state,stateChangedAt:Math.floor(dt/1000)};
//							}
//							else if (tmp[pilot_id]) {
//								data.timeline[dt][pilot_id].state = tmp[pilot_id].state;
//								data.timeline[dt][pilot_id].stateChangedAt = tmp[pilot_id].stateChangedAt;
//							}
						});
					}
					if (query.callback)
						query.callback(data);
				},
				error: function(jqXHR,textStatus,errorThrown) {
					if (query.error)
						query.error(jqXHR,textStatus,errorThrown);
				}
			});
		}
		else if (query.type == "sms") {
			var data = {};
			if (query.lastSmsTimestamp) data.from_time = query.lastSmsTimestamp + 1; // здесь прибавляем 1 чтобы было не включительно (чтобы последняя смс не приходила снова и снова)
			$.ajax({
				url: this.apiDomain() + "/chatroom/" + this.raceId(),
//				url: "http://apidev.airtribune.com/chatroom/r-7dc4d514-aa6b-44cb-b515-18cec12d8691",
				dataType: "json",
				data: data,
				success: function(result) {
					if (query.callback)
						query.callback(result);
				}
			});
		}
	    else if (query.type == "serverTime") {
//	    	query.callback(Math.floor((new Date).getTime()/1000));
	      $.ajax({
	        url: this.apiDomain() + "/" + this.apiVersion() + "/time/unixtime",
	        dataType: "json",
	        data: data,
	        success: function(serverTime) {
	          if (query.callback)
	            query.callback(serverTime);
	        }
	      });
	    }
	}

	RealServer.prototype.post = function(query) {
		if (query.type == "sms") {
			var ajax = $.ajax({
				url: this.apiDomain() + "/chatroom/" + this.raceId(),
//				url: "http://apidev.airtribune.com/chatroom/r-7dc4d514-aa6b-44cb-b515-18cec12d8691",
				type: "POST",
				dataType: "json",
				data: {
					from: query.data.from,
					to: query.data.to,
					sender: query.data.sender,
					body: query.data.body
				},
				success: function(result) {
					if (query.callback)
						query.callback({success:1});
				},
				error: function(result) {
					if (query.callback)
						query.callback({error:1});
				}
			});
		}
		return ajax;
	}

	return RealServer;
});