/*
Copyright (c) 2007, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://developer.yahoo.net/yui/license.txt
version: 2.2.0
 */

YAHOO.util.Config = function(owner) {
	if (owner) {
		this.init(owner);
	}
};
YAHOO.util.Config.prototype = {
	owner : null,
	queueInProgress : false,
	checkBoolean : function(val) {
		if (typeof val == 'boolean') {
			return true;
		} else {
			return false;
		}
	},
	checkNumber : function(val) {
		if (isNaN(val)) {
			return false;
		} else {
			return true;
		}
	}
};
YAHOO.util.Config.prototype.init = function(owner) {
	this.owner = owner;
	this.configChangedEvent = new YAHOO.util.CustomEvent("configChanged");
	this.queueInProgress = false;
	var config = {};
	var initialConfig = {};
	var eventQueue = [];
	var fireEvent = function(key, value) {
		key = key.toLowerCase();
		var property = config[key];
		if (typeof property != 'undefined' && property.event) {
			property.event.fire(value);
		}
	};
	this.addProperty = function(key, propertyObject) {
		key = key.toLowerCase();
		config[key] = propertyObject;
		propertyObject.event = new YAHOO.util.CustomEvent(key);
		propertyObject.key = key;
		if (propertyObject.handler) {
			propertyObject.event.subscribe(propertyObject.handler, this.owner,
					true);
		}
		this.setProperty(key, propertyObject.value, true);
		if (!propertyObject.suppressEvent) {
			this.queueProperty(key, propertyObject.value);
		}
	};
	this.getConfig = function() {
		var cfg = {};
		for ( var prop in config) {
			var property = config[prop];
			if (typeof property != 'undefined' && property.event) {
				cfg[prop] = property.value;
			}
		}
		return cfg;
	};
	this.getProperty = function(key) {
		key = key.toLowerCase();
		var property = config[key];
		if (typeof property != 'undefined' && property.event) {
			return property.value;
		} else {
			return undefined;
		}
	};
	this.resetProperty = function(key) {
		key = key.toLowerCase();
		var property = config[key];
		if (typeof property != 'undefined' && property.event) {
			if (initialConfig[key] && initialConfig[key] != 'undefined') {
				this.setProperty(key, initialConfig[key]);
			}
			return true;
		} else {
			return false;
		}
	};
	this.setProperty = function(key, value, silent) {
		key = key.toLowerCase();
		if (this.queueInProgress && !silent) {
			this.queueProperty(key, value);
			return true;
		} else {
			var property = config[key];
			if (typeof property != 'undefined' && property.event) {
				if (property.validator && !property.validator(value)) {
					return false;
				} else {
					property.value = value;
					if (!silent) {
						fireEvent(key, value);
						this.configChangedEvent.fire([ key, value ]);
					}
					return true;
				}
			} else {
				return false;
			}
		}
	};
	this.queueProperty = function(key, value) {
		key = key.toLowerCase();
		var property = config[key];
		if (typeof property != 'undefined' && property.event) {
			if (typeof value != 'undefined' && property.validator
					&& !property.validator(value)) {
				return false;
			} else {
				if (typeof value != 'undefined') {
					property.value = value;
				} else {
					value = property.value;
				}
				var foundDuplicate = false;
				for ( var i = 0; i < eventQueue.length; i++) {
					var queueItem = eventQueue[i];
					if (queueItem) {
						var queueItemKey = queueItem[0];
						var queueItemValue = queueItem[1];
						if (queueItemKey.toLowerCase() == key) {
							eventQueue[i] = null;
							eventQueue.push([
									key,
									(typeof value != 'undefined' ? value
											: queueItemValue) ]);
							foundDuplicate = true;
							break;
						}
					}
				}
				if (!foundDuplicate && typeof value != 'undefined') {
					eventQueue.push([ key, value ]);
				}
			}
			if (property.supercedes) {
				for ( var s = 0; s < property.supercedes.length; s++) {
					var supercedesCheck = property.supercedes[s];
					for ( var q = 0; q < eventQueue.length; q++) {
						var queueItemCheck = eventQueue[q];
						if (queueItemCheck) {
							var queueItemCheckKey = queueItemCheck[0];
							var queueItemCheckValue = queueItemCheck[1];
							if (queueItemCheckKey.toLowerCase() == supercedesCheck
									.toLowerCase()) {
								eventQueue.push([ queueItemCheckKey,
										queueItemCheckValue ]);
								eventQueue[q] = null;
								break;
							}
						}
					}
				}
			}
			return true;
		} else {
			return false;
		}
	};
	this.refireEvent = function(key) {
		key = key.toLowerCase();
		var property = config[key];
		if (typeof property != 'undefined' && property.event
				&& typeof property.value != 'undefined') {
			if (this.queueInProgress) {
				this.queueProperty(key);
			} else {
				fireEvent(key, property.value);
			}
		}
	};
	this.applyConfig = function(userConfig, init) {
		if (init) {
			initialConfig = userConfig;
		}
		for ( var prop in userConfig) {
			this.queueProperty(prop, userConfig[prop]);
		}
	};
	this.refresh = function() {
		for ( var prop in config) {
			this.refireEvent(prop);
		}
	};
	this.fireQueue = function() {
		this.queueInProgress = true;
		for ( var i = 0; i < eventQueue.length; i++) {
			var queueItem = eventQueue[i];
			if (queueItem) {
				var key = queueItem[0];
				var value = queueItem[1];
				var property = config[key];
				property.value = value;
				fireEvent(key, value);
			}
		}
		this.queueInProgress = false;
		eventQueue = [];
	};
	this.subscribeToConfigEvent = function(key, handler, obj, override) {
		key = key.toLowerCase();
		var property = config[key];
		if (typeof property != 'undefined' && property.event) {
			if (!YAHOO.util.Config.alreadySubscribed(property.event, handler,
					obj)) {
				property.event.subscribe(handler, obj, override);
			}
			return true;
		} else {
			return false;
		}
	};
	this.unsubscribeFromConfigEvent = function(key, handler, obj) {
		key = key.toLowerCase();
		var property = config[key];
		if (typeof property != 'undefined' && property.event) {
			return property.event.unsubscribe(handler, obj);
		} else {
			return false;
		}
	};
	this.toString = function() {
		var output = "Config";
		if (this.owner) {
			output += " [" + this.owner.toString() + "]";
		}
		return output;
	};
	this.outputEventQueue = function() {
		var output = "";
		for ( var q = 0; q < eventQueue.length; q++) {
			var queueItem = eventQueue[q];
			if (queueItem) {
				output += queueItem[0] + "=" + queueItem[1] + ", ";
			}
		}
		return output;
	};
};
YAHOO.util.Config.alreadySubscribed = function(evt, fn, obj) {
	for ( var e = 0; e < evt.subscribers.length; e++) {
		var subsc = evt.subscribers[e];
		if (subsc && subsc.obj == obj && subsc.fn == fn) {
			return true;
		}
	}
	return false;
};
YAHOO.widget.DateMath = {
	DAY : "D",
	WEEK : "W",
	YEAR : "Y",
	MONTH : "M",
	ONE_DAY_MS : 1000 * 60 * 60 * 24,
	add : function(date, field, amount) {
		var d = new Date(date.getTime());
		switch (field) {
		case this.MONTH:
			var newMonth = date.getMonth() + amount;
			var years = 0;
			if (newMonth < 0) {
				while (newMonth < 0) {
					newMonth += 12;
					years -= 1;
				}
			} else if (newMonth > 11) {
				while (newMonth > 11) {
					newMonth -= 12;
					years += 1;
				}
			}
			d.setMonth(newMonth);
			d.setFullYear(date.getFullYear() + years);
			break;
		case this.DAY:
			d.setDate(date.getDate() + amount);
			break;
		case this.YEAR:
			d.setFullYear(date.getFullYear() + amount);
			break;
		case this.WEEK:
			d.setDate(date.getDate() + (amount * 7));
			break;
		}
		return d;
	},
	subtract : function(date, field, amount) {
		return this.add(date, field, (amount * -1));
	},
	before : function(date, compareTo) {
		var ms = compareTo.getTime();
		if (date.getTime() < ms) {
			return true;
		} else {
			return false;
		}
	},
	after : function(date, compareTo) {
		var ms = compareTo.getTime();
		if (date.getTime() > ms) {
			return true;
		} else {
			return false;
		}
	},
	between : function(date, dateBegin, dateEnd) {
		if (this.after(date, dateBegin) && this.before(date, dateEnd)) {
			return true;
		} else {
			return false;
		}
	},
	getJan1 : function(calendarYear) {
		return new Date(calendarYear, 0, 1);
	},
	getDayOffset : function(date, calendarYear) {
		var beginYear = this.getJan1(calendarYear);
		var dayOffset = Math.ceil((date.getTime() - beginYear.getTime())
				/ this.ONE_DAY_MS);
		return dayOffset;
	},
	getWeekNumber : function(date, calendarYear) {
		date = this.clearTime(date);
		var nearestThurs = new Date(date.getTime() + (4 * this.ONE_DAY_MS)
				- ((date.getDay()) * this.ONE_DAY_MS));
		var jan1 = new Date(nearestThurs.getFullYear(), 0, 1);
		var dayOfYear = ((nearestThurs.getTime() - jan1.getTime()) / this.ONE_DAY_MS) - 1;
		var weekNum = Math.ceil((dayOfYear) / 7);
		return weekNum;
	},
	isYearOverlapWeek : function(weekBeginDate) {
		var overlaps = false;
		var nextWeek = this.add(weekBeginDate, this.DAY, 6);
		if (nextWeek.getFullYear() != weekBeginDate.getFullYear()) {
			overlaps = true;
		}
		return overlaps;
	},
	isMonthOverlapWeek : function(weekBeginDate) {
		var overlaps = false;
		var nextWeek = this.add(weekBeginDate, this.DAY, 6);
		if (nextWeek.getMonth() != weekBeginDate.getMonth()) {
			overlaps = true;
		}
		return overlaps;
	},
	findMonthStart : function(date) {
		var start = new Date(date.getFullYear(), date.getMonth(), 1);
		return start;
	},
	findMonthEnd : function(date) {
		var start = this.findMonthStart(date);
		var nextMonth = this.add(start, this.MONTH, 1);
		var end = this.subtract(nextMonth, this.DAY, 1);
		return end;
	},
	clearTime : function(date) {
		date.setHours(12, 0, 0, 0);
		return date;
	}
};
YAHOO.widget.Calendar = function(id, containerId, config) {
	this.init(id, containerId, config);
};
YAHOO.widget.Calendar.IMG_ROOT = null;
YAHOO.widget.Calendar.DATE = "D";
YAHOO.widget.Calendar.MONTH_DAY = "MD";
YAHOO.widget.Calendar.WEEKDAY = "WD";
YAHOO.widget.Calendar.RANGE = "R";
YAHOO.widget.Calendar.MONTH = "M";
YAHOO.widget.Calendar.DISPLAY_DAYS = 42;
YAHOO.widget.Calendar.STOP_RENDER = "S";
YAHOO.widget.Calendar.prototype = {
	Config : null,
	parent : null,
	index : -1,
	cells : null,
	cellDates : null,
	id : null,
	oDomContainer : null,
	today : null,
	renderStack : null,
	_renderStack : null,
	_selectedDates : null,
	domEventMap : null
};
YAHOO.widget.Calendar.prototype.init = function(id, containerId, config) {
	this.initEvents();
	this.today = new Date();
	YAHOO.widget.DateMath.clearTime(this.today);
	this.id = id;
	this.oDomContainer = document.getElementById(containerId);
	this.cfg = new YAHOO.util.Config(this);
	this.Options = {};
	this.Locale = {};
	this.initStyles();
	YAHOO.util.Dom.addClass(this.oDomContainer, this.Style.CSS_CONTAINER);
	YAHOO.util.Dom.addClass(this.oDomContainer, this.Style.CSS_SINGLE);
	this.cellDates = [];
	this.cells = [];
	this.renderStack = [];
	this._renderStack = [];
	this.setupConfig();
	if (config) {
		this.cfg.applyConfig(config, true);
	}
	this.cfg.fireQueue();
};
YAHOO.widget.Calendar.prototype.configIframe = function(type, args, obj) {
	var useIframe = args[0];
	if (YAHOO.util.Dom.inDocument(this.oDomContainer)) {
		if (useIframe) {
			var pos = YAHOO.util.Dom.getStyle(this.oDomContainer, "position");
			if (this.browser == "ie"
					&& (pos == "absolute" || pos == "relative")) {
				if (!YAHOO.util.Dom.inDocument(this.iframe)) {
					this.iframe = document.createElement("iframe");
					this.iframe.src = "javascript:false;";
					YAHOO.util.Dom.setStyle(this.iframe, "opacity", "0");
					this.oDomContainer.insertBefore(this.iframe,
							this.oDomContainer.firstChild);
				}
			}
		} else {
			if (this.iframe) {
				if (this.iframe.parentNode) {
					this.iframe.parentNode.removeChild(this.iframe);
				}
				this.iframe = null;
			}
		}
	}
};
YAHOO.widget.Calendar.prototype.configTitle = function(type, args, obj) {
	var title = args[0];
	var close = this.cfg.getProperty("close");
	var titleDiv;
	if (title && title !== "") {
		titleDiv = YAHOO.util.Dom.getElementsByClassName(
				YAHOO.widget.CalendarGroup.CSS_2UPTITLE, "div",
				this.oDomContainer)[0]
				|| document.createElement("div");
		titleDiv.className = YAHOO.widget.CalendarGroup.CSS_2UPTITLE;
		titleDiv.innerHTML = title;
		this.oDomContainer
				.insertBefore(titleDiv, this.oDomContainer.firstChild);
		YAHOO.util.Dom.addClass(this.oDomContainer, "withtitle");
	} else {
		titleDiv = YAHOO.util.Dom.getElementsByClassName(
				YAHOO.widget.CalendarGroup.CSS_2UPTITLE, "div",
				this.oDomContainer)[0]
				|| null;
		if (titleDiv) {
			YAHOO.util.Event.purgeElement(titleDiv);
			this.oDomContainer.removeChild(titleDiv);
		}
		if (!close) {
			YAHOO.util.Dom.removeClass(this.oDomContainer, "withtitle");
		}
	}
};
YAHOO.widget.Calendar.prototype.configClose = function(type, args, obj) {
	var close = args[0];
	var title = this.cfg.getProperty("title");
	var DEPR_CLOSE_PATH = "us/my/bn/x_d.gif";
	var linkClose;
	if (close === true) {
		linkClose = YAHOO.util.Dom.getElementsByClassName("link-close", "a",
				this.oDomContainer)[0]
				|| document.createElement("a");
		linkClose.href = "javascript:void(null);";
		linkClose.className = "link-close";
		YAHOO.util.Event.addListener(linkClose, "click", this.hide, this, true);
		if (YAHOO.widget.Calendar.IMG_ROOT !== null) {
			var imgClose = document.createElement("img");
			imgClose.src = YAHOO.widget.Calendar.IMG_ROOT + DEPR_CLOSE_PATH;
			imgClose.className = YAHOO.widget.CalendarGroup.CSS_2UPCLOSE;
			linkClose.appendChild(imgClose);
		} else {
			linkClose.innerHTML = '<span class="'
					+ YAHOO.widget.CalendarGroup.CSS_2UPCLOSE + ' '
					+ this.Style.CSS_CLOSE + '"></span>';
		}
		this.oDomContainer.appendChild(linkClose);
		YAHOO.util.Dom.addClass(this.oDomContainer, "withtitle");
	} else {
		linkClose = YAHOO.util.Dom.getElementsByClassName("link-close", "a",
				this.oDomContainer)[0]
				|| null;
		if (linkClose) {
			YAHOO.util.Event.purgeElement(linkClose);
			this.oDomContainer.removeChild(linkClose);
		}
		if (!title || title === "") {
			YAHOO.util.Dom.removeClass(this.oDomContainer, "withtitle");
		}
	}
};
YAHOO.widget.Calendar.prototype.initEvents = function() {
	this.beforeSelectEvent = new YAHOO.util.CustomEvent("beforeSelect");
	this.selectEvent = new YAHOO.util.CustomEvent("select");
	this.beforeDeselectEvent = new YAHOO.util.CustomEvent("beforeDeselect");
	this.deselectEvent = new YAHOO.util.CustomEvent("deselect");
	this.changePageEvent = new YAHOO.util.CustomEvent("changePage");
	this.beforeRenderEvent = new YAHOO.util.CustomEvent("beforeRender");
	this.renderEvent = new YAHOO.util.CustomEvent("render");
	this.resetEvent = new YAHOO.util.CustomEvent("reset");
	this.clearEvent = new YAHOO.util.CustomEvent("clear");
	this.beforeSelectEvent.subscribe(this.onBeforeSelect, this, true);
	this.selectEvent.subscribe(this.onSelect, this, true);
	this.beforeDeselectEvent.subscribe(this.onBeforeDeselect, this, true);
	this.deselectEvent.subscribe(this.onDeselect, this, true);
	this.changePageEvent.subscribe(this.onChangePage, this, true);
	this.renderEvent.subscribe(this.onRender, this, true);
	this.resetEvent.subscribe(this.onReset, this, true);
	this.clearEvent.subscribe(this.onClear, this, true);
};
YAHOO.widget.Calendar.prototype.doSelectCell = function(e, cal) {
	var target = YAHOO.util.Event.getTarget(e);
	var cell, index, d, date;
	while (target.tagName.toLowerCase() != "td"
			&& !YAHOO.util.Dom.hasClass(target, cal.Style.CSS_CELL_SELECTABLE)) {
		target = target.parentNode;
		if (target.tagName.toLowerCase() == "html") {
			return;
		}
	}
	cell = target;
	if (YAHOO.util.Dom.hasClass(cell, cal.Style.CSS_CELL_SELECTABLE)) {
		index = cell.id.split("cell")[1];
		d = cal.cellDates[index];
		date = new Date(d[0], d[1] - 1, d[2]);
		var link;
		if (cal.Options.MULTI_SELECT) {
			link = cell.getElementsByTagName("a")[0];
			if (link) {
				link.blur();
			}
			var cellDate = cal.cellDates[index];
			var cellDateIndex = cal._indexOfSelectedFieldArray(cellDate);
			if (cellDateIndex > -1) {
				cal.deselectCell(index);
			} else {
				cal.selectCell(index);
			}
		} else {
			link = cell.getElementsByTagName("a")[0];
			if (link) {
				link.blur();
			}
			cal.selectCell(index);
		}
	}
};
YAHOO.widget.Calendar.prototype.doCellMouseOver = function(e, cal) {
	var target;
	if (e) {
		target = YAHOO.util.Event.getTarget(e);
	} else {
		target = this;
	}
	while (target.tagName.toLowerCase() != "td") {
		target = target.parentNode;
		if (target.tagName.toLowerCase() == "html") {
			return;
		}
	}
	if (YAHOO.util.Dom.hasClass(target, cal.Style.CSS_CELL_SELECTABLE)) {
		YAHOO.util.Dom.addClass(target, cal.Style.CSS_CELL_HOVER);
	}
};
YAHOO.widget.Calendar.prototype.doCellMouseOut = function(e, cal) {
	var target;
	if (e) {
		target = YAHOO.util.Event.getTarget(e);
	} else {
		target = this;
	}
	while (target.tagName.toLowerCase() != "td") {
		target = target.parentNode;
		if (target.tagName.toLowerCase() == "html") {
			return;
		}
	}
	if (YAHOO.util.Dom.hasClass(target, cal.Style.CSS_CELL_SELECTABLE)) {
		YAHOO.util.Dom.removeClass(target, cal.Style.CSS_CELL_HOVER);
	}
};
YAHOO.widget.Calendar.prototype.setupConfig = function() {
	this.cfg.addProperty("pagedate", {
		value : new Date(),
		handler : this.configPageDate
	});
	this.cfg.addProperty("selected", {
		value : [],
		handler : this.configSelected
	});
	this.cfg.addProperty("title", {
		value : "",
		handler : this.configTitle
	});
	this.cfg.addProperty("close", {
		value : false,
		handler : this.configClose
	});
	this.cfg.addProperty("iframe", {
		value : true,
		handler : this.configIframe,
		validator : this.cfg.checkBoolean
	});
	this.cfg.addProperty("mindate", {
		value : null,
		handler : this.configMinDate
	});
	this.cfg.addProperty("maxdate", {
		value : null,
		handler : this.configMaxDate
	});
	this.cfg.addProperty("MULTI_SELECT", {
		value : false,
		handler : this.configOptions,
		validator : this.cfg.checkBoolean
	});
	this.cfg.addProperty("START_WEEKDAY", {
		value : 0,
		handler : this.configOptions,
		validator : this.cfg.checkNumber
	});
	this.cfg.addProperty("SHOW_WEEKDAYS", {
		value : true,
		handler : this.configOptions,
		validator : this.cfg.checkBoolean
	});
	this.cfg.addProperty("SHOW_WEEK_HEADER", {
		value : false,
		handler : this.configOptions,
		validator : this.cfg.checkBoolean
	});
	this.cfg.addProperty("SHOW_WEEK_FOOTER", {
		value : false,
		handler : this.configOptions,
		validator : this.cfg.checkBoolean
	});
	this.cfg.addProperty("HIDE_BLANK_WEEKS", {
		value : false,
		handler : this.configOptions,
		validator : this.cfg.checkBoolean
	});
	this.cfg.addProperty("NAV_ARROW_LEFT", {
		value : null,
		handler : this.configOptions
	});
	this.cfg.addProperty("NAV_ARROW_RIGHT", {
		value : null,
		handler : this.configOptions
	});
	this.cfg.addProperty("MONTHS_SHORT", {
		value : [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug",
				"Sep", "Oct", "Nov", "Dec" ],
		handler : this.configLocale
	});
	this.cfg.addProperty("MONTHS_LONG", {
		value : [ "January", "February", "March", "April", "May", "June",
				"July", "August", "September", "October", "November",
				"December" ],
		handler : this.configLocale
	});
	this.cfg.addProperty("WEEKDAYS_1CHAR", {
		value : [ "S", "M", "T", "W", "T", "F", "S" ],
		handler : this.configLocale
	});
	this.cfg.addProperty("WEEKDAYS_SHORT", {
		value : [ "Su", "Mo", "Tu", "We", "Th", "Fr", "Sa" ],
		handler : this.configLocale
	});
	this.cfg.addProperty("WEEKDAYS_MEDIUM", {
		value : [ "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat" ],
		handler : this.configLocale
	});
	this.cfg.addProperty("WEEKDAYS_LONG", {
		value : [ "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday",
				"Friday", "Saturday" ],
		handler : this.configLocale
	});
	var refreshLocale = function() {
		this.cfg.refireEvent("LOCALE_MONTHS");
		this.cfg.refireEvent("LOCALE_WEEKDAYS");
	};
	this.cfg.subscribeToConfigEvent("START_WEEKDAY", refreshLocale, this, true);
	this.cfg.subscribeToConfigEvent("MONTHS_SHORT", refreshLocale, this, true);
	this.cfg.subscribeToConfigEvent("MONTHS_LONG", refreshLocale, this, true);
	this.cfg
			.subscribeToConfigEvent("WEEKDAYS_1CHAR", refreshLocale, this, true);
	this.cfg
			.subscribeToConfigEvent("WEEKDAYS_SHORT", refreshLocale, this, true);
	this.cfg.subscribeToConfigEvent("WEEKDAYS_MEDIUM", refreshLocale, this,
			true);
	this.cfg.subscribeToConfigEvent("WEEKDAYS_LONG", refreshLocale, this, true);
	this.cfg.addProperty("LOCALE_MONTHS", {
		value : "long",
		handler : this.configLocaleValues
	});
	this.cfg.addProperty("LOCALE_WEEKDAYS", {
		value : "short",
		handler : this.configLocaleValues
	});
	this.cfg.addProperty("DATE_DELIMITER", {
		value : ",",
		handler : this.configLocale
	});
	this.cfg.addProperty("DATE_FIELD_DELIMITER", {
		value : "/",
		handler : this.configLocale
	});
	this.cfg.addProperty("DATE_RANGE_DELIMITER", {
		value : "-",
		handler : this.configLocale
	});
	this.cfg.addProperty("MY_MONTH_POSITION", {
		value : 1,
		handler : this.configLocale,
		validator : this.cfg.checkNumber
	});
	this.cfg.addProperty("MY_YEAR_POSITION", {
		value : 2,
		handler : this.configLocale,
		validator : this.cfg.checkNumber
	});
	this.cfg.addProperty("MD_MONTH_POSITION", {
		value : 1,
		handler : this.configLocale,
		validator : this.cfg.checkNumber
	});
	this.cfg.addProperty("MD_DAY_POSITION", {
		value : 2,
		handler : this.configLocale,
		validator : this.cfg.checkNumber
	});
	this.cfg.addProperty("MDY_MONTH_POSITION", {
		value : 1,
		handler : this.configLocale,
		validator : this.cfg.checkNumber
	});
	this.cfg.addProperty("MDY_DAY_POSITION", {
		value : 2,
		handler : this.configLocale,
		validator : this.cfg.checkNumber
	});
	this.cfg.addProperty("MDY_YEAR_POSITION", {
		value : 3,
		handler : this.configLocale,
		validator : this.cfg.checkNumber
	});
};
YAHOO.widget.Calendar.prototype.configPageDate = function(type, args, obj) {
	this.cfg.setProperty("pagedate", this._parsePageDate(args[0]), true);
};
YAHOO.widget.Calendar.prototype.configMinDate = function(type, args, obj) {
	var val = args[0];
	if (typeof val == 'string') {
		val = this._parseDate(val);
		this.cfg.setProperty("mindate", new Date(val[0], (val[1] - 1), val[2]));
	}
};
YAHOO.widget.Calendar.prototype.configMaxDate = function(type, args, obj) {
	var val = args[0];
	if (typeof val == 'string') {
		val = this._parseDate(val);
		this.cfg.setProperty("maxdate", new Date(val[0], (val[1] - 1), val[2]));
	}
};
YAHOO.widget.Calendar.prototype.configSelected = function(type, args, obj) {
	var selected = args[0];
	if (selected) {
		if (typeof selected == 'string') {
			this.cfg.setProperty("selected", this._parseDates(selected), true);
		}
	}
	if (!this._selectedDates) {
		this._selectedDates = this.cfg.getProperty("selected");
	}
};
YAHOO.widget.Calendar.prototype.configOptions = function(type, args, obj) {
	type = type.toUpperCase();
	var val = args[0];
	this.Options[type] = val;
};
YAHOO.widget.Calendar.prototype.configLocale = function(type, args, obj) {
	type = type.toUpperCase();
	var val = args[0];
	this.Locale[type] = val;
	this.cfg.refireEvent("LOCALE_MONTHS");
	this.cfg.refireEvent("LOCALE_WEEKDAYS");
};
YAHOO.widget.Calendar.prototype.configLocaleValues = function(type, args, obj) {
	type = type.toUpperCase();
	var val = args[0];
	switch (type) {
	case "LOCALE_MONTHS":
		switch (val) {
		case "short":
			this.Locale.LOCALE_MONTHS = this.cfg.getProperty("MONTHS_SHORT")
					.concat();
			break;
		case "long":
			this.Locale.LOCALE_MONTHS = this.cfg.getProperty("MONTHS_LONG")
					.concat();
			break;
		}
		break;
	case "LOCALE_WEEKDAYS":
		switch (val) {
		case "1char":
			this.Locale.LOCALE_WEEKDAYS = this.cfg
					.getProperty("WEEKDAYS_1CHAR").concat();
			break;
		case "short":
			this.Locale.LOCALE_WEEKDAYS = this.cfg
					.getProperty("WEEKDAYS_SHORT").concat();
			break;
		case "medium":
			this.Locale.LOCALE_WEEKDAYS = this.cfg.getProperty(
					"WEEKDAYS_MEDIUM").concat();
			break;
		case "long":
			this.Locale.LOCALE_WEEKDAYS = this.cfg.getProperty("WEEKDAYS_LONG")
					.concat();
			break;
		}
		var START_WEEKDAY = this.cfg.getProperty("START_WEEKDAY");
		if (START_WEEKDAY > 0) {
			for ( var w = 0; w < START_WEEKDAY; ++w) {
				this.Locale.LOCALE_WEEKDAYS.push(this.Locale.LOCALE_WEEKDAYS
						.shift());
			}
		}
		break;
	}
};
YAHOO.widget.Calendar.prototype.initStyles = function() {
	this.Style = {
		CSS_ROW_HEADER : "calrowhead",
		CSS_ROW_FOOTER : "calrowfoot",
		CSS_CELL : "calcell",
		CSS_CELL_SELECTED : "selected",
		CSS_CELL_SELECTABLE : "selectable",
		CSS_CELL_RESTRICTED : "restricted",
		CSS_CELL_TODAY : "today",
		CSS_CELL_OOM : "oom",
		CSS_CELL_OOB : "previous",
		CSS_HEADER : "calheader",
		CSS_HEADER_TEXT : "calhead",
		CSS_BODY : "calbody",
		CSS_WEEKDAY_CELL : "calweekdaycell",
		CSS_WEEKDAY_ROW : "calweekdayrow",
		CSS_FOOTER : "calfoot",
		CSS_CALENDAR : "yui-calendar",
		CSS_SINGLE : "single",
		CSS_CONTAINER : "yui-calcontainer",
		CSS_NAV_LEFT : "calnavleft",
		CSS_NAV_RIGHT : "calnavright",
		CSS_CLOSE : "calclose",
		CSS_CELL_TOP : "calcelltop",
		CSS_CELL_LEFT : "calcellleft",
		CSS_CELL_RIGHT : "calcellright",
		CSS_CELL_BOTTOM : "calcellbottom",
		CSS_CELL_HOVER : "calcellhover",
		CSS_CELL_HIGHLIGHT1 : "highlight1",
		CSS_CELL_HIGHLIGHT2 : "highlight2",
		CSS_CELL_HIGHLIGHT3 : "highlight3",
		CSS_CELL_HIGHLIGHT4 : "highlight4"
	};
};
YAHOO.widget.Calendar.prototype.buildMonthLabel = function() {
	var text = this.Locale.LOCALE_MONTHS[this.cfg.getProperty("pagedate")
			.getMonth()]
			+ " " + this.cfg.getProperty("pagedate").getFullYear();
	return text;
};
YAHOO.widget.Calendar.prototype.buildDayLabel = function(workingDate) {
	var day = workingDate.getDate();
	return day;
};
YAHOO.widget.Calendar.prototype.renderHeader = function(html) {
	var colSpan = 7;
	var DEPR_NAV_LEFT = "us/tr/callt.gif";
	var DEPR_NAV_RIGHT = "us/tr/calrt.gif";
	if (this.cfg.getProperty("SHOW_WEEK_HEADER")) {
		colSpan += 1;
	}
	if (this.cfg.getProperty("SHOW_WEEK_FOOTER")) {
		colSpan += 1;
	}
	html[html.length] = "<thead>";
	html[html.length] = "<tr>";
	html[html.length] = '<th colspan="' + colSpan + '" class="'
			+ this.Style.CSS_HEADER_TEXT + '">';
	html[html.length] = '<div class="' + this.Style.CSS_HEADER + '">';
	var renderLeft, renderRight = false;
	if (this.parent) {
		if (this.index === 0) {
			renderLeft = true;
		}
		if (this.index == (this.parent.cfg.getProperty("pages") - 1)) {
			renderRight = true;
		}
	} else {
		renderLeft = true;
		renderRight = true;
	}
	var cal = this.parent || this;
	if (renderLeft) {
		var leftArrow = this.cfg.getProperty("NAV_ARROW_LEFT");
		if (leftArrow === null && YAHOO.widget.Calendar.IMG_ROOT !== null) {
			leftArrow = YAHOO.widget.Calendar.IMG_ROOT + DEPR_NAV_LEFT;
		}
		var leftStyle = (leftArrow === null) ? ""
				: ' style="background-image:url(' + leftArrow + ')"';
		html[html.length] = '<a class="' + this.Style.CSS_NAV_LEFT + '"'
				+ leftStyle + ' >&#160;</a>';
	}
	html[html.length] = this.buildMonthLabel();
	if (renderRight) {
		var rightArrow = this.cfg.getProperty("NAV_ARROW_RIGHT");
		if (rightArrow === null && YAHOO.widget.Calendar.IMG_ROOT !== null) {
			rightArrow = YAHOO.widget.Calendar.IMG_ROOT + DEPR_NAV_RIGHT;
		}
		var rightStyle = (rightArrow === null) ? ""
				: ' style="background-image:url(' + rightArrow + ')"';
		html[html.length] = '<a class="' + this.Style.CSS_NAV_RIGHT + '"'
				+ rightStyle + ' >&#160;</a>';
	}
	html[html.length] = '</div>';
	html[html.length] = '</th>';
	html[html.length] = '</tr>';
	if (this.cfg.getProperty("SHOW_WEEKDAYS")) {
		html = this.buildWeekdays(html);
	}
	html[html.length] = '</thead>';
	return html;
};
YAHOO.widget.Calendar.prototype.buildWeekdays = function(html) {
	html[html.length] = '<tr class="' + this.Style.CSS_WEEKDAY_ROW + '">';
	if (this.cfg.getProperty("SHOW_WEEK_HEADER")) {
		html[html.length] = '<th>&#160;</th>';
	}
	for ( var i = 0; i < this.Locale.LOCALE_WEEKDAYS.length; ++i) {
		html[html.length] = '<th class="calweekdaycell">'
				+ this.Locale.LOCALE_WEEKDAYS[i] + '</th>';
	}
	if (this.cfg.getProperty("SHOW_WEEK_FOOTER")) {
		html[html.length] = '<th>&#160;</th>';
	}
	html[html.length] = '</tr>';
	return html;
};
YAHOO.widget.Calendar.prototype.renderBody = function(workingDate, html) {
	var startDay = this.cfg.getProperty("START_WEEKDAY");
	this.preMonthDays = workingDate.getDay();
	if (startDay > 0) {
		this.preMonthDays -= startDay;
	}
	if (this.preMonthDays < 0) {
		this.preMonthDays += 7;
	}
	this.monthDays = YAHOO.widget.DateMath.findMonthEnd(workingDate).getDate();
	this.postMonthDays = YAHOO.widget.Calendar.DISPLAY_DAYS - this.preMonthDays
			- this.monthDays;
	workingDate = YAHOO.widget.DateMath.subtract(workingDate,
			YAHOO.widget.DateMath.DAY, this.preMonthDays);
	var useDate, weekNum, weekClass;
	useDate = this.cfg.getProperty("pagedate");
	html[html.length] = '<tbody class="m' + (useDate.getMonth() + 1) + ' '
			+ this.Style.CSS_BODY + '">';
	var i = 0;
	var tempDiv = document.createElement("div");
	var cell = document.createElement("td");
	tempDiv.appendChild(cell);
	var jan1 = new Date(useDate.getFullYear(), 0, 1);
	var cal = this.parent || this;
	for ( var r = 0; r < 6; r++) {
		weekNum = YAHOO.widget.DateMath.getWeekNumber(workingDate, useDate
				.getFullYear(), startDay);
		weekClass = "w" + weekNum;
		if (r !== 0 && this.isDateOOM(workingDate)
				&& this.cfg.getProperty("HIDE_BLANK_WEEKS") === true) {
			break;
		} else {
			html[html.length] = '<tr class="' + weekClass + '">';
			if (this.cfg.getProperty("SHOW_WEEK_HEADER")) {
				html = this.renderRowHeader(weekNum, html);
			}
			for ( var d = 0; d < 7; d++) {
				var cellRenderers = [];
				this.clearElement(cell);
				YAHOO.util.Dom.addClass(cell, "calcell");
				cell.id = this.id + "_cell" + i;
				cell.innerHTML = i;
				var renderer = null;
				if (workingDate.getFullYear() == this.today.getFullYear()
						&& workingDate.getMonth() == this.today.getMonth()
						&& workingDate.getDate() == this.today.getDate()) {
					cellRenderers[cellRenderers.length] = cal.renderCellStyleToday;
				}
				this.cellDates[this.cellDates.length] = [
						workingDate.getFullYear(), workingDate.getMonth() + 1,
						workingDate.getDate() ];
				if (this.isDateOOM(workingDate)) {
					cellRenderers[cellRenderers.length] = cal.renderCellNotThisMonth;
				} else {
					YAHOO.util.Dom.addClass(cell, "wd" + workingDate.getDay());
					YAHOO.util.Dom.addClass(cell, "d" + workingDate.getDate());
					for ( var s = 0; s < this.renderStack.length; ++s) {
						var rArray = this.renderStack[s];
						var type = rArray[0];
						var month;
						var day;
						var year;
						switch (type) {
						case YAHOO.widget.Calendar.DATE:
							month = rArray[1][1];
							day = rArray[1][2];
							year = rArray[1][0];
							if (workingDate.getMonth() + 1 == month
									&& workingDate.getDate() == day
									&& workingDate.getFullYear() == year) {
								renderer = rArray[2];
								this.renderStack.splice(s, 1);
							}
							break;
						case YAHOO.widget.Calendar.MONTH_DAY:
							month = rArray[1][0];
							day = rArray[1][1];
							if (workingDate.getMonth() + 1 == month
									&& workingDate.getDate() == day) {
								renderer = rArray[2];
								this.renderStack.splice(s, 1);
							}
							break;
						case YAHOO.widget.Calendar.RANGE:
							var date1 = rArray[1][0];
							var date2 = rArray[1][1];
							var d1month = date1[1];
							var d1day = date1[2];
							var d1year = date1[0];
							var d1 = new Date(d1year, d1month - 1, d1day);
							var d2month = date2[1];
							var d2day = date2[2];
							var d2year = date2[0];
							var d2 = new Date(d2year, d2month - 1, d2day);
							if (workingDate.getTime() >= d1.getTime()
									&& workingDate.getTime() <= d2.getTime()) {
								renderer = rArray[2];
								if (workingDate.getTime() == d2.getTime()) {
									this.renderStack.splice(s, 1);
								}
							}
							break;
						case YAHOO.widget.Calendar.WEEKDAY:
							var weekday = rArray[1][0];
							if (workingDate.getDay() + 1 == weekday) {
								renderer = rArray[2];
							}
							break;
						case YAHOO.widget.Calendar.MONTH:
							month = rArray[1][0];
							if (workingDate.getMonth() + 1 == month) {
								renderer = rArray[2];
							}
							break;
						}
						if (renderer) {
							cellRenderers[cellRenderers.length] = renderer;
						}
					}
				}
				if (this._indexOfSelectedFieldArray([
						workingDate.getFullYear(), workingDate.getMonth() + 1,
						workingDate.getDate() ]) > -1) {
					cellRenderers[cellRenderers.length] = cal.renderCellStyleSelected;
				}
				var mindate = this.cfg.getProperty("mindate");
				var maxdate = this.cfg.getProperty("maxdate");
				if (mindate) {
					mindate = YAHOO.widget.DateMath.clearTime(mindate);
				}
				if (maxdate) {
					maxdate = YAHOO.widget.DateMath.clearTime(maxdate);
				}
				if ((mindate && (workingDate.getTime() < mindate.getTime()))
						|| (maxdate && (workingDate.getTime() > maxdate
								.getTime()))) {
					cellRenderers[cellRenderers.length] = cal.renderOutOfBoundsDate;
				} else {
					cellRenderers[cellRenderers.length] = cal.styleCellDefault;
					cellRenderers[cellRenderers.length] = cal.renderCellDefault;
				}
				for ( var x = 0; x < cellRenderers.length; ++x) {
					var ren = cellRenderers[x];
					if (ren.call((this.parent || this), workingDate, cell) == YAHOO.widget.Calendar.STOP_RENDER) {
						break;
					}
				}
				workingDate.setTime(workingDate.getTime()
						+ YAHOO.widget.DateMath.ONE_DAY_MS);
				if (i >= 0 && i <= 6) {
					YAHOO.util.Dom.addClass(cell, this.Style.CSS_CELL_TOP);
				}
				if ((i % 7) === 0) {
					YAHOO.util.Dom.addClass(cell, this.Style.CSS_CELL_LEFT);
				}
				if (((i + 1) % 7) === 0) {
					YAHOO.util.Dom.addClass(cell, this.Style.CSS_CELL_RIGHT);
				}
				var postDays = this.postMonthDays;
				if (postDays >= 7 && this.cfg.getProperty("HIDE_BLANK_WEEKS")) {
					var blankWeeks = Math.floor(postDays / 7);
					for ( var p = 0; p < blankWeeks; ++p) {
						postDays -= 7;
					}
				}
				if (i >= ((this.preMonthDays + postDays + this.monthDays) - 7)) {
					YAHOO.util.Dom.addClass(cell, this.Style.CSS_CELL_BOTTOM);
				}
				html[html.length] = tempDiv.innerHTML;
				i++;
			}
			if (this.cfg.getProperty("SHOW_WEEK_FOOTER")) {
				html = this.renderRowFooter(weekNum, html);
			}
			html[html.length] = '</tr>';
		}
	}
	html[html.length] = '</tbody>';
	return html;
};
YAHOO.widget.Calendar.prototype.renderFooter = function(html) {
	return html;
};
YAHOO.widget.Calendar.prototype.render = function() {
	this.beforeRenderEvent.fire();
	var workingDate = YAHOO.widget.DateMath.findMonthStart(this.cfg
			.getProperty("pagedate"));
	this.resetRenderers();
	this.cellDates.length = 0;
	YAHOO.util.Event.purgeElement(this.oDomContainer, true);
	var html = [];
	html[html.length] = '<table cellSpacing="0" class="'
			+ this.Style.CSS_CALENDAR + ' y' + workingDate.getFullYear()
			+ '" id="' + this.id + '">';
	html = this.renderHeader(html);
	html = this.renderBody(workingDate, html);
	html = this.renderFooter(html);
	html[html.length] = '</table>';
	this.oDomContainer.innerHTML = html.join("\n");
	this.applyListeners();
	this.cells = this.oDomContainer.getElementsByTagName("td");
	this.cfg.refireEvent("title");
	this.cfg.refireEvent("close");
	this.cfg.refireEvent("iframe");
	this.renderEvent.fire();
};
YAHOO.widget.Calendar.prototype.applyListeners = function() {
	var root = this.oDomContainer;
	var cal = this.parent || this;
	var linkLeft, linkRight;
	linkLeft = YAHOO.util.Dom.getElementsByClassName(this.Style.CSS_NAV_LEFT,
			"a", root);
	linkRight = YAHOO.util.Dom.getElementsByClassName(this.Style.CSS_NAV_RIGHT,
			"a", root);
	if (linkLeft) {
		this.linkLeft = linkLeft[0];
		YAHOO.util.Event.addListener(this.linkLeft, "mousedown",
				cal.previousMonth, cal, true);
	}
	if (linkRight) {
		this.linkRight = linkRight[0];
		YAHOO.util.Event.addListener(this.linkRight, "mousedown",
				cal.nextMonth, cal, true);
	}
	if (this.domEventMap) {
		var el, elements;
		for ( var cls in this.domEventMap) {
			if (YAHOO.lang.hasOwnProperty(this.domEventMap, cls)) {
				var items = this.domEventMap[cls];
				if (!(items instanceof Array)) {
					items = [ items ];
				}
				for ( var i = 0; i < items.length; i++) {
					var item = items[i];
					elements = YAHOO.util.Dom.getElementsByClassName(cls,
							item.tag, this.oDomContainer);
					for ( var c = 0; c < elements.length; c++) {
						el = elements[c];
						YAHOO.util.Event.addListener(el, item.event,
								item.handler, item.scope, item.correct);
					}
				}
			}
		}
	}
	YAHOO.util.Event.addListener(this.oDomContainer, "click",
			this.doSelectCell, this);
	YAHOO.util.Event.addListener(this.oDomContainer, "mouseover",
			this.doCellMouseOver, this);
	YAHOO.util.Event.addListener(this.oDomContainer, "mouseout",
			this.doCellMouseOut, this);
};
YAHOO.widget.Calendar.prototype.getDateByCellId = function(id) {
	var date = this.getDateFieldsByCellId(id);
	return new Date(date[0], date[1] - 1, date[2]);
};
YAHOO.widget.Calendar.prototype.getDateFieldsByCellId = function(id) {
	id = id.toLowerCase().split("_cell")[1];
	id = parseInt(id, 10);
	return this.cellDates[id];
};
YAHOO.widget.Calendar.prototype.renderOutOfBoundsDate = function(workingDate,
		cell) {
	YAHOO.util.Dom.addClass(cell, this.Style.CSS_CELL_OOB);
	cell.innerHTML = workingDate.getDate();
	return YAHOO.widget.Calendar.STOP_RENDER;
};
YAHOO.widget.Calendar.prototype.renderRowHeader = function(weekNum, html) {
	html[html.length] = '<th class="calrowhead">' + weekNum + '</th>';
	return html;
};
YAHOO.widget.Calendar.prototype.renderRowFooter = function(weekNum, html) {
	html[html.length] = '<th class="calrowfoot">' + weekNum + '</th>';
	return html;
};
YAHOO.widget.Calendar.prototype.renderCellDefault = function(workingDate, cell) {
	cell.innerHTML = '<a href="javascript:void(null);" >'
			+ this.buildDayLabel(workingDate) + "</a>";
};
YAHOO.widget.Calendar.prototype.styleCellDefault = function(workingDate, cell) {
	YAHOO.util.Dom.addClass(cell, this.Style.CSS_CELL_SELECTABLE);
};
YAHOO.widget.Calendar.prototype.renderCellStyleHighlight1 = function(
		workingDate, cell) {
	YAHOO.util.Dom.addClass(cell, this.Style.CSS_CELL_HIGHLIGHT1);
};
YAHOO.widget.Calendar.prototype.renderCellStyleHighlight2 = function(
		workingDate, cell) {
	YAHOO.util.Dom.addClass(cell, this.Style.CSS_CELL_HIGHLIGHT2);
};
YAHOO.widget.Calendar.prototype.renderCellStyleHighlight3 = function(
		workingDate, cell) {
	YAHOO.util.Dom.addClass(cell, this.Style.CSS_CELL_HIGHLIGHT3);
};
YAHOO.widget.Calendar.prototype.renderCellStyleHighlight4 = function(
		workingDate, cell) {
	YAHOO.util.Dom.addClass(cell, this.Style.CSS_CELL_HIGHLIGHT4);
};
YAHOO.widget.Calendar.prototype.renderCellStyleToday = function(workingDate,
		cell) {
	YAHOO.util.Dom.addClass(cell, this.Style.CSS_CELL_TODAY);
};
YAHOO.widget.Calendar.prototype.renderCellStyleSelected = function(workingDate,
		cell) {
	YAHOO.util.Dom.addClass(cell, this.Style.CSS_CELL_SELECTED);
};
YAHOO.widget.Calendar.prototype.renderCellNotThisMonth = function(workingDate,
		cell) {
	YAHOO.util.Dom.addClass(cell, this.Style.CSS_CELL_OOM);
	cell.innerHTML = workingDate.getDate();
	return YAHOO.widget.Calendar.STOP_RENDER;
};
YAHOO.widget.Calendar.prototype.renderBodyCellRestricted = function(
		workingDate, cell) {
	YAHOO.util.Dom.addClass(cell, this.Style.CSS_CELL);
	YAHOO.util.Dom.addClass(cell, this.Style.CSS_CELL_RESTRICTED);
	cell.innerHTML = workingDate.getDate();
	return YAHOO.widget.Calendar.STOP_RENDER;
};
YAHOO.widget.Calendar.prototype.addMonths = function(count) {
	this.cfg.setProperty("pagedate", YAHOO.widget.DateMath.add(this.cfg
			.getProperty("pagedate"), YAHOO.widget.DateMath.MONTH, count));
	this.resetRenderers();
	this.changePageEvent.fire();
};
YAHOO.widget.Calendar.prototype.subtractMonths = function(count) {
	this.cfg.setProperty("pagedate", YAHOO.widget.DateMath.subtract(this.cfg
			.getProperty("pagedate"), YAHOO.widget.DateMath.MONTH, count));
	this.resetRenderers();
	this.changePageEvent.fire();
};
YAHOO.widget.Calendar.prototype.addYears = function(count) {
	this.cfg.setProperty("pagedate", YAHOO.widget.DateMath.add(this.cfg
			.getProperty("pagedate"), YAHOO.widget.DateMath.YEAR, count));
	this.resetRenderers();
	this.changePageEvent.fire();
};
YAHOO.widget.Calendar.prototype.subtractYears = function(count) {
	this.cfg.setProperty("pagedate", YAHOO.widget.DateMath.subtract(this.cfg
			.getProperty("pagedate"), YAHOO.widget.DateMath.YEAR, count));
	this.resetRenderers();
	this.changePageEvent.fire();
};
YAHOO.widget.Calendar.prototype.nextMonth = function() {
	this.addMonths(1);
};
YAHOO.widget.Calendar.prototype.previousMonth = function() {
	this.subtractMonths(1);
};
YAHOO.widget.Calendar.prototype.nextYear = function() {
	this.addYears(1);
};
YAHOO.widget.Calendar.prototype.previousYear = function() {
	this.subtractYears(1);
};
YAHOO.widget.Calendar.prototype.reset = function() {
	this.cfg.resetProperty("selected");
	this.cfg.resetProperty("pagedate");
	this.resetEvent.fire();
};
YAHOO.widget.Calendar.prototype.clear = function() {
	this.cfg.setProperty("selected", []);
	this.cfg.setProperty("pagedate", new Date(this.today.getTime()));
	this.clearEvent.fire();
};
YAHOO.widget.Calendar.prototype.select = function(date) {
	this.beforeSelectEvent.fire();
	var selected = this.cfg.getProperty("selected");
	var aToBeSelected = this._toFieldArray(date);
	for ( var a = 0; a < aToBeSelected.length; ++a) {
		var toSelect = aToBeSelected[a];
		if (this._indexOfSelectedFieldArray(toSelect) == -1) {
			selected[selected.length] = toSelect;
		}
	}
	if (this.parent) {
		this.parent.cfg.setProperty("selected", selected);
	} else {
		this.cfg.setProperty("selected", selected);
	}
	this.selectEvent.fire(aToBeSelected);
	return this.getSelectedDates();
};
YAHOO.widget.Calendar.prototype.selectCell = function(cellIndex) {
	this.beforeSelectEvent.fire();
	var selected = this.cfg.getProperty("selected");
	var cell = this.cells[cellIndex];
	var cellDate = this.cellDates[cellIndex];
	var dCellDate = this._toDate(cellDate);
	var selectDate = cellDate.concat();
	selected[selected.length] = selectDate;
	if (this.parent) {
		this.parent.cfg.setProperty("selected", selected);
	} else {
		this.cfg.setProperty("selected", selected);
	}
	this.renderCellStyleSelected(dCellDate, cell);
	this.selectEvent.fire([ selectDate ]);
	this.doCellMouseOut.call(cell, null, this);
	return this.getSelectedDates();
};
YAHOO.widget.Calendar.prototype.deselect = function(date) {
	this.beforeDeselectEvent.fire();
	var selected = this.cfg.getProperty("selected");
	var aToBeSelected = this._toFieldArray(date);
	for ( var a = 0; a < aToBeSelected.length; ++a) {
		var toSelect = aToBeSelected[a];
		var index = this._indexOfSelectedFieldArray(toSelect);
		if (index != -1) {
			selected.splice(index, 1);
		}
	}
	if (this.parent) {
		this.parent.cfg.setProperty("selected", selected);
	} else {
		this.cfg.setProperty("selected", selected);
	}
	this.deselectEvent.fire(aToBeSelected);
	return this.getSelectedDates();
};
YAHOO.widget.Calendar.prototype.deselectCell = function(i) {
	this.beforeDeselectEvent.fire();
	var selected = this.cfg.getProperty("selected");
	var cell = this.cells[i];
	var cellDate = this.cellDates[i];
	var cellDateIndex = this._indexOfSelectedFieldArray(cellDate);
	var dCellDate = this._toDate(cellDate);
	var selectDate = cellDate.concat();
	if (cellDateIndex > -1) {
		if (this.cfg.getProperty("pagedate").getMonth() == dCellDate.getMonth()
				&& this.cfg.getProperty("pagedate").getFullYear() == dCellDate
						.getFullYear()) {
			YAHOO.util.Dom.removeClass(cell, this.Style.CSS_CELL_SELECTED);
		}
		selected.splice(cellDateIndex, 1);
	}
	if (this.parent) {
		this.parent.cfg.setProperty("selected", selected);
	} else {
		this.cfg.setProperty("selected", selected);
	}
	this.deselectEvent.fire(selectDate);
	return this.getSelectedDates();
};
YAHOO.widget.Calendar.prototype.deselectAll = function() {
	this.beforeDeselectEvent.fire();
	var selected = this.cfg.getProperty("selected");
	var count = selected.length;
	var sel = selected.concat();
	if (this.parent) {
		this.parent.cfg.setProperty("selected", []);
	} else {
		this.cfg.setProperty("selected", []);
	}
	if (count > 0) {
		this.deselectEvent.fire(sel);
	}
	return this.getSelectedDates();
};
YAHOO.widget.Calendar.prototype._toFieldArray = function(date) {
	var returnDate = [];
	if (date instanceof Date) {
		returnDate = [ [ date.getFullYear(), date.getMonth() + 1,
				date.getDate() ] ];
	} else if (typeof date == 'string') {
		returnDate = this._parseDates(date);
	} else if (date instanceof Array) {
		for ( var i = 0; i < date.length; ++i) {
			var d = date[i];
			returnDate[returnDate.length] = [ d.getFullYear(),
					d.getMonth() + 1, d.getDate() ];
		}
	}
	return returnDate;
};
YAHOO.widget.Calendar.prototype._toDate = function(dateFieldArray) {
	if (dateFieldArray instanceof Date) {
		return dateFieldArray;
	} else {
		return new Date(dateFieldArray[0], dateFieldArray[1] - 1,
				dateFieldArray[2]);
	}
};
YAHOO.widget.Calendar.prototype._fieldArraysAreEqual = function(array1, array2) {
	var match = false;
	if (array1[0] == array2[0] && array1[1] == array2[1]
			&& array1[2] == array2[2]) {
		match = true;
	}
	return match;
};
YAHOO.widget.Calendar.prototype._indexOfSelectedFieldArray = function(find) {
	var selected = -1;
	var seldates = this.cfg.getProperty("selected");
	for ( var s = 0; s < seldates.length; ++s) {
		var sArray = seldates[s];
		if (find[0] == sArray[0] && find[1] == sArray[1]
				&& find[2] == sArray[2]) {
			selected = s;
			break;
		}
	}
	return selected;
};
YAHOO.widget.Calendar.prototype.isDateOOM = function(date) {
	var isOOM = false;
	if (date.getMonth() != this.cfg.getProperty("pagedate").getMonth()) {
		isOOM = true;
	}
	return isOOM;
};
YAHOO.widget.Calendar.prototype._parsePageDate = function(date) {
	var parsedDate;
	if (date) {
		if (date instanceof Date) {
			parsedDate = YAHOO.widget.DateMath.findMonthStart(date);
		} else {
			var month, year, aMonthYear;
			aMonthYear = date.split(this.cfg
					.getProperty("DATE_FIELD_DELIMITER"));
			month = parseInt(aMonthYear[this.cfg
					.getProperty("MY_MONTH_POSITION") - 1], 10) - 1;
			year = parseInt(
					aMonthYear[this.cfg.getProperty("MY_YEAR_POSITION") - 1],
					10);
			parsedDate = new Date(year, month, 1);
		}
	} else {
		parsedDate = new Date(this.today.getFullYear(), this.today.getMonth(),
				1);
	}
	return parsedDate;
};
YAHOO.widget.Calendar.prototype.onBeforeSelect = function() {
	if (this.cfg.getProperty("MULTI_SELECT") === false) {
		if (this.parent) {
			this.parent.callChildFunction("clearAllBodyCellStyles",
					this.Style.CSS_CELL_SELECTED);
			this.parent.deselectAll();
		} else {
			this.clearAllBodyCellStyles(this.Style.CSS_CELL_SELECTED);
			this.deselectAll();
		}
	}
};
YAHOO.widget.Calendar.prototype.onSelect = function(selected) {
};
YAHOO.widget.Calendar.prototype.onBeforeDeselect = function() {
};
YAHOO.widget.Calendar.prototype.onDeselect = function(deselected) {
};
YAHOO.widget.Calendar.prototype.onChangePage = function() {
	this.render();
};
YAHOO.widget.Calendar.prototype.onRender = function() {
};
YAHOO.widget.Calendar.prototype.onReset = function() {
	this.render();
};
YAHOO.widget.Calendar.prototype.onClear = function() {
	this.render();
};
YAHOO.widget.Calendar.prototype.validate = function() {
	return true;
};
YAHOO.widget.Calendar.prototype._parseDate = function(sDate) {
	var aDate = sDate.split(this.Locale.DATE_FIELD_DELIMITER);
	var rArray;
	if (aDate.length == 2) {
		rArray = [ aDate[this.Locale.MD_MONTH_POSITION - 1],
				aDate[this.Locale.MD_DAY_POSITION - 1] ];
		rArray.type = YAHOO.widget.Calendar.MONTH_DAY;
	} else {
		rArray = [ aDate[this.Locale.MDY_YEAR_POSITION - 1],
				aDate[this.Locale.MDY_MONTH_POSITION - 1],
				aDate[this.Locale.MDY_DAY_POSITION - 1] ];
		rArray.type = YAHOO.widget.Calendar.DATE;
	}
	for ( var i = 0; i < rArray.length; i++) {
		rArray[i] = parseInt(rArray[i], 10);
	}
	return rArray;
};
YAHOO.widget.Calendar.prototype._parseDates = function(sDates) {
	var aReturn = [];
	var aDates = sDates.split(this.Locale.DATE_DELIMITER);
	for ( var d = 0; d < aDates.length; ++d) {
		var sDate = aDates[d];
		if (sDate.indexOf(this.Locale.DATE_RANGE_DELIMITER) != -1) {
			var aRange = sDate.split(this.Locale.DATE_RANGE_DELIMITER);
			var dateStart = this._parseDate(aRange[0]);
			var dateEnd = this._parseDate(aRange[1]);
			var fullRange = this._parseRange(dateStart, dateEnd);
			aReturn = aReturn.concat(fullRange);
		} else {
			var aDate = this._parseDate(sDate);
			aReturn.push(aDate);
		}
	}
	return aReturn;
};
YAHOO.widget.Calendar.prototype._parseRange = function(startDate, endDate) {
	var dStart = new Date(startDate[0], startDate[1] - 1, startDate[2]);
	var dCurrent = YAHOO.widget.DateMath.add(new Date(startDate[0],
			startDate[1] - 1, startDate[2]), YAHOO.widget.DateMath.DAY, 1);
	var dEnd = new Date(endDate[0], endDate[1] - 1, endDate[2]);
	var results = [];
	results.push(startDate);
	while (dCurrent.getTime() <= dEnd.getTime()) {
		results.push([ dCurrent.getFullYear(), dCurrent.getMonth() + 1,
				dCurrent.getDate() ]);
		dCurrent = YAHOO.widget.DateMath.add(dCurrent,
				YAHOO.widget.DateMath.DAY, 1);
	}
	return results;
};
YAHOO.widget.Calendar.prototype.resetRenderers = function() {
	this.renderStack = this._renderStack.concat();
};
YAHOO.widget.Calendar.prototype.clearElement = function(cell) {
	cell.innerHTML = "&#160;";
	cell.className = "";
};
YAHOO.widget.Calendar.prototype.addRenderer = function(sDates, fnRender) {
	var aDates = this._parseDates(sDates);
	for ( var i = 0; i < aDates.length; ++i) {
		var aDate = aDates[i];
		if (aDate.length == 2) {
			if (aDate[0] instanceof Array) {
				this._addRenderer(YAHOO.widget.Calendar.RANGE, aDate, fnRender);
			} else {
				this._addRenderer(YAHOO.widget.Calendar.MONTH_DAY, aDate,
						fnRender);
			}
		} else if (aDate.length == 3) {
			this._addRenderer(YAHOO.widget.Calendar.DATE, aDate, fnRender);
		}
	}
};
YAHOO.widget.Calendar.prototype._addRenderer = function(type, aDates, fnRender) {
	var add = [ type, aDates, fnRender ];
	this.renderStack.unshift(add);
	this._renderStack = this.renderStack.concat();
};
YAHOO.widget.Calendar.prototype.addMonthRenderer = function(month, fnRender) {
	this._addRenderer(YAHOO.widget.Calendar.MONTH, [ month ], fnRender);
};
YAHOO.widget.Calendar.prototype.addWeekdayRenderer = function(weekday, fnRender) {
	this._addRenderer(YAHOO.widget.Calendar.WEEKDAY, [ weekday ], fnRender);
};
YAHOO.widget.Calendar.prototype.clearAllBodyCellStyles = function(style) {
	for ( var c = 0; c < this.cells.length; ++c) {
		YAHOO.util.Dom.removeClass(this.cells[c], style);
	}
};
YAHOO.widget.Calendar.prototype.setMonth = function(month) {
	var current = this.cfg.getProperty("pagedate");
	current.setMonth(parseInt(month, 10));
	this.cfg.setProperty("pagedate", current);
};
YAHOO.widget.Calendar.prototype.setYear = function(year) {
	var current = this.cfg.getProperty("pagedate");
	current.setFullYear(parseInt(year, 10));
	this.cfg.setProperty("pagedate", current);
};
YAHOO.widget.Calendar.prototype.getSelectedDates = function() {
	var returnDates = [];
	var selected = this.cfg.getProperty("selected");
	for ( var d = 0; d < selected.length; ++d) {
		var dateArray = selected[d];
		var date = new Date(dateArray[0], dateArray[1] - 1, dateArray[2]);
		returnDates.push(date);
	}
	returnDates.sort(function(a, b) {
		return a - b;
	});
	return returnDates;
};
YAHOO.widget.Calendar.prototype.hide = function() {
	this.oDomContainer.style.display = "none";
};
YAHOO.widget.Calendar.prototype.show = function() {
	this.oDomContainer.style.display = "block";
};
YAHOO.widget.Calendar.prototype.browser = function() {
	var ua = navigator.userAgent.toLowerCase();
	if (ua.indexOf('opera') != -1) {
		return 'opera';
	} else if (ua.indexOf('msie 7') != -1) {
		return 'ie7';
	} else if (ua.indexOf('msie') != -1) {
		return 'ie';
	} else if (ua.indexOf('safari') != -1) {
		return 'safari';
	} else if (ua.indexOf('gecko') != -1) {
		return 'gecko';
	} else {
		return false;
	}
}();
YAHOO.widget.Calendar.prototype.toString = function() {
	return "Calendar " + this.id;
};
YAHOO.widget.Calendar_Core = YAHOO.widget.Calendar;
YAHOO.widget.Cal_Core = YAHOO.widget.Calendar;
YAHOO.widget.CalendarGroup = function(id, containerId, config) {
	if (arguments.length > 0) {
		this.init(id, containerId, config);
	}
};
YAHOO.widget.CalendarGroup.prototype.init = function(id, containerId, config) {
	this.initEvents();
	this.initStyles();
	this.pages = [];
	this.id = id;
	this.containerId = containerId;
	this.oDomContainer = document.getElementById(containerId);
	YAHOO.util.Dom.addClass(this.oDomContainer,
			YAHOO.widget.CalendarGroup.CSS_CONTAINER);
	YAHOO.util.Dom.addClass(this.oDomContainer,
			YAHOO.widget.CalendarGroup.CSS_MULTI_UP);
	this.cfg = new YAHOO.util.Config(this);
	this.Options = {};
	this.Locale = {};
	this.setupConfig();
	if (config) {
		this.cfg.applyConfig(config, true);
	}
	this.cfg.fireQueue();
	if (this.browser == "opera") {
		var fixWidth = function() {
			var startW = this.oDomContainer.offsetWidth;
			var w = 0;
			for ( var p = 0; p < this.pages.length; ++p) {
				var cal = this.pages[p];
				w += cal.oDomContainer.offsetWidth;
			}
			if (w > 0) {
				this.oDomContainer.style.width = w + "px";
			}
		};
		this.renderEvent.subscribe(fixWidth, this, true);
	}
};
YAHOO.widget.CalendarGroup.prototype.setupConfig = function() {
	this.cfg.addProperty("pages", {
		value : 2,
		validator : this.cfg.checkNumber,
		handler : this.configPages
	});
	this.cfg.addProperty("pagedate", {
		value : new Date(),
		handler : this.configPageDate
	});
	this.cfg.addProperty("selected", {
		value : [],
		handler : this.delegateConfig
	});
	this.cfg.addProperty("title", {
		value : "",
		handler : this.configTitle
	});
	this.cfg.addProperty("close", {
		value : false,
		handler : this.configClose
	});
	this.cfg.addProperty("iframe", {
		value : true,
		handler : this.delegateConfig,
		validator : this.cfg.checkBoolean
	});
	this.cfg.addProperty("mindate", {
		value : null,
		handler : this.delegateConfig
	});
	this.cfg.addProperty("maxdate", {
		value : null,
		handler : this.delegateConfig
	});
	this.cfg.addProperty("MULTI_SELECT", {
		value : false,
		handler : this.delegateConfig,
		validator : this.cfg.checkBoolean
	});
	this.cfg.addProperty("START_WEEKDAY", {
		value : 0,
		handler : this.delegateConfig,
		validator : this.cfg.checkNumber
	});
	this.cfg.addProperty("SHOW_WEEKDAYS", {
		value : true,
		handler : this.delegateConfig,
		validator : this.cfg.checkBoolean
	});
	this.cfg.addProperty("SHOW_WEEK_HEADER", {
		value : false,
		handler : this.delegateConfig,
		validator : this.cfg.checkBoolean
	});
	this.cfg.addProperty("SHOW_WEEK_FOOTER", {
		value : false,
		handler : this.delegateConfig,
		validator : this.cfg.checkBoolean
	});
	this.cfg.addProperty("HIDE_BLANK_WEEKS", {
		value : false,
		handler : this.delegateConfig,
		validator : this.cfg.checkBoolean
	});
	this.cfg.addProperty("NAV_ARROW_LEFT", {
		value : null,
		handler : this.delegateConfig
	});
	this.cfg.addProperty("NAV_ARROW_RIGHT", {
		value : null,
		handler : this.delegateConfig
	});
	this.cfg.addProperty("MONTHS_SHORT", {
		value : [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug",
				"Sep", "Oct", "Nov", "Dec" ],
		handler : this.delegateConfig
	});
	this.cfg.addProperty("MONTHS_LONG", {
		value : [ "January", "February", "March", "April", "May", "June",
				"July", "August", "September", "October", "November",
				"December" ],
		handler : this.delegateConfig
	});
	this.cfg.addProperty("WEEKDAYS_1CHAR", {
		value : [ "S", "M", "T", "W", "T", "F", "S" ],
		handler : this.delegateConfig
	});
	this.cfg.addProperty("WEEKDAYS_SHORT", {
		value : [ "Su", "Mo", "Tu", "We", "Th", "Fr", "Sa" ],
		handler : this.delegateConfig
	});
	this.cfg.addProperty("WEEKDAYS_MEDIUM", {
		value : [ "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat" ],
		handler : this.delegateConfig
	});
	this.cfg.addProperty("WEEKDAYS_LONG", {
		value : [ "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday",
				"Friday", "Saturday" ],
		handler : this.delegateConfig
	});
	this.cfg.addProperty("LOCALE_MONTHS", {
		value : "long",
		handler : this.delegateConfig
	});
	this.cfg.addProperty("LOCALE_WEEKDAYS", {
		value : "short",
		handler : this.delegateConfig
	});
	this.cfg.addProperty("DATE_DELIMITER", {
		value : ",",
		handler : this.delegateConfig
	});
	this.cfg.addProperty("DATE_FIELD_DELIMITER", {
		value : "/",
		handler : this.delegateConfig
	});
	this.cfg.addProperty("DATE_RANGE_DELIMITER", {
		value : "-",
		handler : this.delegateConfig
	});
	this.cfg.addProperty("MY_MONTH_POSITION", {
		value : 1,
		handler : this.delegateConfig,
		validator : this.cfg.checkNumber
	});
	this.cfg.addProperty("MY_YEAR_POSITION", {
		value : 2,
		handler : this.delegateConfig,
		validator : this.cfg.checkNumber
	});
	this.cfg.addProperty("MD_MONTH_POSITION", {
		value : 1,
		handler : this.delegateConfig,
		validator : this.cfg.checkNumber
	});
	this.cfg.addProperty("MD_DAY_POSITION", {
		value : 2,
		handler : this.delegateConfig,
		validator : this.cfg.checkNumber
	});
	this.cfg.addProperty("MDY_MONTH_POSITION", {
		value : 1,
		handler : this.delegateConfig,
		validator : this.cfg.checkNumber
	});
	this.cfg.addProperty("MDY_DAY_POSITION", {
		value : 2,
		handler : this.delegateConfig,
		validator : this.cfg.checkNumber
	});
	this.cfg.addProperty("MDY_YEAR_POSITION", {
		value : 3,
		handler : this.delegateConfig,
		validator : this.cfg.checkNumber
	});
};
YAHOO.widget.CalendarGroup.prototype.initEvents = function() {
	var me = this;
	var sub = function(fn, obj, bOverride) {
		for ( var p = 0; p < me.pages.length; ++p) {
			var cal = me.pages[p];
			cal[this.type + "Event"].subscribe(fn, obj, bOverride);
		}
	};
	var unsub = function(fn, obj) {
		for ( var p = 0; p < me.pages.length; ++p) {
			var cal = me.pages[p];
			cal[this.type + "Event"].unsubscribe(fn, obj);
		}
	};
	this.beforeSelectEvent = new YAHOO.util.CustomEvent("beforeSelect");
	this.beforeSelectEvent.subscribe = sub;
	this.beforeSelectEvent.unsubscribe = unsub;
	this.selectEvent = new YAHOO.util.CustomEvent("select");
	this.selectEvent.subscribe = sub;
	this.selectEvent.unsubscribe = unsub;
	this.beforeDeselectEvent = new YAHOO.util.CustomEvent("beforeDeselect");
	this.beforeDeselectEvent.subscribe = sub;
	this.beforeDeselectEvent.unsubscribe = unsub;
	this.deselectEvent = new YAHOO.util.CustomEvent("deselect");
	this.deselectEvent.subscribe = sub;
	this.deselectEvent.unsubscribe = unsub;
	this.changePageEvent = new YAHOO.util.CustomEvent("changePage");
	this.changePageEvent.subscribe = sub;
	this.changePageEvent.unsubscribe = unsub;
	this.beforeRenderEvent = new YAHOO.util.CustomEvent("beforeRender");
	this.beforeRenderEvent.subscribe = sub;
	this.beforeRenderEvent.unsubscribe = unsub;
	this.renderEvent = new YAHOO.util.CustomEvent("render");
	this.renderEvent.subscribe = sub;
	this.renderEvent.unsubscribe = unsub;
	this.resetEvent = new YAHOO.util.CustomEvent("reset");
	this.resetEvent.subscribe = sub;
	this.resetEvent.unsubscribe = unsub;
	this.clearEvent = new YAHOO.util.CustomEvent("clear");
	this.clearEvent.subscribe = sub;
	this.clearEvent.unsubscribe = unsub;
};
YAHOO.widget.CalendarGroup.prototype.configPages = function(type, args, obj) {
	var pageCount = args[0];
	for ( var p = 0; p < pageCount; ++p) {
		var calId = this.id + "_" + p;
		var calContainerId = this.containerId + "_" + p;
		var childConfig = this.cfg.getConfig();
		childConfig.close = false;
		childConfig.title = false;
		var cal = this.constructChild(calId, calContainerId, childConfig);
		var caldate = cal.cfg.getProperty("pagedate");
		this._setMonthOnDate(caldate, caldate.getMonth() + p);
		cal.cfg.setProperty("pagedate", caldate);
		YAHOO.util.Dom.removeClass(cal.oDomContainer, this.Style.CSS_SINGLE);
		YAHOO.util.Dom.addClass(cal.oDomContainer, "groupcal");
		if (p === 0) {
			YAHOO.util.Dom.addClass(cal.oDomContainer, "first");
		}
		if (p == (pageCount - 1)) {
			YAHOO.util.Dom.addClass(cal.oDomContainer, "last");
		}
		cal.parent = this;
		cal.index = p;
		this.pages[this.pages.length] = cal;
	}
};
YAHOO.widget.CalendarGroup.prototype.configPageDate = function(type, args, obj) {
	var val = args[0];
	var firstPageDate;
	for ( var p = 0; p < this.pages.length; ++p) {
		var cal = this.pages[p];
		if (p === 0) {
			firstPageDate = cal._parsePageDate(val);
			cal.cfg.setProperty("pagedate", firstPageDate);
		} else {
			var pageDate = new Date(firstPageDate);
			this._setMonthOnDate(pageDate, pageDate.getMonth() + p);
			cal.cfg.setProperty("pagedate", pageDate);
		}
	}
};
YAHOO.widget.CalendarGroup.prototype.delegateConfig = function(type, args, obj) {
	var val = args[0];
	var cal;
	for ( var p = 0; p < this.pages.length; p++) {
		cal = this.pages[p];
		cal.cfg.setProperty(type, val);
	}
};
YAHOO.widget.CalendarGroup.prototype.setChildFunction = function(fnName, fn) {
	var pageCount = this.cfg.getProperty("pages");
	for ( var p = 0; p < pageCount; ++p) {
		this.pages[p][fnName] = fn;
	}
};
YAHOO.widget.CalendarGroup.prototype.callChildFunction = function(fnName, args) {
	var pageCount = this.cfg.getProperty("pages");
	for ( var p = 0; p < pageCount; ++p) {
		var page = this.pages[p];
		if (page[fnName]) {
			var fn = page[fnName];
			fn.call(page, args);
		}
	}
};
YAHOO.widget.CalendarGroup.prototype.constructChild = function(id, containerId,
		config) {
	var container = document.getElementById(containerId);
	if (!container) {
		container = document.createElement("div");
		container.id = containerId;
		this.oDomContainer.appendChild(container);
	}
	return new YAHOO.widget.Calendar(id, containerId, config);
};
YAHOO.widget.CalendarGroup.prototype.setMonth = function(month) {
	month = parseInt(month, 10);
	var currYear;
	for ( var p = 0; p < this.pages.length; ++p) {
		var cal = this.pages[p];
		var pageDate = cal.cfg.getProperty("pagedate");
		if (p === 0) {
			currYear = pageDate.getFullYear();
		} else {
			pageDate.setYear(currYear);
		}
		this._setMonthOnDate(pageDate, month + p);
		cal.cfg.setProperty("pagedate", pageDate);
	}
};
YAHOO.widget.CalendarGroup.prototype.setYear = function(year) {
	year = parseInt(year, 10);
	for ( var p = 0; p < this.pages.length; ++p) {
		var cal = this.pages[p];
		var pageDate = cal.cfg.getProperty("pageDate");
		if ((pageDate.getMonth() + 1) == 1 && p > 0) {
			year += 1;
		}
		cal.setYear(year);
	}
};
YAHOO.widget.CalendarGroup.prototype.render = function() {
	this.renderHeader();
	for ( var p = 0; p < this.pages.length; ++p) {
		var cal = this.pages[p];
		cal.render();
	}
	this.renderFooter();
};
YAHOO.widget.CalendarGroup.prototype.select = function(date) {
	for ( var p = 0; p < this.pages.length; ++p) {
		var cal = this.pages[p];
		cal.select(date);
	}
	return this.getSelectedDates();
};
YAHOO.widget.CalendarGroup.prototype.selectCell = function(cellIndex) {
	for ( var p = 0; p < this.pages.length; ++p) {
		var cal = this.pages[p];
		cal.selectCell(cellIndex);
	}
	return this.getSelectedDates();
};
YAHOO.widget.CalendarGroup.prototype.deselect = function(date) {
	for ( var p = 0; p < this.pages.length; ++p) {
		var cal = this.pages[p];
		cal.deselect(date);
	}
	return this.getSelectedDates();
};
YAHOO.widget.CalendarGroup.prototype.deselectAll = function() {
	for ( var p = 0; p < this.pages.length; ++p) {
		var cal = this.pages[p];
		cal.deselectAll();
	}
	return this.getSelectedDates();
};
YAHOO.widget.CalendarGroup.prototype.deselectCell = function(cellIndex) {
	for ( var p = 0; p < this.pages.length; ++p) {
		var cal = this.pages[p];
		cal.deselectCell(cellIndex);
	}
	return this.getSelectedDates();
};
YAHOO.widget.CalendarGroup.prototype.reset = function() {
	for ( var p = 0; p < this.pages.length; ++p) {
		var cal = this.pages[p];
		cal.reset();
	}
};
YAHOO.widget.CalendarGroup.prototype.clear = function() {
	for ( var p = 0; p < this.pages.length; ++p) {
		var cal = this.pages[p];
		cal.clear();
	}
};
YAHOO.widget.CalendarGroup.prototype.nextMonth = function() {
	for ( var p = 0; p < this.pages.length; ++p) {
		var cal = this.pages[p];
		cal.nextMonth();
	}
};
YAHOO.widget.CalendarGroup.prototype.previousMonth = function() {
	for ( var p = this.pages.length - 1; p >= 0; --p) {
		var cal = this.pages[p];
		cal.previousMonth();
	}
};
YAHOO.widget.CalendarGroup.prototype.nextYear = function() {
	for ( var p = 0; p < this.pages.length; ++p) {
		var cal = this.pages[p];
		cal.nextYear();
	}
};
YAHOO.widget.CalendarGroup.prototype.previousYear = function() {
	for ( var p = 0; p < this.pages.length; ++p) {
		var cal = this.pages[p];
		cal.previousYear();
	}
};
YAHOO.widget.CalendarGroup.prototype.getSelectedDates = function() {
	var returnDates = [];
	var selected = this.cfg.getProperty("selected");
	for ( var d = 0; d < selected.length; ++d) {
		var dateArray = selected[d];
		var date = new Date(dateArray[0], dateArray[1] - 1, dateArray[2]);
		returnDates.push(date);
	}
	returnDates.sort(function(a, b) {
		return a - b;
	});
	return returnDates;
};
YAHOO.widget.CalendarGroup.prototype.addRenderer = function(sDates, fnRender) {
	for ( var p = 0; p < this.pages.length; ++p) {
		var cal = this.pages[p];
		cal.addRenderer(sDates, fnRender);
	}
};
YAHOO.widget.CalendarGroup.prototype.addMonthRenderer = function(month,
		fnRender) {
	for ( var p = 0; p < this.pages.length; ++p) {
		var cal = this.pages[p];
		cal.addMonthRenderer(month, fnRender);
	}
};
YAHOO.widget.CalendarGroup.prototype.addWeekdayRenderer = function(weekday,
		fnRender) {
	for ( var p = 0; p < this.pages.length; ++p) {
		var cal = this.pages[p];
		cal.addWeekdayRenderer(weekday, fnRender);
	}
};
YAHOO.widget.CalendarGroup.prototype.renderHeader = function() {
};
YAHOO.widget.CalendarGroup.prototype.renderFooter = function() {
};
YAHOO.widget.CalendarGroup.prototype.addMonths = function(count) {
	this.callChildFunction("addMonths", count);
};
YAHOO.widget.CalendarGroup.prototype.subtractMonths = function(count) {
	this.callChildFunction("subtractMonths", count);
};
YAHOO.widget.CalendarGroup.prototype.addYears = function(count) {
	this.callChildFunction("addYears", count);
};
YAHOO.widget.CalendarGroup.prototype.subtractYears = function(count) {
	this.callChildFunction("subtractYears", count);
};
YAHOO.widget.CalendarGroup.prototype._setMonthOnDate = function(date, iMonth) {
	if (this.browser == "safari" && (iMonth < 0 || iMonth > 11)) {
		var DM = YAHOO.widget.DateMath;
		var newDate = DM.add(date, DM.MONTH, iMonth - date.getMonth());
		date.setTime(newDate.getTime());
	} else {
		date.setMonth(iMonth);
	}
};
YAHOO.widget.CalendarGroup.CSS_CONTAINER = "yui-calcontainer";
YAHOO.widget.CalendarGroup.CSS_MULTI_UP = "multi";
YAHOO.widget.CalendarGroup.CSS_2UPTITLE = "title";
YAHOO.widget.CalendarGroup.CSS_2UPCLOSE = "close-icon";
YAHOO.augment(YAHOO.widget.CalendarGroup, YAHOO.widget.Calendar,
		"buildDayLabel", "buildMonthLabel", "renderOutOfBoundsDate",
		"renderRowHeader", "renderRowFooter", "renderCellDefault",
		"styleCellDefault", "renderCellStyleHighlight1",
		"renderCellStyleHighlight2", "renderCellStyleHighlight3",
		"renderCellStyleHighlight4", "renderCellStyleToday",
		"renderCellStyleSelected", "renderCellNotThisMonth",
		"renderBodyCellRestricted", "initStyles", "configTitle", "configClose",
		"hide", "show", "browser");
YAHOO.widget.CalendarGroup.prototype.toString = function() {
	return "CalendarGroup " + this.id;
};
YAHOO.widget.CalGrp = YAHOO.widget.CalendarGroup;
YAHOO.widget.Calendar2up = function(id, containerId, config) {
	this.init(id, containerId, config);
};
YAHOO.extend(YAHOO.widget.Calendar2up, YAHOO.widget.CalendarGroup);
YAHOO.widget.Cal2up = YAHOO.widget.Calendar2up;
YAHOO.register("calendar", YAHOO.widget.Calendar, {
	version : "2.2.0",
	build : "127"
});