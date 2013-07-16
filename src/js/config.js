define({
	width: "100%",
	height: "100%",
	mode: "full",
	mapWidget: "2d",
	imgRootUrl: "/img/",
	icons: {
		"default_medium": {url: "ufo_default_medium.png", width: 32, height: 35, x: 16, y: 35},
		"default_small": {url: "ufo_default_small.png", width: 16, height: 17, x: 8, y: 8},
		"default_large": {url: "ufo_default_large.png", width: 64, height: 70, x: 32, y: 70},
//		"not started_medium": {url: "ufo_not_started_medium.png", width: 32, height: 35, x: 16, y: 35},
//		"not started_small": {url: "ufo_not_started_small.png", width: 16, height: 17, x: 8, y: 8},
//		"not started_large": {url: "ufo_not_started_large.png", width: 64, height: 70, x: 32, y: 70},
		"landed_medium": {url: "ufo_landed_medium.png", width: 32, height: 35, x: 16, y: 35},
		"landed_small": {url: "ufo_landed_small.png", width: 16, height: 17, x: 8, y: 8},
		"landed_large": {url: "ufo_landed_large.png", width: 64, height: 70, x: 32, y: 70},
		"finished_medium": {url: "ufo_finished_medium.png", width: 32, height: 35, x: 16, y: 35},
		"finished_small": {url: "ufo_finished_small.png", width: 16, height: 17, x: 8, y: 8},
		"finished_large": {url: "ufo_finished_large.png", width: 64, height: 70, x: 32, y: 70},
		"finished_landed_medium": {url: "ufo_finished_landed_medium.png", width: 32, height: 28, x: 16, y: 28},
		"finished_landed_small": {url: "ufo_finished_landed_small.png", width: 16, height: 17, x: 8, y: 8},
		"finished_landed_large": {url: "ufo_finished_landed_large.png", width: 64, height: 70, x: 32, y: 70}
	},
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
					fillStyle: "#fc20e8",
					strokeStyle: "#651b80"
				}
			},
			titles: {
				strokeStyle: "#ffffff",
				lineWidth: 3,
				fillStyle: "#000000"
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
			nameOffset: 4
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
					closed: "rgba(217,12,12,0.7)",
					opened: "rgba(142,217,12,0.7)",
					closedText: "#4c0505",
					openedText: "#324c05"
				},
				goal: {
					closed: "rgba(186,7,212,0.7)",
					opened: "rgba(186,7,212,0.7)",
					closedText: "#ffffff",
					openedText: "#ffffff"
				},
				default: {
					closed: "rgba(142,142,142,0.7)",
					opened: "rgba(142,142,142,0.7)",
					closedText: "#1a1a1a",
					openedText: "#1a1a1a"
				}
			},
			titleSize: 17,
			titleRadius: 10,
			titleOffset: 1
		},
		shortWay: {
			basic: {
				lineWidth: 5,
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
		}
	},
	ufo: {
		color: "#000000",
		visible: true,
		trackVisible: false,
		trackStrokeOpacity: 1,
		trackStrokeWeight: 1,
		flat: true
	},
	ufosTable: {
		mode: "short",
		allVisibleCheckboxColor: "blue"
	},
	serverDelay: 120000,	// 2 минуты
	retrieveState: "pause",
	retrieveInterval: 10000,
	playerState: "pause",
	playerSpeed: 1,
	renderTableDataInterval: 5000,
	windows: {
		ufosTable: {
			visible: true,
			title: "Leaderboard",
			resizable: false,
			resizableY: true,
			absoluteCloseIcon: true,
			height: 300,
			width: 400,
			wideWidth: 500,
			top: 180,
			left: 90
		},
		retrieveTable: {
			visible: true,
			title: "Pilots",
			resizable: false,
			resizableY: true,
			height: 500,
			width: 500,
			top: 180,
			left: 90
		},
		retrieveChat: {
			visible: false,
			title: "Chat",
			resizable: false,
			resizableY: true,
			height: 600,
			width: 400,
			top: 180,
			left: 600
		},
		retrieveRawForm: {
			visible: false,
			title: "SMS sender",
			resizable: false,
			height: 220,
			width: 400,
			top: 180,
			right: 50,
			xPosition: "right"
		},
		playerControl: {
			visible: true,
			showHeader: false,
			resizable: false,
			absoluteCloseIcon: true,
			title: "Player",
			width: 940,
			minWidth: 800,
			top: 160,
			left: 90,
			xPosition: "center",
			yPosition: "bottom",
			bottom: 20
		},
		mainMenu: {
			visible: true,
			title: "Title",
			showHeader: false,
			resizable: false,
			absoluteCloseIcon: true,
			width: 940,
			minWidth: 800,
			height: 110,
			top: 60,
			xPosition: "center"
		},
		facebook: {
			visible: false,
			title: "Facebook",
			menuTitlePosition: "right",
			resizable: false,
			absoluteCloseIcon: true,
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
	tracksVisualMode: "off",
	cylindersVisualMode: "full",
	modelsVisualMode: "medium",
	shortWayVisualMode: "wide",
	namesVisualMode: "auto",
	profVisualMode: "user",
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
	waypointsVisualAutoMinZoom: 12,
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
	waypointsNames: {
		ss: "START",
		es: "END OF SPEED SECTION",
		goal: "GOAL"
	},
	map: {
		zoom: 9,
		center: {lat: 55.748758, lng: 37.6174},
		type: "TERRAIN"
	},
	// Настройки тестового сервера
	testServerOptions: {
		mainTitle: "52th FAI european paragliding championship",
		taskTitle: "Task1 - 130km",
		dateTitle: "22 Sep, 2012",
		placeTitle: "France, Saint Andre les Alpes",
		pilotsCnt: 15,
		waypointsCnt: 5,
		startKey: (new Date).getTime() - 120000,
		endKey: (new Date).getTime() - 60000,
		dtStep: 1000,
		// Данные для генератора координат
		coords: {
			center: {
				lat: 55.75,
				lng: 37.61,
				elevation: 500
			},
			// Разброс стартового положения пилотов
			dispersion: 0.02,
			elevationDispersion: 100,
			// Максимальная дистанция, на которую пилот может улететь за 1 шаг
			maxStep: 0.005,
			elevationMaxStep: 100,
			// Вероятность того, что пилот не будет двигаться на текущем шаге
			holdProbability: 0,
			// угол в градусах, на который максимум может повернуться параплан
			directionMaxStep: 30
		},
		waypoints: {
			dispersion: 0.1,
			maxRadius: 1600,
			minRadius: 600,
			height: 500,
		},
		// Задержка, с которой тестовый сервер отдает ответ
		testDelay: 1000,
	}
});
