define({
	// Настройки, которые могут быть переопределены через код подключения виджета
	defaults: {
		width: "100%",
		height: "100%",
		mapWidget: "2d",
		mapOptions: {},
		mode: "full",
		titleUrl: "",
		debug: false,
		tracksVisualMode: "10min",
		cylindersVisualMode: "full",
		heightsVisualMode: "level+",
		modelsVisualMode: "small",
		shortWayVisualMode: "wide",
		namesVisualMode: "on",
		profVisualMode: "user",
		playerState: "pause",
		playerSpeed: 1,
		isOnline: false,
		retrieveState: "pause",
		imgRootUrl: "/img/",
		contestId: "",
		raceId: "",
		apiDomain: "http://api.airtribune.com",
		apiVersion: "v0.2"
	},
	// Настройки GoogleMapCanvas
	canvas: {
		ufos: {
			basic: {
				font: "11px verdana",
				textAlign: "left",
				textBaseline: "bottom",
				strokeStyle: "#000000",
				fillStyle: "#1a1a1a",
				lineWidth: 1
			},
			stick: {
				fillStyle: "#333333",
				strokeStyle: "#1a1a1a",
				lineWidth: 0.9
			},
			stickDot: {
				fillStyle: "rgba(51,51,51,0.4)",
				strokeStyle: "#1a1a1a",
				lineWidth: 1
			},
			icons: {
				default: {
					fillStyle: "#fc0d1b",
					strokeStyle: "#800000"
				},
				landed: {
					fillStyle: "#20bbfc",
					strokeStyle: "#005e80"
				},
				finished: {
					fillStyle: "#fc4cff",
					strokeStyle: "#7e21a0"
				}
			},
			titles: {
				strokeStyle: "#ffffff",
				lineWidth: 3,
				fillStyle: "#000000"
			},
			checkedTitles: {
				lineWidth: 5
			},
			altTitles: {
				font: "10px verdana",
				strokeStyle: "#ffffff",
				lineWidth: 3,
				fillStyle: "#ff0000"
			},
			titlesBg: {
				fillStyle: "rgba(255,255,255,0.75)"
			},
			sizes: {
				default: 30,
				large: 50,
				small: 20
			},
			shadow: {
				fillStyle: "rgba(0,0,0,0.2)"
			},
			highlight: {
				fillStyle: "rgba(255,255,255,0.6)",
				strokeStyle: "rgba(255,255,255,0.5)"
			},
			highlightSize: 8,
			highlightDelay: 500,
			titleOffset: 4,
			altTitleOffsetY: 5,
			altTitleOffsetX: 2,
			minStick: 0,
			maxStick: 30,
			checkedCircleSize: 5,
			visibleCheckboxColor: "rgba(0,47,64,0.75)"
		},
		waypoints: {
			basic: {
				font: "bold 11px verdana",
				textAlign: "left",
				textBaseline: "middle",
				fillStyle: "#000000",
				lineWidth: 3,
				strokeStyle: "#333333"				
			},
			colors: {
				ss: {
					closed: "rgba(217,12,12,opacity)",
					opened: "rgba(142,217,12,opacity)",
					closedText: "#4c0505",
					openedText: "#324c05"
				},
				goal: {
					closed: "rgba(186,7,212,opacity)",
					opened: "rgba(186,7,212,opacity)",
					closedText: "#ffffff",
					openedText: "#ffffff"
				},
				default: {
					closed: "rgba(142,142,142,opacity)",
					opened: "rgba(142,142,142,opacity)",
					closedText: "#1a1a1a",
					openedText: "#1a1a1a"
				},
				es: {
					closed: "rgba(212,171,7,opacity)",
					opened: "rgba(212,171,7,opacity)",
					closedText: "#1a1a1a",
					openedText: "#1a1a1a"
				}
			},
			minOpacity: 0.1,
			maxOpacity: 0.6,
			titleSize: 17,
			titleRadius: 10,
			titleOffset: 1,
			opacityByZoom: {
				minZoom: 11,
				maxZoom: 17,
				minOpacity: 70,
				maxOpacity: 10,
				11: 65,
				12: 60,
				13: 50,
				14: 40,
				15: 30,
				16: 20,
				17: 10
			},
			drawOrder: {
				goal: 2,
				es: 1,
				ss: 3
			}
		},
		shortWay: {
			basic: {
				lineWidth: 3,
				strokeStyle: "rgba(51,51,51,0.7)",
				fillStyle: "rgba(51,51,51,0.7)",
				font: "bold 11px verdana",
				textAlign: "center",
				textBaseline: "middle"
			},
			text: {
				fillStyle: "#ffffff"
			},
			arrowSize: 50,
			circleSize: 10
		},
		// Минимальный зум карты, при котором показывается переключатель prof/user режима подписи цилиндров
		waypointsVisualAutoMinZoom: 8,
		// Зум, который ставится для гонки типа open distance по умолчанию при загрузке карты
		openDistanceDefaultZoom: 11,
		// Зум, к которому приближается карта при начале слежения за пилотом
		trackingZoom: 15,
		// Интервал синхронизации центра карты в положение пилота
		trackingTimeout: 2000
	},
	// Настройки модели TrackerPageDebug/ufo
	ufo: {
		color: "#000000",
		visible: true,
		trackVisible: false,
		trackStrokeOpacity: 1,
		trackStrokeWeight: 1,
		flat: true
	},
	// Настройки таблицы пилотов
	table: {
		sortingTimeout: 1000
	},
	// Настройки размеров и положений окон с виджетами
	windows: {
		ufosTable: {
			visible: true,
			menuTitle: "Leaderboard",
//			width: 363,
//			wideWidth: 483,
			width: 400,
			wideWidth: 520,
			top: 180,
			left: 90,
			tableHeight: 288,
			tableMinHeight: 100,
			checkedTableHeight: 220,
			checkedTableMinHeight: 52,
			tableRowHeight: 22,
			firstTableRowOffset: 8
		},
		retrieveTable: {
			visible: true,
			menuTitle: "Pilots",
			height: 500,
			width: 500,
			top: 180,
			left: 90
		},
		retrieveChat: {
			visible: false,
			menuTitle: "Chat",
			height: 600,
			width: 400,
			top: 180,
			left: 600
		},
		retrieveRawForm: {
			visible: false,
			menuTitle: "SMS sender",
			height: 220,
			width: 400,
			top: 180,
			right: 50,
			xPosition: "right"
		},
		playerControl: {
			visible: true,
			menuTitle: "Player",
			width: 940,
			height: 110,
			minWidth: 800,
			xPosition: "center",
			yPosition: "bottom",
			bottom: 20
		},
		mainMenu: {
			visible: true,
			menuTitle: "Title",
			width: 940,
			minWidth: 800,
			height: 110,
			top: 60,
			xPosition: "center"
		},
		facebook: {
			visible: false,
			menuTitle: "Facebook",
			menuTitlePosition: "right",
			width: 292,
			height: 298,
			xPosition: "right",
			top: 180,
			right: 90
		},
	    retrieveDistanceMeasurer: {
	      visible: false,
	      title: "Distance",
	      menuTitlePosition: "right",
	      resizable: false,
	      width: 180,
	      height: 100,
	      xPosition: "right",
	      top: 410,
	      right: 90
	    }
	},
	// В онлайне время отстает от реального серверного на 2 минуты
	serverDelay: 120000,
	// 1 минута разницы между реальным временем и данными с сервера в онлайне - включается онлайновый reply mode, < минуты - считается что онлайн (isCurrentlyOnline)
	dtDiffReply: 60000,
	// Сопоставление настройки mapWidget <-> mapType
	mapTypes: {
		"2d": "GoogleMapCanvas",
		"2d-old": "GoogleMap",
		"3d": "OwgMap"
	},
	// Сопоставление типам цилиндров их названий
	waypointsNames: {
		ss: "START",
		es: "END OF SPEED SECTION",
		goal: "GOAL",
		to: "TAKE OFF"
	},




	// Говно какое-то

	ufosTable: {
		mode: "short",
		allVisibleCheckboxColor: "#ffffff"
	},
	serverFake: 0,		
	retrieveInterval: 10000,
	renderTableDataInterval: 5000,
	shortWay: {
		wide: {
			strokeColor: "#002244",
			strokeOpacity: 0.6,
			strokeWeight: 4
		},
		thin: {
			color: "#336699",
			strokeOpacity: 1,
			strokeWeight: 2
		}
	},
	shortWayMinSegmentLengthToShowArrow: 100,
	namesVisualModeAutoMinZoom: 14,
	namesVisualAutoMinZoom: 14,
	waypoint: {
		color: "#000000",
		strokeOpacity: 0.8,
		strokeWeight: 1,
		fillOpacity: 0.2,
	},
	waypointsColors: {
		ss: {
			closed: "#ff0000",
			opened: "#00ff00"
		},
		goal: {
			closed: "#590076",
			opened: "#590076"
		},
		es: {
			closed: "#505050",
			opened: "#505050"
		}
	},
	map: {
		zoom: 9,
		center: {lat: 55.748758, lng: 37.6174},
		type: "TERRAIN"
	}
});
