define(["jquery"],function($) {

	// Источник данных, типа кеширующего прокси, все данные должны запрашиваться через него, а не напрямую у server-а
	var DataSource = function(options) {
		var self = this;
		this.options = options;
		this.cache = {};
		this.cacheCallbacks = {};
		this.cacheFullTracks = {};
		this.get = function(query) {
			// TODO: добавить обработку error на случай если нет options.server или в query что-то не то
			// Для типа timeline DataSource должен выдать координаты всех пилотов на момент времени options.dt.
			if (query.type == "timeline") {
				// Здесь основная логика, это зачем вообще DataSource нужен.
				// Нужно дать координаты на момент dt, при этом можно запросить данные на промежуток с запасом, 
				// чтобы через секунду не слать новый запрос. Нужен балланс между объемом данных в запросе и частотой запросов.
				// Запрашиваем на минуту * timeMultiplier, т.е. в случае x10 - на 10 минут.
				// Есть массив из загруженных интервалов. Если dt не попадает в один из них, нужно ставить загрузку 
				// соответствующего интервала, после окончания загрузки отдавать данные.
				// Если интервал есть, но скоро кончается, и после него данные не загружены, то нужно отдавать данные сейчас + 
				// + ставить на загрузку следующий интервал. Если на момент dt данные не загружены, но уже грузятся,
				// то нужно ждать и вызывать callback после того запроса, что сейчас в процессе.
				// Еще момент: можем просмотреть всю гонку на скорости x10, а потом перекрутить на начало и смотреть на x1.
				// В этом случае глупо не использовать кеш из x10.
				// TODO: придумать название
				// Фрейм - это то, что приходит с сервера и складывается в кеш, т.е. start data + список events
				// Функция по данному frame вычисляет мгновенные данные всех объектов на момент dt
				// При этом известно, что данные достаточны, т.е. обязательно есть для всех пилотов хотя бы стартовое положение.
				// Как работает: сначала пробегает по timeline по убыванию времени и складывает в data[pilot_id] 
				// первое найденое значение для каждого пилота.
				// Потом пробегает по start-данным, и проставляет значения пилотам, для которых не нашлось событий в timeline
				// Значит эта вся логика остается. И добавляется логика, нужная для анимации. 
				// Нам нужны не только координаты "до" dt, но и ближайшие "после".
				// Для каждого пилота нужно первое событие (по изменению его координат), которое произойдет после dt. 
				// Тогда построим линейное соотношение и получим текущее линейно анимированное положение.
				// При этом данные одного фрейма достаточны. т.е. если нет события "после", то параплан неподвижен. 
				// Очевидно, что при переходе в следующий фрейм он "не прыгнет", потому что если бы он прыгнул, 
				// было бы событие по изменению координат.

				var getDataFromFrame = function(frame,dt,mode) {
//					console.log("getDataFromFrame",frame,dt);
					var data = {}, dataBefore = {}, dataAfter = {}, keys = [];
					// Пробегаем по всем событиям фрейма и для каждого пилота ищем ближайшие события до и после dt
					for (var i in frame.timeline)
						if (frame.timeline.hasOwnProperty(i))
							for (var pilot_id in frame.timeline[i])
								if (frame.timeline[i].hasOwnProperty(pilot_id)) {
									i = Math.floor(i);
									if ((i <= dt) && (!dataBefore[pilot_id] || Math.floor(dataBefore[pilot_id].dt) < i))
										dataBefore[pilot_id] = frame.timeline[i][pilot_id];
									if ((i >= dt) && (!dataAfter[pilot_id] || Math.floor(dataAfter[pilot_id].dt) > i))
										dataAfter[pilot_id] = frame.timeline[i][pilot_id];
								}

					// Если у какого-то пилота не нашлось события до или после, проставляем его по данным frame.start
					for (var pilot_id in frame.start)
						if (frame.start.hasOwnProperty(pilot_id)) {
							if (!dataBefore[pilot_id]) dataBefore[pilot_id] = frame.start[pilot_id];
							if (!dataAfter[pilot_id]) dataAfter[pilot_id] = dataBefore[pilot_id];
						}

					// Все равно может не быть dataBefore или dataAfter (вначале гонки пилот еще не включил трекер)
					// На таких пилотов забиваем, отдаем только тех, у которых есть данные dataBefore

					// По событиям до и после строим линейную пропорцию и получаем мгновенные координаты пилота
					for (var pilot_id in dataBefore) {
						if (dataBefore.hasOwnProperty(pilot_id)) {
							var d1 = dataBefore[pilot_id], d2 = dataAfter[pilot_id];
							if (mode == "simple" || !d2 || d1.dt == d2.dt)
								data[pilot_id] = {
									dist: d1.dist,
									gspd: d1.gspd,
									vspd: d1.vspd,
									position: {
										lat: d1.position.lat,
										lng: d1.position.lng,
										dt: dt
									},
									track: {
										lat: d1.position.lat,
										lng: d1.position.lng,
										dt: d1.dt
									},
									alt: d1.alt,
									state: d1.state,
									stateChangedAt: d1.stateChangedAt,
									dt: d1.dt
								}
							else {
								var p = (dt-d1.dt)/(d2.dt-d1.dt);
								data[pilot_id] = {
									dist: d1.dist,
									gspd: d1.gspd,
									vspd: d1.vspd,
									position: {
										lat: d1.position.lat+(d2.position.lat-d1.position.lat)*p,
										lng: d1.position.lng+(d2.position.lng-d1.position.lng)*p,
										dt: dt
									},
									track: {
										lat: d1.position.lat,
										lng: d1.position.lng,
										dt: d1.dt
									},
									alt: d1.alt,
									state: d1.state,
									stateChangedAt: d1.stateChangedAt,
									dt: d1.dt
								}
							}
//							console.log("computedP dt=",dt,"lat=",data[pilot_id].position.lat,"lng=",data[pilot_id].position.lng);
//							console.log("dataBefor dt=",dataBefore[pilot_id].dt,"lat=",dataBefore[pilot_id].position.lat,"lng=",dataBefore[pilot_id].position.lng);
//							console.log("dataAfter dt=",dataAfter[pilot_id].dt,"lat=",dataAfter[pilot_id].position.lat,"lng=",dataAfter[pilot_id].position.lng);
						}
					}
//					console.log("getDataFromFrame result=",data,"d1=",d1,"d2=",d2,"frame=",frame,"dt",dt);
					return data;
				}

				// Возвращает первый кеш, который в себя включает время dtOffset - количество секунд с начала гонки
				// То есть любой кеш, для любого интервала. Сначала могли крутить со скоростью x25, и в кеш попал интервал
				// cache[25][0], а потом переключили скорость и перекрутили на начало - cache[25][0] нам вернется,
				// он будет подходить, потому что будет включать в себя момент времени dtOffset
				var getCachedFrame = function(cache,dtOffset) {
					for (var inSize in cache) {
						if (cache.hasOwnProperty(inSize)) {
							var inOffset = Math.floor(dtOffset / inSize);
							if (cache[inSize][inOffset])
								return cache[inSize][inOffset];
						}
					}
					return null;
				}


				// data = {start:..,timeline:..}, по этим данным генерятся finish-данные, конечное положение всех пилотов для данного фрейма
				var getFinishData = function(data) {
					var finish = {};
					// Пробегаем по всем событиям фрейма и для каждого пилота ищем самое последнее событие
					for (var dt in data.timeline) {
						if (data.timeline.hasOwnProperty(dt)) {
							for (var pilot_id in data.timeline[dt]) {
								if (data.timeline[dt].hasOwnProperty(pilot_id)) {
									dt = Math.floor(dt);
									if (!finish[pilot_id] || Math.floor(finish[pilot_id].dt) < dt) {
										finish[pilot_id] = data.timeline[dt][pilot_id];
									}
								}
							}
						}
					}
					// Если у какого-то пилота не нашлось события в timeline, проставляем его по данным data.start
					for (var pilot_id in data.start) {
						if (data.start.hasOwnProperty(pilot_id)) {
							if (!finish[pilot_id]) finish[pilot_id] = data.start[pilot_id];
						}
					}
					return finish;
				}

				// Функция-суперхак! Получили finish-данные из предыдущего фрейма. Но у этих данных dt соответствуют реальному времени, когда данные были установлены. 
				// Единственное, зачем finish нужен - засунуть данные в start для следующего фрейма.
				// Нужно переписать все dt-шники из finish-а предыдущего фрейма на dt начала следующего!!!
				var rewriteDt = function(data,dt) {
					var out = $.extend(true,{},data);
					for (var pilot_id in out)
						if (out.hasOwnProperty(pilot_id)) {
							out[pilot_id].dt = dt;
						}
					return out;
				}

				// Штука проставляет state и stateChangedAt в каждый timeline
				var prepareStates = function(data) {
					var tmp = {};
					for (var pilot_id in data.start)
						if (data.start.hasOwnProperty(pilot_id)) {
							var rw = data.start[pilot_id];
							tmp[pilot_id] = {state:rw.state,stateChangedAt:rw.stateChangedAt};
						}
					for (var dt in data.timeline)
						if (data.timeline.hasOwnProperty(dt))
							for (var pilot_id in data.timeline[dt])
								if (data.timeline[dt].hasOwnProperty(pilot_id)) {
									var rw = data.timeline[dt][pilot_id];
									if (rw.state)
										tmp[pilot_id] = {state:rw.state,stateChangedAt:rw.stateChangedAt};
									else if (tmp[pilot_id]) {
										data.timeline[dt][pilot_id].state = tmp[pilot_id].state;
										data.timeline[dt][pilot_id].stateChangedAt = tmp[pilot_id].stateChangedAt;
									}
								}
					return data;
				}

				// Количество секунд, прошедших с начала гонки
				var dtOffset = Math.floor((query.dt - query.dtStart) / 1000);

				// Ищем среди всех кешей интервал, в который входит query.dt
				var cachedFrame = getCachedFrame(this.cache,dtOffset);

				// Размер интервала в секундах, т.е. грузим либо на 30, либо на 60, либо на 300 секунд
				var inSize = 30 * query.timeMultiplier;

				// Количество интервалов, прошедших с начала гонки
				var inOffset = Math.floor(dtOffset / inSize);
				// Начало интервала в милисекундах
				var first = query.dtStart + inOffset * inSize * 1000;
				// Конец интервала в милисекундах
				var last = query.dtStart + (inOffset + 1) * inSize * 1000;

				// Предзагрузка
				// Наш timeline разбит на интервалы размера inSize. Пусть inSize = 5 секунд. И пусть cachedFrame
				// уже есть, т.е. загружен или грузится. Пусть dt=4, т.е. хотим получить кооринаты на 4-й секунде 
				// загруженного интервала. Значение есть и мы его отдаем или отдадим после загрузки. 
				// Но при этом хорошо бы делать предзагрузку следующего интервала.
				// К примеру, если dt > inSize / 2 и на момент dt + inSize загруженного интервала нет, то поставим его на загрузку 
				if (!query.disablePreload && cachedFrame && (dtOffset > inSize * inOffset + inSize / 2) && !getCachedFrame(this.cache,dtOffset + inSize)) {

					// итак, у нас есть cachedFrame, причем этот фрейм - предыдущий относительно того, который сейчас поставим на загрузку
					// предположим, что в cachedFrame были сгенерены finish-данные, конечные данные на этом интервале. 
					// они будут начальными на следущем, поэтому следующий запрос пойдет без ?loadStartData=true
					this.get({
						type: query.type,
						dt: query.dt + inSize * 1000,
						timeMultiplier: query.timeMultiplier,
						dtStart: query.dtStart,
						disablePreload: true,
						finishDataFromPrevFrame: cachedFrame.data ? cachedFrame.data.finish : null,
						callback: function(data,query) { }
					});
				}

				// Если есть кеш, отдадим его значение на момент query.dt
				if (cachedFrame && cachedFrame.status == "ready") {
					query.callback(getDataFromFrame(cachedFrame.data,query.dt,query.mode),query);
				}
				// Интервал сейчас загружается, не нужно запускать новую загрузку
				// Проставим только, чтобы после окончания загрузки интервала выполнился наш callback
				else if (cachedFrame && cachedFrame.status == "loading") {
					cachedFrame.callback = function(data,query) {
						query.callback(getDataFromFrame(data,query.dt,query.mode),query);
					}
				}
				// Кеша нет, делаем запрос
				else {
					// Инициализируем новый интервал в кеше
					if (!self.cache[inSize])
						self.cache[inSize] = {};
					self.cache[inSize][inOffset] = {
						status: "loading",
						first: first,
						last: last,
						inSize: inSize,
						inOffset: inOffset,
						callback: function(data,query) {
							query.callback(getDataFromFrame(data,query.dt,query.mode),query);
						}
					}
					this.options.server.get({
						type: "timeline",
						first: first,
						last: last,
						isOnline: query.isOnline,
						loadStartData: !query.finishDataFromPrevFrame,
						callback: function(data) {
//							console.log("DataSource, loadedFrame data before processing",$.extend(true,{},data));
							if (query.finishDataFromPrevFrame) {
								data.start = query.finishDataFromPrevFrame;
							}
//							console.log("DataSource, loadedFrame query=",query);
							data = prepareStates(data);
							data.finish = rewriteDt(getFinishData(data),self.cache[inSize][inOffset].last);
//							console.log("DataSource, generatedFinishData=",data.finish);
							self.cache[inSize][inOffset].status = "ready";
							self.cache[inSize][inOffset].data = data;
//							console.log("DataSource, loadedFrame=",$.extend(true,{},self.cache[inSize][inOffset]));
							self.cache[inSize][inOffset].callback(data,query);
							self.cache[inSize][inOffset].callback = function(data,query) { };
						}
					});
				}
			}
			else if (query.type == "tracks") {
				// Здесь мы запрашиваем данные о треках. Ради треков мы не делаем дополнительных запросов, рисуем
				// по тем данным, которые имеем в кеше. Однако это НЕ один фрейм, просматриваем все связанные фреймы и рисуем
				// максимальный связанный участок трека, такой, что для него есть данные

				// Количество секунд, прошедших с начала гонки
				var dtOffset = Math.floor((query.dt - query.dtStart) / 1000);

				// Милисекунды начала трека, если грузить только последние 10 мин
				query.dtMin = query.restrict ? Math.max(query.dt - query.restrict*1000,0) : 0;

				var dtMin = query.restrict ? Math.max(dtOffset - query.restrict,0) : 0;
				var dtMin = 0;

				var data = {};

				var addStartData = function(ar) {
					for (var pilot_id in ar)
						if (ar.hasOwnProperty(pilot_id)) {
							if (!data[pilot_id]) data[pilot_id] = {};
								if (!data[pilot_id][ar[pilot_id].dt])
									data[pilot_id][ar[pilot_id].dt] = ar[pilot_id];
						}
				}

				var addData = function(ar) {
					for (var dt in ar)
						if (ar.hasOwnProperty(dt))
							for (var pilot_id in ar[dt])
								if (ar[dt].hasOwnProperty(pilot_id)) {
									if (!data[pilot_id]) data[pilot_id] = {};
									if (!data[pilot_id][dt])
										data[pilot_id][dt] = ar[dt][pilot_id];
								}
				}

				for (var inSize in this.cache) {
					if (this.cache.hasOwnProperty(inSize)) {
						var inOffset = Math.floor(dtOffset / inSize);
						if (this.cache[inSize][inOffset] && this.cache[inSize][inOffset].status == "ready") {
							// получаем в inOffset индекс первого интервала с загруженными данными
							// при этом не берем интервалы раньше чем dtMin (если нужен трек за последние 10 мин)
							while(this.cache[inSize][inOffset-1] && this.cache[inSize][inOffset-1].status == "ready" && (dtMin==0 || dtMin <= (inOffset-1)*inSize))
								inOffset--;
							// грузим стартовые данные (из start) на из первого связного загруженного интервала
							addStartData(this.cache[inSize][inOffset].data.start);
							// грузим события из timeline-ов всех загруженных фреймов начиная с первого пока они есть
							while(this.cache[inSize][inOffset] && this.cache[inSize][inOffset].status == "ready") {
								addData(this.cache[inSize][inOffset].data.timeline);
								inOffset++;
							}
						}
					}
				}

				// сортируем data, это может понадобиться когда разные куски грузились в разных inSize-ах и накладываются
				var out = {};
				for (var pilot_id in data)
					if (data.hasOwnProperty(pilot_id)) {
						var keys = [];
						for (var i in data[pilot_id])
							if (data[pilot_id].hasOwnProperty(i))
								if (i <= query.dt && i >= query.dtMin)
									keys.push(i);
//						out[pilot_id] = {data:{},start:keys[0],end:keys[keys.length-1]};
						out[pilot_id] = {data:{},start:keys[0],end:query.dt};
						for (var i = 0; i < keys.length; i++)
							out[pilot_id].data[keys[i]] = data[pilot_id][keys[i]];
					}

				query.callback(out);
			}
			else if (query.type == "ufoFullTrack") {
				if (this.cacheFullTracks[query.id]) {
					query.callback(this.cacheFullTracks[query.id]);
					return;
				}
				this.options.server.get($.extend({},query,{
					callback: function(data) {
						self.cacheFullTracks[query.id] = data;
						query.callback(data);
					}
				}));
			}
			// В остальных случаях будем просто запрашивать данные у сервера без кеширования
			else {
				this.options.server.get(query);
			}
		}
	}

	return DataSource;
});