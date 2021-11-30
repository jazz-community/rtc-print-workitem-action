define(["dojo/_base/declare"], function (declare) {
	return declare(null, {
		parentWidget: null,
		activeConfigurationWidth: 5,
		keyValueMap: [],
		predefinedAttributes: [],
		taskScheduler: [],
		pixelPerRow: 15,
		dynamicHeightList: [],
		ignoreDynamicValues: false,
		globalChildrenLoaded: 0,
		globalChildrenToBeLoaded: 0,
		globalChildCheckingDone: false,
		dynamicVariableCounter: [],
		_pageSizeOptimize: null,
		GLOBAL_HTML_ALLOWED_TAGS: "<b><i><u><p><br><a><s><div><span><hr><synthetic><ul><li><ol><svg><g><path>",
		constructor: function constructor(parentWidget) {
			this.parentWidget = parentWidget;
		},
		drawTableFromConfiguration: function drawTableFromConfiguration(workitemID, configuration) {
			var _this = this;

			var updateTitle = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
			var skipWebKeysIfNotEmpty = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
			var allowDeepChild = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;

			var _pageSizeOptimize = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : null;

			var _predefinedAttributes = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : null;

			var _ignoreDynamicValues = arguments.length > 7 && arguments[7] !== undefined ? arguments[7] : false;

			this.taskScheduler = [];
			this._pageSizeOptimize = _pageSizeOptimize;
			this.dynamicVariableCounter = [];
			this.ignoreDynamicValues = _ignoreDynamicValues;
			this.globalChildrenLoaded = 0;
			this.globalChildrenToBeLoaded = 0;
			this.globalChildCheckingDone = false;
			this.predefinedAttributes = !_predefinedAttributes ? [] : _predefinedAttributes;

			if (!skipWebKeysIfNotEmpty || skipWebKeysIfNotEmpty && this.keyValueMap.length === 0) {
				this._getDataFromJazz(workitemID, updateTitle, configuration, allowDeepChild, function (mainContainer) {
					if (!allowDeepChild) {
						_this.globalChildCheckingDone = true;

						mainContainer._allDataCollectedFromJazz(updateTitle, configuration);
					}
				});
			} else {
				this.globalChildCheckingDone = true;

				this._allDataCollectedFromJazz(updateTitle, configuration);
			}
		},
		_runScheduledTasks: function _runScheduledTasks() {
			if (this.taskScheduler.length != 0) {
				for (var i = 0; i < this.taskScheduler.length; i++) {
					this.taskScheduler[i]();
				}

				this.taskScheduler = [];
			}
		},
		_allDataCollectedFromJazz: function _allDataCollectedFromJazz(updateTitle, configuration) {
			this.dynamicHeightList = [];

			if (this.globalChildCheckingDone) {
				this._applyConfigurationToWorkitem(configuration);

				this._runScheduledTasks();

				if (this.dynamicHeightList.length != 0 && !this.ignoreDynamicValues) {
					this._applyDynamicHeights(updateTitle, configuration);
				} else if (updateTitle) {
					this.parentWidget._updateTitle();
				}
			}
		},
		_childWasLoaded: function _childWasLoaded(updateTitle, configuration) {
			var increment = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;

			if (increment) {
				this.globalChildrenLoaded++;
			}

			if (this.globalChildrenToBeLoaded !== 0 && this.globalChildrenLoaded >= this.globalChildrenToBeLoaded) {
				this._allDataCollectedFromJazz(updateTitle, configuration);
			}
		},
		_getDataFromJazz: function _getDataFromJazz(workitemID, updateTitle, configuration, allowDeepChild, _callback) {
			var _this2 = this;

			var currentChildID = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : null;
			var childEndpointID = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : null;
			jazz.client.xhrGet({
				url: "".concat(this.parentWidget.webURL, "/service/com.ibm.team.workitem.common.internal.rest.IWorkItemRestService/workItemDTO2?includeHistory=false&id=").concat(workitemID),
				error: function error() {
					this.parentWidget.showErrorMessage("Can't request the given ID");
					return null;
				}
			}).then(function (rootResult) {
				if (rootResult == null || rootResult == undefined) {
					_callback(_this2);
				} else {
					_this2._processDataFromJazz(_this2, rootResult, allowDeepChild, currentChildID, updateTitle, configuration, childEndpointID);

					_callback(_this2);
				}
			}.bind(this));
		},
		_processDataFromJazz: function _processDataFromJazz(mainContainer, rootResult, allowDeepChild, currentChildID, updateTitle, configuration, childEndpointID) {
			var _this3 = this;

			if (currentChildID == null) {
				this.keyValueMap = [];
				this.dynamicVariableCounter = [];
			}

			var _xmlContent = null;

			if (window.ActiveXObject) {
				var oXML = new ActiveXObject("Microsoft.XMLDOM");
				oXML.loadXML(rootResult);
				_xmlContent = oXML;
			} else {
				_xmlContent = new DOMParser().parseFromString(rootResult, "text/xml");
			}

			_xmlContent.querySelectorAll("value > attributes").forEach(function (queryElement) {
				mainContainer.keyValueMap.push(["".concat(childEndpointID != null && currentChildID != null ? "".concat(childEndpointID, ":").concat(currentChildID, ":") : "").concat(queryElement.querySelector("key").textContent), queryElement.querySelector("value")]);
			});

			var _queryResult = _xmlContent.querySelectorAll("value > linkTypes > endpointId");

			var _loop = function _loop(i) {
				var _queryElement = _queryResult[i];
				var hasEndpointID = true;

				if (_queryElement.textContent == "") {
					hasEndpointID = false;
					_queryElement.textContent = _queryElement.closest("linkTypes").querySelector("id").textContent;
				}

				if (currentChildID === null) {
					mainContainer._globalDynamicCounterCreateOrUpdate(_queryElement.textContent);

					_queryElement.closest('linkTypes').querySelectorAll(":scope > linkDTOs").forEach(function (queryChildElement) {
						var queryList = queryChildElement.querySelectorAll(":scope > target > attributes");
						var fakeType = false;

						if (queryList.length == 0) {
							fakeType = true;

							if (queryChildElement.children == undefined || queryChildElement.children == null) {
								var n = 0,
									node,
									nodes = queryChildElement.childNodes,
									children = [];

								while (node = nodes[n++]) {
									if (node.nodeType === 1) {
										children.push(node);
									}
								}

								queryList = children;
							} else {
								queryList = Array.from(queryChildElement.children);
							}

							var fakeID = document.createElement("_id");
							var fakeIDSplit = queryChildElement.querySelector(":scope > url").textContent.split("/");
							fakeID.innerText = hasEndpointID && !isNaN(Number(fakeIDSplit[fakeIDSplit.length - 1])) ? fakeIDSplit[fakeIDSplit.length - 1] : mainContainer._globalDynamicCounterGetValueContent(_queryElement.textContent);
							queryList.push(fakeID);
							queryList.length = queryList.length == undefined ? queryList.children.length : queryList.length;
						}

						var fakeURL = queryChildElement.querySelector(":scope > url");

						if (fakeURL != undefined || fakeURL != null) {
							var fakeURLKey = document.createElement("key");
							var fakeURLValue = document.createElement("value");
							fakeURLKey.innerText = "_url";
							fakeURLValue.innerHTML = "<label>".concat(fakeURL.textContent, "</label>");
							var fakeURLHolder = document.createElement("attributes");
							fakeURLHolder.appendChild(fakeURLKey);
							fakeURLHolder.appendChild(fakeURLValue);
							mainContainer.keyValueMap.push(["".concat(_queryElement.textContent, ":").concat(mainContainer._globalDynamicCounterGetValueContent(_queryElement.textContent), ":_url"), fakeURLValue]);
						}

						if (!allowDeepChild || !hasEndpointID || _queryElement.textContent == "textuallyReferenced") {
							mainContainer._readAttributeValuesWithNoDeepValue(_queryElement, queryList, allowDeepChild, updateTitle, configuration, fakeType);
						} else {
							for (var c = 0; c < queryList.length; c++) {
								var element = queryList[c];

								if (fakeType || element.querySelector("key").textContent.toLowerCase() == "id") {
									var fakeElementID = null;

									if (fakeType) {
										var _fakeURL = queryChildElement.querySelector(":scope > url").textContent;

										var fakeSplit = _fakeURL.split("/");

										fakeElementID = Number(fakeSplit[fakeSplit.length - 1]);

										if (isNaN(fakeElementID) || !_fakeURL.startsWith(window.location.origin)) {
											mainContainer._readAttributeValuesWithNoDeepValue(_queryElement, queryList, allowDeepChild, updateTitle, configuration, fakeType);

											break;
										}
									}

									mainContainer._getDataFromJazz(fakeType ? fakeElementID : element.querySelector("value > id").textContent, updateTitle, configuration, allowDeepChild, function (_requestMainContainer) {
										_requestMainContainer._childWasLoaded(updateTitle, configuration);
									}, mainContainer._globalDynamicCounterGetValueContent(_queryElement.textContent), _queryElement.textContent);

									break;
								}
							}
						}

						mainContainer._globalDynamicCounterCreateOrUpdate(_queryElement.textContent);
					});

					if (mainContainer._globalDynamicCounterGetValueContent(_queryElement.textContent) !== 0) {
						mainContainer.globalChildrenToBeLoaded += mainContainer._globalDynamicCounterGetValueContent(_queryElement.textContent);
						var value = document.createElement("value");
						var label = document.createElement("label");
						label.innerText = mainContainer._globalDynamicCounterGetValueContent(_queryElement.textContent);
						value.appendChild(label);
						mainContainer.keyValueMap.push([_queryElement.textContent, value]);
					}
				}
			};

			for (var i = 0; i < _queryResult.length; i++) {
				_loop(i);
			}

			this._applyCustomCurrentAttributeToPredefined();

			this.predefinedAttributes.forEach(function (element) {
				var value = document.createElement("value");
				var label = document.createElement("label");
				label.innerText = element.value;
				value.appendChild(label);

				_this3.keyValueMap.push([element.key, value]);
			});
			this.globalChildCheckingDone = true;

			if (allowDeepChild && currentChildID == null && mainContainer.globalChildrenToBeLoaded === 0) {
				this._allDataCollectedFromJazz(updateTitle, configuration);
			} else {
				if (allowDeepChild) {
					mainContainer._childWasLoaded(updateTitle, configuration, false);
				}
			}
		},
		_getCurrentUser: function _getCurrentUser() {
			return com.ibm.team.repository.web.client.internal.AUTHENTICATED_CONTRIBUTOR;
		},
		_applyCustomCurrentAttributeToPredefined: function _applyCustomCurrentAttributeToPredefined() {
			var _this4 = this;

			var userDataKeys = ['archived', 'emailAddress', 'immutable', 'itemId', 'modified', 'name', 'stateId', 'userId'];

			var currentUserData = this._getCurrentUser();

			if (currentUserData) {
				userDataKeys.forEach(function (key) {
					_this4._addPredefinedKeyValue("current.user.".concat(key), currentUserData[key]);
				});
			} else {
				console.warn("Failed to load the current user");
			}

			var now = Date.now();
			var currentDate = new Date(now);
			var dateString = currentDate.toUTCString();

			this._addPredefinedKeyValue('current.date', dateString);

			this._addPredefinedKeyValue('current.date.f.g.time', this._formateDate(now, 'hh\:mnmn\:ss'));

			this._addPredefinedKeyValue('current.date.f.g.date', this._formateDate(now, 'dd/mm/yyyy'));

			this._addPredefinedKeyValue('current.date.f.us.date', this._formateDate(now, 'mm/dd/yyyy'));

			this._addPredefinedKeyValue('current.date.l.time', currentDate.toTimeString());

			this._addPredefinedKeyValue('current.date.l.date', currentDate.toDateString());
		},
		_addPredefinedKeyValue: function _addPredefinedKeyValue(key, value) {
			this.predefinedAttributes.push({
				key: key,
				value: value
			});
		},
		_readAttributeValuesWithNoDeepValue: function _readAttributeValuesWithNoDeepValue(_queryElement, queryList, allowDeepChild, updateTitle, configuration, fakeType) {
			var _this5 = this;

			queryList.forEach(function (queryAttributeElement) {
				if (fakeType) {
					var keyValue = document.createElement("key");
					keyValue.innerText = queryAttributeElement.tagName;
					var valueElement = document.createElement("value");
					var valueContent = document.createElement("label");
					valueContent.innerText = queryAttributeElement.textContent;
					valueElement.appendChild(valueContent);
					queryAttributeElement.appendChild(keyValue);
					queryAttributeElement.appendChild(valueElement);
				}

				_this5.keyValueMap.push(["".concat(_queryElement.textContent, ":").concat(_this5._globalDynamicCounterGetValueContent(_queryElement.textContent), ":").concat(queryAttributeElement.querySelector("key").textContent), queryAttributeElement.querySelector("value")]);
			});

			if (allowDeepChild) {
				this._childWasLoaded(updateTitle, configuration);
			}
		},
		_globalDynamicCounterCreateOrUpdate: function _globalDynamicCounterCreateOrUpdate(name) {
			var forceCreate = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
			var valueToAdd = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1;
			var defaultValue = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;

			for (var i = 0; i < this.dynamicVariableCounter.length; i++) {
				if (this.dynamicVariableCounter[i][0] == name) {
					if (forceCreate) {
						this.dynamicVariableCounter[i][1] = defaultValue;
					} else {
						this.dynamicVariableCounter[i][1] += valueToAdd;
					}

					return;
				}
			}

			this.dynamicVariableCounter.push([name, defaultValue]);
		},
		_globalDynamicCounterGetValueContent: function _globalDynamicCounterGetValueContent(name) {
			for (var i = 0; i < this.dynamicVariableCounter.length; i++) {
				if (this.dynamicVariableCounter[i][0] == name) {
					return this.dynamicVariableCounter[i][1];
				}
			}

			return undefined;
		},
		_applyConfigurationToWorkitem: function _applyConfigurationToWorkitem(configurationJSON) {
			this.dynamicHeightList = [];

			try {
				var _activeConfigurationJSON = this._loadConfigurationByWorkitem(configurationJSON);

				if (_activeConfigurationJSON == null) {
					this.parentWidget.showErrorMessage("No configuration can be found or loaded");
					return;
				}

				this.activeConfigurationWidth = _activeConfigurationJSON.config.width;
				this.parentWidget.getHolderElement().appendChild(this._generateContentTable(_activeConfigurationJSON.config.width, _activeConfigurationJSON.config.height, _activeConfigurationJSON.config.border, _activeConfigurationJSON.config.tablePosition));

				if (_activeConfigurationJSON.values == undefined || !Array.isArray(_activeConfigurationJSON.values)) {
					throw SyntaxError;
				}

				for (var _valueCount = 0; _valueCount < _activeConfigurationJSON.values.length; _valueCount++) {
					var _configurationValue = _activeConfigurationJSON.values[_valueCount];

					this._drawContainerInTable(_configurationValue.start, _configurationValue.end, _configurationValue.regionID, _configurationValue.backColor, _configurationValue.borderless);
				}

				for (var _valueCount2 = 0; _valueCount2 < _activeConfigurationJSON.values.length; _valueCount2++) {
					var _configurationValue2 = _activeConfigurationJSON.values[_valueCount2];

					if (_configurationValue2.textContent != null || _configurationValue2.textContent !== "") {
						this._setContentOfContainer(_configurationValue2.start, _configurationValue2.end, _configurationValue2.regionID, _configurationValue2.textContent, _configurationValue2.fontSize, _configurationValue2.textBinding, _configurationValue2.textVertical, _configurationValue2.textColor, _configurationValue2.toolTipContent);

						if (_configurationValue2.dynamicHeight) {
							this.dynamicHeightList.push(_configurationValue2.regionID);
						}
					}
				}
			} catch (e) {
				this.parentWidget.showErrorMessage("The given JSON - Configuration can't be read");
				console.error(e);
			}
		},
		_loadConfigurationByWorkitem: function _loadConfigurationByWorkitem(configuration) {
			var _backupID = null;

			var _workItemType = this._checkRegexAndTranslate("{{workItemType}}");

			try {
				for (var i = 0; i < configuration.length; i++) {
					var elementConfiguration = configuration[i];
					var elementConfigurationTypeList = elementConfiguration.type.split(";");

					for (var c = 0; c < elementConfigurationTypeList.length; c++) {
						var elementTypeValue = elementConfigurationTypeList[c];

						if (elementTypeValue == _workItemType) {
							return elementConfiguration;
						} else if (elementTypeValue == "*") {
							_backupID = i;
						}
					}
				}
			} catch (e) {
				return null;
			}

			if (_backupID != null) {
				return configuration[_backupID];
			}

			return null;
		},
		_checkRegexAndTranslate: function _checkRegexAndTranslate(textContent) {
			var _this6 = this;

			var regionID = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

			var _forceSelector = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

			var _defaultOnForceFailed = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;

			var _mainContainer = this;

			var _regex = /\{\{.*?\}\}/g;

			var _m;

			var _returnValue = textContent;

			while ((_m = _regex.exec(textContent)) !== null) {
				if (_m.index === _regex.lastIndex) {
					_regex.lastIndex++;
				}

				_m.forEach(function (match, groupIndex) {
					var _replaceValue = match;

					var _contentID = match.substring(2, match.length - 2).split("#");

					var _checkEndWith = _contentID[0].startsWith("*");

					var _checkStartWith = _contentID[0].endsWith("*");

					if (_checkStartWith) {
						_contentID[0] = _contentID[0].substring(0, _contentID[0].length - 1);
					} else if (_checkEndWith) {
						_contentID[0] = _contentID[0].substring(1, _contentID[0].length);
					}

					for (var i = 0; i < _mainContainer.keyValueMap.length; i++) {
						var _mapElement = _mainContainer.keyValueMap[i];

						if (_mapElement[0] == _contentID[0] || _checkStartWith && _mapElement[0].startsWith(_contentID[0]) || _checkEndWith && _mapElement[0].endsWith(_contentID[0])) {
							_replaceValue = _mainContainer._translateValueToText(_mapElement[1], _contentID.length > 1 ? _contentID[1].replace(/\[.*\]/g, "") : null, _forceSelector, _defaultOnForceFailed);

							if (_contentID.length > 1) {
								var returnSmartCommandValue = _this6._checkAndApplySmartCommand(_contentID[0], _contentID[1], _replaceValue, regionID);

								if (!returnSmartCommandValue.show) {
									_replaceValue = "";
								} else if (returnSmartCommandValue.overwrite !== undefined) {
									_replaceValue = returnSmartCommandValue.overwrite;
								}
							}

							break;
						}
					}

					if (_replaceValue === match && _contentID.length > 1 && _contentID[1].startsWith("?")) {
						_replaceValue = "";
					}

					_returnValue = _returnValue.replace(match, _replaceValue);
				});
			}

			return _returnValue;
		},
		_translateValueToText: function _translateValueToText(value) {
			var _command = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

			var _forceSelector = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

			var _defaultOnForceFailed = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;

			var _mainContainer = this;

			var _allowEmptyReturn = false;

			if (Boolean(_command) && _command.charAt(0) == '?') {
				_allowEmptyReturn = true;
				_command = _command.substr(1);
			}

			if (_forceSelector !== null) {
				var returnValue = value.querySelector(":scope > ".concat(_forceSelector));

				if (Boolean(returnValue)) {
					return this._getValueFromXML(value, returnValue, _allowEmptyReturn, _command);
				}

				if (!_defaultOnForceFailed) {
					return _allowEmptyReturn ? "" : "[Unknown-Selector]";
				}
			}

			if (Boolean(value.querySelector(":scope > label"))) {
				var _labelValue = value.querySelector(":scope > label");

				return this._getValueFromXML(value, _labelValue, _allowEmptyReturn, _command);
			} else if (Boolean(value.querySelector(":scope > id"))) {
				var _idValue = value.querySelector(":scope > id");

				return this._getValueFromXML(value, _idValue, _allowEmptyReturn, _command);
			} else if (Boolean(value.querySelector(":scope > content"))) {
				var _contentValue = value.querySelector(":scope > content");

				return this._getValueFromXML(value, _contentValue, _allowEmptyReturn, _command);
			} else if (Boolean(value.querySelector(":scope > items"))) {
				var _itemsValue = value.querySelectorAll(":scope > items");

				if (NodeList.prototype.isPrototypeOf(_itemsValue) || Array.isArray(_itemsValue)) {
					if (_itemsValue.length == 0) {
						return _allowEmptyReturn ? "" : "[Empty-List]";
					} else {
						if (Boolean(_command)) {
							if (!isNaN(Number(_command)) && _itemsValue.length >= Number(_command) + 1) {
								return this._translateValueToText(_itemsValue[Number(_command)]);
							} else {
								return _itemsValue[_command] != undefined ? _itemsValue[_command] : _allowEmptyReturn ? "" : "[Undefined-Command]";
							}
						} else {
							var _listReturn = "";

							_itemsValue.forEach(function (itemElement) {
								if (_listReturn != "") {
									_listReturn += ", ";
								}

								_listReturn += _mainContainer._translateValueToText(itemElement);
							});

							return _listReturn;
						}
					}
				} else {
					return _allowEmptyReturn ? "" : "[Unknown-Type]";
				}
			} else {
				return _allowEmptyReturn ? "" : "[Empty]";
			}
		},
		_checkAndApplySmartCommand: function _checkAndApplySmartCommand() {
			var textContentKey = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
			var command = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
			var contentValue = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "";
			var regionID = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;
			if (command == null && regionID == null) return true;
			var self = this;
			var bracketRegex = /\[.*\]/g;
			var bracketM;
			var smartCommandConfig = {
				show: true
			};

			while ((bracketM = bracketRegex.exec(command)) !== null) {
				if (bracketM.index === bracketRegex.lastIndex) {
					bracketRegex.lastIndex++;
				}

				bracketM.forEach(function (bracketMatch, bracketGroupIndex) {
					bracketMatch = bracketMatch.slice(1, -1);
					var keyWordList = bracketMatch.split(";");
					keyWordList.forEach(function (keyWordListElement) {
						var listKeyAndValue = keyWordListElement.split(/([a-zA-Z0-9]{1,})\:/gm);
						smartCommandConfig = self._handleSmartCommandKeys(listKeyAndValue[0] !== "" ? listKeyAndValue[0] + listKeyAndValue[1] : listKeyAndValue[1], listKeyAndValue[2], smartCommandConfig);
					});

					self._applySmartCommandConfig(textContentKey, smartCommandConfig, contentValue, regionID);
				});
			}

			return {
				show: smartCommandConfig.show,
				overwrite: smartCommandConfig.overwrite
			};
		},
		_handleSmartCommandKeys: function _handleSmartCommandKeys(key, value) {
			var previousValue = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

			switch (key) {
				case "t":
					previousValue.type = value;
					break;

				case "s":
				case "show":
					previousValue.show = value == "0" ? false : true;
					break;

				default:
					if (key != undefined && key != "") {
						previousValue[key] = value.replace(/\\\:/g, ":");
					}

					break;
			}

			return previousValue;
		},
		_applySmartCommandConfig: function _applySmartCommandConfig(textContentKey, previousValue, keyWordContent, regionID) {
			var _this7 = this;

			if (previousValue.type === "css" && previousValue.css !== undefined) {
				this.parentWidget.getHolderElement().querySelectorAll('[regionID="' + regionID + '"]').forEach(function (element) {
					previousValue.css.split(",").forEach(function (cssElement) {
						element.style[cssElement] = keyWordContent;
					});
				});
			} else if (previousValue.type === "table" && previousValue.table !== undefined) {
				this.taskScheduler.push(function () {
					var contentHolderElement = _this7.parentWidget.getHolderElement().querySelector('[regionID="' + regionID + '"] > .textHolder > .textContainer > .textDisplay');

					if (contentHolderElement == null) {
						return;
					}

					contentHolderElement.innerHTML = "";

					if (!previousValue.show) {
						return;
					}

					var tableHolderElement = document.createElement("table");
					tableHolderElement.style.width = "calc(100% - 3px)";
					contentHolderElement.style.width = "inherit";
					tableHolderElement.style.color = contentHolderElement.parentNode.style.color;
					tableHolderElement.style.borderCollapse = "collapse";
					tableHolderElement.style.tableLayout = "fixed";
					var borderValue = previousValue.border != undefined ? "1px solid ".concat(previousValue.border) : "none";
					var boldHeader = previousValue.boldHeader != undefined ? previousValue.boldHeader : "0";
					var informationTable = document.createElement("tr");
					var globalTableFilter = new Map();
					var globalTableFormatter = new Map();

					if (previousValue.filter != undefined) {
						var splitValue = previousValue.filter.split(",");

						for (var i = 0; i < splitValue.length; i++) {
							var element = splitValue[i].split("@");

							if (element.length == 2) {
								globalTableFilter.set(element[0], element[1]);
							}
						}
					}

					previousValue.table.split(",").forEach(function (tableHeaderElement, index) {
						var tableHeaderElementArray = tableHeaderElement.split("&&");
						var tableHeader = document.createElement("th");
						tableHeader.innerText = tableHeaderElementArray[0];
						tableHeader.style.textAlign = contentHolderElement.parentNode.style.textAlign;
						tableHeader.style.border = borderValue;

						for (var _i = 1; _i < tableHeaderElementArray.length; _i++) {
							var _element = tableHeaderElementArray[_i].split("@");

							switch (_element[0]) {
								case "w":
									tableHeader.style.width = "".concat(_element[1], "%");
									break;

								case "c":
									tableHeader.innerText = _element[1];
									break;

								case "f":
									globalTableFilter.set(tableHeaderElementArray[0], _element[1]);
									break;

								default:
									if (_element.length == 2) {
										globalTableFormatter.set(index, [_element[0], _element[1]]);
									}

									break;
							}
						}

						if (boldHeader == "1") {
							tableHeader.innerHTML = _this7._striptTags(tableHeader.innerText.bold(), "<b>");
						}

						informationTable.appendChild(tableHeader);
					});
					tableHolderElement.appendChild(informationTable);

					var _loop2 = function _loop2(_i2) {
						var rowAllowed = true;
						globalTableFilter.forEach(function (value, key) {
							if (rowAllowed) {
								var localCheckingList = [];

								if (value.startsWith("([") && value.endsWith("])")) {
									var localValue = value.substring(2, value.length - 2);
									localValue.split("&&").forEach(function (element) {
										localCheckingList.push(element);
									});
								} else {
									localCheckingList.push(value);
								}

								var localTranslatedValue = _this7._checkRegexAndTranslate("{{".concat(textContentKey, ":").concat(_i2, ":").concat(key, "}}"));

								for (var c = 0; c < localCheckingList.length; c++) {
									var listElement = localCheckingList[c];
									var filterEqualMode = !listElement.startsWith("!!");

									if (!filterEqualMode) {
										listElement = listElement.substring(2, listElement.length);
									}

									if (filterEqualMode && localTranslatedValue != listElement || !filterEqualMode && localTranslatedValue == listElement) {
										rowAllowed = false;

										if (localCheckingList.length == 1) {
											break;
										}
									} else {
										rowAllowed = true;
										break;
									}
								}
							}
						});

						if (rowAllowed) {
							var valueRowElement = document.createElement("tr");
							previousValue.table.split(",").forEach(function (tableContentElement, index) {
								var tableContentRow = document.createElement("td");
								var translateString = "{{".concat(textContentKey, ":").concat(_i2, ":").concat(tableContentElement.split("&&")[0], "}}");

								var translatedValue = _this7._checkRegexAndTranslate(translateString);

								var formatValue = globalTableFormatter.get(index);

								if (formatValue != undefined && formatValue.length == 2) {
									switch (formatValue[0]) {
										case "date":
											translatedValue = _this7._formateDate(_this7._checkRegexAndTranslate(translateString, null, "id"), formatValue[1]);
											break;

										case "link":
											translatedValue = _this7._formateLink(translatedValue, formatValue[1]);
											break;

										case "clickNode":
											var formatedValueString = "{{".concat(textContentKey, ":").concat(_i2, ":").concat(formatValue[1], "}}");

											var translatedFormatedValueString = _this7._checkRegexAndTranslate(formatedValueString);

											if (formatedValueString !== translatedFormatedValueString) {
												translatedValue = _this7._formateLink(translatedFormatedValueString, translatedValue);
											}

											break;

										default:
											break;
									}
								}

								tableContentRow.innerHTML = _this7._striptTags(translateString == translatedValue ? "-" : translatedValue, _this7.GLOBAL_HTML_ALLOWED_TAGS);
								tableContentRow.style.textAlign = contentHolderElement.parentNode.style.textAlign;
								tableContentRow.style.border = borderValue;
								valueRowElement.appendChild(tableContentRow);
							});
							tableHolderElement.appendChild(valueRowElement);
						}
					};

					for (var _i2 = 0; _i2 < keyWordContent; _i2++) {
						_loop2(_i2);
					}

					contentHolderElement.appendChild(tableHolderElement);
				});
			} else if (previousValue.type === "date" && previousValue.date !== undefined) {
				previousValue.overwrite = this._formateDate(this._checkRegexAndTranslate("{{".concat(textContentKey, "}}"), null, "id"), previousValue.date.toLowerCase());
			} else if (previousValue.type === "link" && previousValue.link !== undefined) {
				previousValue.overwrite = this._formateLink(keyWordContent, previousValue.link);
			} else if (previousValue.type === "image") {
				this.taskScheduler.push(function () {
					var contentHolderElement = _this7.parentWidget.getHolderElement().querySelector('[regionID="' + regionID + '"] > .textHolder > .textContainer > .textDisplay');

					if (contentHolderElement == null) {
						return;
					}

					contentHolderElement.innerHTML = "";

					if (!previousValue.show) {
						return;
					}

					var imageElement = document.createElement("img");

					if (previousValue.src != undefined) {
						imageElement.src = previousValue.src;
					} else if (previousValue.src_by_name != undefined && previousValue.src_by_node != undefined && previousValue.src_by_result) {
						imageElement.src = _this7._getValueFromListByKey(textContentKey, previousValue.src_by_name, previousValue.src_by_node, previousValue.src_by_result, !(previousValue.src_by_case != undefined && previousValue.src_by_case == 0));
					} else {
						imageElement.src = keyWordContent;
					}

					var altValue = previousValue.desc != undefined ? previousValue.desc : "";
					imageElement.alt = altValue;
					imageElement.title = altValue;
					imageElement.style.width = previousValue.width != undefined ? previousValue.width : "auto";
					imageElement.style.height = previousValue.height != undefined ? previousValue.height : "auto";
					contentHolderElement.appendChild(imageElement);
				});
			} else if (previousValue.type === "toggle") {
				this.taskScheduler.push(function () {
					var contentHolderElement = _this7.parentWidget.getHolderElement().querySelector('[regionID="' + regionID + '"] > .textHolder > .textContainer > .textDisplay');

					if (contentHolderElement == null) {
						return;
					}

					contentHolderElement.innerHTML = "";

					if (!previousValue.show) {
						return;
					}

					var svgContainer = document.createElement('div');
					var hidden = previousValue["default"] && previousValue["default"] == "hidden";
					svgContainer.classList.add("rotate-z-".concat(hidden ? '90' : '0'));
					svgContainer.innerHTML = '<svg class="no-event" fill="currentColor" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"	 width="100%" height="100%" viewBox="0 0 284.929 284.929" style="enable-background:new 0 0 284.929 284.929;"	 xml:space="preserve"><g>	<path d="M282.082,76.511l-14.274-14.273c-1.902-1.906-4.093-2.856-6.57-2.856c-2.471,0-4.661,0.95-6.563,2.856L142.466,174.441		L30.262,62.241c-1.903-1.906-4.093-2.856-6.567-2.856c-2.475,0-4.665,0.95-6.567,2.856L2.856,76.515C0.95,78.417,0,80.607,0,83.082		c0,2.473,0.953,4.663,2.856,6.565l133.043,133.046c1.902,1.903,4.093,2.854,6.567,2.854s4.661-0.951,6.562-2.854L282.082,89.647		c1.902-1.903,2.847-4.093,2.847-6.565C284.929,80.607,283.984,78.417,282.082,76.511z"/></g></svg>';
					contentHolderElement.appendChild(svgContainer);

					if (_this7.ignoreDynamicValues || !Boolean(previousValue.toggle)) {
						return;
					}

					var self = _this7;
					svgContainer.setAttribute('toggle', previousValue.toggle);
					svgContainer.classList.add("pointer");
					svgContainer.addEventListener('click', function (event) {
						var sourceElement = event.srcElement;
						var isVisible = sourceElement.classList.contains('rotate-z-90');
						sourceElement.getAttribute('toggle').split(',').forEach(function (id) {
							if (Number(id) != NaN) {
								self._setRegionVisibilityByID(id, isVisible);
							}
						});
						sourceElement.classList.toggle('rotate-z-0');
						sourceElement.classList.toggle('rotate-z-90');
					});

					if (hidden) {
						previousValue.toggle.split(',').forEach(function (id) {
							if (Number(id) != NaN) {
								self._setRegionVisibilityByID(id, false);
							}
						});
					}

					if (previousValue.blink) {
						var color = previousValue.blink.replace('-', '').replace('_', '#');
						var parentHolder = contentHolderElement.parentNode.parentNode.parentNode;

						if (parentHolder) {
							parentHolder.style.setProperty('--blink-color', color);
							parentHolder.classList.add('blink');
						}
					}
				});
			}
		},
		_setRegionVisibilityByID: function _setRegionVisibilityByID(region, isVisible) {
			this.parentWidget.getHolderElement().querySelectorAll("[regionID='".concat(region, "']")).forEach(function (entry) {
				entry.style.display = isVisible ? 'table-cell' : 'none';
			});
		},
		_getValueFromListByKey: function _getValueFromListByKey(textContentKey, valueToCheck, contentKey, resultKey) {
			var caseSensitive = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : true;

			if (valueToCheck.length == 0) {
				return "";
			}

			if (!caseSensitive) {
				valueToCheck = valueToCheck.toLowerCase();
			}

			var valueCounter = Number(this._checkRegexAndTranslate("{{".concat(textContentKey, "}}")));

			if (!isNaN(valueCounter)) {
				var endsWith = valueToCheck[0] === "*";
				var startsWith = valueToCheck[valueToCheck.length - 1] === "*";

				if (endsWith) {
					valueToCheck = valueToCheck.substring(1, valueToCheck.length);
				}

				if (startsWith) {
					valueToCheck = valueToCheck.substring(0, valueToCheck.length - 1);
				}

				for (var i = 0; i < valueCounter; i++) {
					var checkingCurrentValue = caseSensitive ? this._checkRegexAndTranslate("{{".concat(textContentKey, ":").concat(i, ":").concat(contentKey, "}}")) : this._checkRegexAndTranslate("{{".concat(textContentKey, ":").concat(i, ":").concat(contentKey, "}}")).toLowerCase();

					if (endsWith && startsWith && checkingCurrentValue.includes(valueToCheck) || endsWith && checkingCurrentValue.endsWith(valueToCheck) || startsWith && checkingCurrentValue.startsWith(valueToCheck) || checkingCurrentValue === valueToCheck) {
						return this._checkRegexAndTranslate("{{".concat(textContentKey, ":").concat(i, ":").concat(resultKey, "}}"));
					}
				}
			} else {
				return "";
			}
		},
		_formateDate: function _formateDate(keyWordContent, formatter) {
			var returnValue = formatter.toLowerCase();
			var dateValue = new Date(keyWordContent);

			if (isNaN(dateValue)) {
				return keyWordContent;
			}

			returnValue = returnValue.replace(/ss/gm, "".concat(dateValue.getSeconds() < 10 ? "0" : "").concat(dateValue.getSeconds()));
			returnValue = returnValue.replace(/s/gm, dateValue.getSeconds());
			returnValue = returnValue.replace(/mnmn/gm, "".concat(dateValue.getMinutes() < 10 ? "0" : "").concat(dateValue.getMinutes()));
			returnValue = returnValue.replace(/mn/gm, dateValue.getMinutes());
			returnValue = returnValue.replace(/hh/gm, "".concat(dateValue.getHours() < 10 ? "0" : "").concat(dateValue.getHours()));
			returnValue = returnValue.replace(/h/gm, dateValue.getHours());
			returnValue = returnValue.replace(/dd/gm, "".concat(dateValue.getDate() < 10 ? "0" : "").concat(dateValue.getDate()));
			returnValue = returnValue.replace(/d/gm, dateValue.getDate());
			returnValue = returnValue.replace(/mm/gm, "".concat(dateValue.getMonth() < 9 ? "0" : "").concat(dateValue.getMonth() + 1));
			returnValue = returnValue.replace(/m/gm, dateValue.getMonth() + 1);
			returnValue = returnValue.replace(/yyyy/gm, "".concat(dateValue.getFullYear()));
			returnValue = returnValue.replace(/yy/gm, "".concat(String(dateValue.getFullYear()).slice(2)));
			return returnValue;
		},
		_formateLink: function _formateLink(keyWordContent, formatter) {
			return "<a href=\"".concat(keyWordContent, "\" target=\"_blank\" rel=\"noopener noreferrer\">").concat(formatter, "</a>");
		},
		_getValueFromXML: function _getValueFromXML(xmlDocument, xmlValue, allowEmptyReturn, command) {
			if (Boolean(command)) {
				if (xmlValue.textContent[command] != undefined) {
					return xmlValue.textContent[command];
				} else {
					return allowEmptyReturn ? "" : "[Undefined-Command]";
				}
			} else {
				return this._matchLinksToText(xmlValue.textContent, xmlDocument.querySelectorAll(":scope > links"));
			}
		},
		_matchLinksToText: function _matchLinksToText(text, links) {
			if (Boolean(links) && (NodeList.prototype.isPrototypeOf(links) || Array.isArray(links)) && links.length > 0) {
				var _returnValue = text;

				var _sortedLinksList = [].slice.call(links).sort(function (a, b) {
					return Number(a.querySelector("offset").textContent) > Number(b.querySelector("offset").textContent) ? -1 : 1;
				});

				_sortedLinksList.forEach(function (elementLinkNode) {
					var _elementLinkNodeOffset = Number(elementLinkNode.querySelector("offset").textContent);

					var _elementLinkNodeLength = Number(elementLinkNode.querySelector("length").textContent);

					var _elementLinkNodeWebUri = elementLinkNode.querySelector("weburi").textContent;
					_returnValue = _returnValue.substring(0, _elementLinkNodeOffset) + "<a href='" + _elementLinkNodeWebUri + "' target='_blank' rel='noopener noreferrer'>" + _returnValue.substring(_elementLinkNodeOffset, _elementLinkNodeOffset + _elementLinkNodeLength) + "</a>" + _returnValue.substring(_elementLinkNodeOffset + _elementLinkNodeLength);
				});

				return _returnValue;
			} else {
				return text;
			}
		},
		_striptTags: function _striptTags(input, allowed) {
			allowed = (((allowed || '') + '').toLowerCase().match(/<[a-z][a-z0-9]*>/g) || []).join('');
			var _tags = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi,
				_commentsAndPhpTags = /<!--[\s\S]*?-->|<\?(?:php)?[\s\S]*?\?>/gi;
			return input.replace(_commentsAndPhpTags, '').replace(_tags, function (_0, _1) {
				return allowed.indexOf('<' + _1.toLowerCase() + '>') > -1 ? _0 : _0.replace("<", "&lt;").replace(">", "&gt;");
			});
		},
		_generateContentTable: function _generateContentTable(width, height, border) {
			var tablePosition = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : "center";

			if (width == null || height == null || !Number(width) || !Number(height)) {
				return null;
			}

			try {
				var _tableElement = document.createElement("table");

				_tableElement.classList.add("workitemTable");

				switch (tablePosition) {
					case "left":
						_tableElement.style.marginLeft = "unset";
						break;

					case "right":
						_tableElement.style.marginRight = "unset";
						break;
				}

				if (this._pageSizeOptimize !== null) {
					if (this._pageSizeOptimize.height !== undefined) {
						_tableElement.style.height = this._pageSizeOptimize.height;
					}

					if (this._pageSizeOptimize.width !== undefined) {
						_tableElement.style.width = this._pageSizeOptimize.width;
					}
				}

				if (border === undefined || border === true) {
					_tableElement.classList.add("border");
				}

				for (var h = 0; h < height; h++) {
					var tableRowElement = document.createElement("tr");

					for (var w = 0; w < width; w++) {
						var tableCellElement = document.createElement("td");
						tableCellElement.setAttribute("tableID", this._calculateIDByPosition(w, h));
						tableRowElement.appendChild(tableCellElement);
					}

					_tableElement.appendChild(tableRowElement);
				}

				return _tableElement;
			} catch (e) {
				return null;
			}
		},
		_drawContainerInTable: function _drawContainerInTable(startPosition, endPosition) {
			var _regionID = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

			var _backgroundColor = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;

			var _borderless = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;

			if (startPosition == null || endPosition == null || startPosition.x == undefined || startPosition.y == undefined || isNaN(startPosition.x) || isNaN(startPosition.y) || endPosition.x == undefined || endPosition.y == undefined || isNaN(endPosition.x) || isNaN(endPosition.y)) {
				throw SyntaxError;
			}

			var _rearrangedPositions = this._rearrangePositions(startPosition, endPosition);

			for (var x = _rearrangedPositions[0].x; x <= _rearrangedPositions[1].x; x++) {
				if (x < 0) {
					continue;
				}

				for (var y = _rearrangedPositions[0].y; y <= _rearrangedPositions[1].y; y++) {
					if (y < 0) {
						continue;
					}

					var _generatedID = this._calculateIDByPosition(x, y);

					var _elementByPosition = this.parentWidget.getHolderElement().querySelector('[tableID="' + _generatedID + '"]');

					if (_elementByPosition == null) {
						continue;
					}

					_elementByPosition.style.backgroundColor = _backgroundColor == null ? "" : _backgroundColor;

					if (!_borderless) {
						_elementByPosition.style.border = "none";
						var _borderDefaultSettings = "1px solid black";

						if (y === _rearrangedPositions[0].y) {
							_elementByPosition.style.borderTop = _borderDefaultSettings;
						}

						if (y === _rearrangedPositions[1].y) {
							_elementByPosition.style.borderBottom = _borderDefaultSettings;
						}

						if (x === _rearrangedPositions[0].x) {
							_elementByPosition.style.borderLeft = _borderDefaultSettings;
						}

						if (x === _rearrangedPositions[1].x) {
							_elementByPosition.style.borderRight = _borderDefaultSettings;
						}
					}

					if (_regionID != null) {
						_elementByPosition.setAttribute("regionID", _regionID);
					}
				}
			}
		},
		_setContentOfContainer: function _setContentOfContainer(startPosition, endPosition) {
			var _regionID = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

			var _textContent = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : "";

			var _textFont = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 10;

			var _textBinding = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : "left";

			var _textVertical = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : "top";

			var _textColor = arguments.length > 7 && arguments[7] !== undefined ? arguments[7] : "#ffffff";

			var _toolTipContent = arguments.length > 8 && arguments[8] !== undefined ? arguments[8] : "";

			var _rearrangedPositions = this._rearrangePositions(startPosition, endPosition);

			if (_rearrangedPositions[0].x < 0) {
				_rearrangedPositions[0].x = 0;
			}

			if (_rearrangedPositions[0].y < 0) {
				_rearrangedPositions[0].y = 0;
			}

			if (_rearrangedPositions[1].x < 0) {
				_rearrangedPositions[1].x = 0;
			}

			if (_rearrangedPositions[1].y < 0) {
				_rearrangedPositions[1].y = 0;
			}

			if (Boolean(_textContent)) {
				var _startElement = this.parentWidget.getHolderElement().querySelector("[tableID=\"".concat(this._calculateIDByPosition(_rearrangedPositions[0].x, _rearrangedPositions[0].y), "\"]"));

				var _endElement = this.parentWidget.getHolderElement().querySelector("[tableID=\"".concat(this._calculateIDByPosition(_rearrangedPositions[1].x, _rearrangedPositions[1].y), "\"]"));

				if (_startElement == null || _endElement == null) {
					return;
				}

				while (_startElement.hasChildNodes()) {
					_startElement.removeChild(_startElement.childNodes[0]);
				}

				var _startElementBoundaries = this._calculateBoundariesOfElement(_startElement);

				var _endElementBoundaries = this._calculateBoundariesOfElement(_endElement);

				var _textHolderElement = document.createElement("div");

				_textHolderElement.classList.add("textHolder");

				var _textContainerElement = document.createElement("div");

				_textContainerElement.classList.add("textContainer");

				if (Boolean(_toolTipContent)) {
					_textContainerElement.setAttribute("title", _toolTipContent);
				}

				var _textDisplayElement = document.createElement("div");

				_textDisplayElement.classList.add("textDisplay");

				_textDisplayElement.innerHTML = this._striptTags(this._checkRegexAndTranslate(_textContent, _regionID), this.GLOBAL_HTML_ALLOWED_TAGS);
				_textDisplayElement.style.verticalAlign = _textVertical;
				_textDisplayElement.style.width = "inherit";
				_textContainerElement.style.width = "".concat(_endElementBoundaries.left - _startElementBoundaries.left + _endElementBoundaries.width - 5, "px");
				_textContainerElement.style.height = "".concat(_endElementBoundaries.top - _startElementBoundaries.top + _endElementBoundaries.height - 3, "px");
				_textContainerElement.style.lineHeight = _textContainerElement.style.height;
				_textContainerElement.style.marginLeft = "2px";
				_textContainerElement.style.marginTop = "2px";
				_textContainerElement.style.fontSize = "".concat(_textFont * 10, "%");
				_textContainerElement.style.textAlign = _textBinding;
				_textContainerElement.style.color = _textColor;

				_textContainerElement.appendChild(_textDisplayElement);

				_textHolderElement.appendChild(_textContainerElement);

				_startElement.appendChild(_textHolderElement);
			}
		},
		_calculateIDByPosition: function _calculateIDByPosition(x, y) {
			return y * this.activeConfigurationWidth + x;
		},
		_rearrangePositions: function _rearrangePositions(startPosition, endPosition) {
			if (this._calculateIDByPosition(startPosition.x, startPosition.y) > this._calculateIDByPosition(endPosition.x, endPosition.y)) {
				var _virtualStartPosition = startPosition;
				startPosition = endPosition;
				endPosition = _virtualStartPosition;
			}

			if (startPosition.x > endPosition.x) {
				var _virtualStartPositionX = startPosition.x;
				startPosition.x = endPosition.x;
				endPosition.x = _virtualStartPositionX;
			}

			if (startPosition.y > endPosition.y) {
				var _virtualStartPositionY = startPosition.y;
				startPosition.y = endPosition.y;
				endPosition.y = _virtualStartPositionY;
			}

			return [startPosition, endPosition];
		},
		_calculateBoundariesOfElement: function _calculateBoundariesOfElement(element) {
			var _rect = element.getBoundingClientRect(),
				_scrollLeft = window.pageXOffset || document.documentElement.scrollLeft,
				_scrollTop = window.pageYOffset || document.documentElement.scrollTop;

			return {
				top: Number(Number(_rect.top + _scrollTop).toFixed(2)),
				left: Number(Number(_rect.left + _scrollLeft).toFixed(2)),
				width: Number(Number(_rect.width).toFixed(2)),
				height: Number(Number(_rect.height).toFixed(2))
			};
		},
		_applyDynamicHeights: function _applyDynamicHeights(updateTitle, _configuration) {
			var _this8 = this;

			try {
				if (this.ignoreDynamicValues || this.dynamicHeightList.length == 0) {
					this.parentWidget.updateTitle();
					return;
				}

				var configuration = JSON.parse(JSON.stringify(_configuration));

				var _applyConfiguration = this._loadConfigurationByWorkitem(configuration);

				if (_applyConfiguration == null) {
					this.parentWidget.updateTitle();
					return;
				}

				_applyConfiguration.values.forEach(function (element) {
					if (_this8.dynamicHeightList.includes(element.regionID)) {
						var currentSizeHolder = _this8.parentWidget.getHolderElement().querySelector("[regionID=\"".concat(element.regionID, "\"]"));

						if (currentSizeHolder != null) {
							var currentSize = currentSizeHolder.querySelector(":scope .textDisplay").offsetHeight + 5;
							var currentRows = element.end.y - element.start.y + 1;
							var needRowsTotal = Math.ceil(currentSize / _this8.pixelPerRow);
							var diffNeedCurrent = needRowsTotal - currentRows;
							element.end.y = element.start.y + needRowsTotal - 1;
							element.dynamicHeight = false;
							_applyConfiguration.config.height += diffNeedCurrent;

							_applyConfiguration.values.forEach(function (childElement) {
								if (childElement.start.y > element.start.y) {
									childElement.start.y += diffNeedCurrent;
									childElement.end.y += diffNeedCurrent;
								}
							});
						}
					}
				});

				this.parentWidget.getHolderElement().innerHTML = "";
				this.dynamicHeightList = [];

				this._allDataCollectedFromJazz(updateTitle, configuration);
			} catch (e) {
				console.error(e);
				this.parentWidget.updateTitle();
			}
		}
	});
});
