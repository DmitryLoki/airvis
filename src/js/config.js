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
		tracksVisualMode: "5min",
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
		apiVersion: "v0.2",
	    // точность (в ответе сервера если координата отличается от предыдущей меньше чем на это число (по lat и lng), пропускаем ее
	    // расчитана исходя из размера экрана и разницы координат его углов, на максимальном зуме <5px 
	    coordsPrecision: 0.00001,
	    // зум, на котором был расчет
	    // при обработке ответа сервера если координаты отличаются меньше чем на coordsPrecision, то вообще их выбрасываем из ответа
	    // затем при отрисовке - на зуме Z точность считается: coordsPrecision * Math.pow(2,coordsPrecision-Z)
	    coordsPrecisionZoom: 19,
	    // в куках сохраняется положение карты и другие параметры. в режиме превью, где на странице можно переключать гонки, должно быть выключено
	    // на странице с одной гонкой лучше включить
	    cookiesEnabled: false
	},
	// Настройки GoogleMapCanvas
	canvas: {
		ufos: {
			basic: {
//				font: "11px verdana",
//				font: "11px arial",
				font: "11px verdana",
				textAlign: "left",
				textBaseline: "top",
				strokeStyle: "#000000",
				fillStyle: "#1a1a1a",
				lineWidth: 1
			},
			tracks: {
				strokeStyle: "#000000",
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
			altTitles: {
//				font: "10px verdana",
				font: "10px arial",
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
			highlightSize: 4,
			highlightDelay: 500,
			titleOffsetY: -16,
			titleOffsetX: 1,
			altTitleOffsetY: -5,
			altTitleOffsetX: 1,
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
		checked: false,
		invisible: false,
		fullTrackEnabled: false,
		trackStrokeOpacity: 1,
		trackStrokeWeight: 1,
		flat: true
	},
	// Настройки таблицы пилотов
	table: {
		sortingTimeout: 1000,
		updatingTimeout: 3000
	},
	// Настройки размеров и положений окон с виджетами
	windows: {
		ufosTable: {
			visible: true,
			menuTitle: "Leaderboard",
//			width: 363,
//			wideWidth: 483,
			width: 370,
//			wideWidth: 549,
			wideWidth: 475,
			top: 180,
			left: 90,
			tableHeight: 288,
			tableMinHeight: 100,
			checkedTableHeight: 220,
			checkedTableMinHeight: 52,
			tableRowHeight: 20,
			firstTableRowOffset: 8,
			windowMode: "short",
			allCheckboxColor: "#ffffff"
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
        waypointsTable: {
            visible: false,
            menuTitle: "Task",
            width: 360,
            xPosition: "right",
            top:480,
            right:30
        },
	    distanceMeasurer: {
	      visible: false,
	      menuTitle: "Distance",
	      width: 150,
	      height: 100,
	      top: 310,
	      left: 10,
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
	// Настройки измерителя расстояний на google maps
    distanceMeasurer: {
        icons:{
            //Это base64 файлов distance_marker.png и distance_marker_cross.png.
            //Пришлось встраивать картинку так, потому что гуглокарты не кешируют иконки и подгружают их с сервера при каждой смене через setIcon
            normal:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAAaCAYAAAC6nQw6AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAfVJREFUeNqklDlLA1EUhc+otYWFjQuY0gSxd0FiE7ETK5fORm39AaYUFAWRICgIIqkCFhE3xAVtFNziXogGF9w33KJxvCeZqDGTmBkv3ORx7zkfl/fePKWuBHqRL9kgWSGZp9X2Jcck+yS3BufUKIPyC2SVbMzKQHOZoApygcz0cOP8Hlj3AzNbwPE1eqXkEtiaHqgqLRWe2iKg3CYNRXdSqDLItMCG5oHAO6oF5vkJsgnE11IpI+Ugqdg8Atq9wHsQNoFtpmj1xtri5CGhPcgGOD29/CHIKnvSZLfCcNhlC7if9aWKlaAGbmyKYhxED71kEOTg6ZgNzesgyBI5YjOheS0Eqfh/qATtnd6aJ2jePYJG1w/Ng3z+0N84Qa7JDeAtaBxCz4QvtHQRdHD1gE7vsnEQPfTKzd6P3Oy24SVg9yR5CLX00Bu52YyzDxU1PRPA3dPfEGqopUemOfsJYrhvHtHaO5X4PrBHDbUCcX/d8l86p5zCwPxOfBB71AjEGfW56Ghd7gXgORDbYI09amK+Ox3Q4sML2kZXYxussUdNMiBGB033z98FrjV4h+5LEAd08fIG58jKd2FE7gxr7BkBMbr40Is5lDPb4VrctykB6PbpFd1zAmByzZoZEKN/ViCz4Wn6EwnT/gCt+S9RGFknEn4KMAB9csND4vb7pwAAAABJRU5ErkJggg==',
            cross:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAAaCAYAAAC6nQw6AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAIGNIUk0AAHolAACAgwAA+f8AAIDoAABSCAABFVgAADqXAAAXb9daH5AAAAL5SURBVHjanJRbSBRhFMd/880YLpGRtfuyuZYRkSuLr10RezF6i17SevOlegoKuhDkSyUVRRciKIgWMYRIotjqJR3qRcnsonahJNNCXRcvrTvu7OzXw+y6OzaadWBg5n/O+c2Zc843yr5tuFk5UA/sBNZmtK/AE+AW0BvWpSNBmQMKAgf8xRyqKodQAHxFtmNkEt4OQFsvDMW4CdwI6/KNG2i3pnK/bgvsqABFca0UKeF5LzS9gGSKPWFd3s8HVWgq747sgmAJi7KeQbjwCFIWFWFd9oiMfqBu6+IhAMHVULfFzgUQQNBfzMHqoDPQMMFK556ttK3lW3UF+Is5tH+7EhRAfVU5CMUJOXwXTrXAVMK+TrXYWj5MKFBVDkC9BtSEAs43FWiCFUVL+D5icKbVfsNgTFLiK6RASwK5UkMBaIIaAZRlR5w1VZEc2xvA7/UwGJMMxiR+r4fje0tRFef+ZHLLBCBdhgy/voLMa5JMQ/yLezhIAXz6Oe5UrTSca7UYis7g93rwez0MRWc4+8ByDAAgk/tJAJG335xO01KIxQWrfR5O1gY4UVtCwOchFheYlnNT3w0A8FTZt401K5fRf74OCtTsvgsMT5ACkUKNf7arXLoeM61RmOiZ/WTTgqNNMDbFOjVUyngiyXJVsGmjP9cjLTWGSI5mJpRGJMfQUlFH3x6+gq5+LoV1eS+72Y2tnfDxR377rDmNlRnNto8/oLXTzs1uNsBwWlJ7/RlMTP/9eExMw/VnkJbUhnU5DKCGSmf97w0Tvseo2rwB5jn8SODKE/gW5XRYl9dmdy8PBNA+MsEabxGVpavcQS8+QKSbO2FdHs7XhUvsjeaXkEj+6UgkofmlHTPX5wbqmDJojHT/6Yh0w5RBI9CxGBDAxUg3TCZywmTCBgEX3RLmA40aJg2PX+eEx11gmDQAo/8CArjc1mv/fwwT2vpsbb7ghUDj0zNc1ftA74PpGa4C4/8DArjd3gftdjW3FwrU/gJ6MxClMnu/UODvAQDdjSe6YGpwbQAAAABJRU5ErkJggg=='
        },
        lineStyle: {
            strokeColor: "#FF0000",
            strokeOpacity: .75,
            strokeWeight: 4
        }
    },
    // берем расстояние от пред. точки до текущей у трека. если он меньше чем pxTrackPrecision, точку не рисуем (допускаем смещение до 20px)
    pxTrackPrecision: 20,
    // ограничение частоты обновления карты
    mapUpdateDelay: 40,
    // использовать requestAnimFrame или timeout
	useRequestAnimFrameInMainCycle: false,
	mainCycleDelay: 40,

	// Говно какое-то

	serverFake: 0,		
	retrieveInterval: 10000,
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
