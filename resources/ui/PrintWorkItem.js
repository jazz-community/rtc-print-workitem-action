define([
	"dojo/_base/declare",
	"dojo/json",
	"./PrintableWorkItemDraw/PrintableWorkItemDraw",
	"./PrintableWorkItemDraw/ProcessAttachments",
	"dojo/text!./PrintWorkItem.html",
	"dojo/text!./PrintWorkItem.css",
	/*
	"com.ibm.team.rtc.foundation.web.ui.views.HoverView",
	"com.ibm.team.rtc.foundation.web.ui.views.ViewUtils",
	*/
	"com.ibm.team.workitem.web.ui2.internal.action.AbstractAction",
	"dojo/domReady!"
], function (declare, json, PrintableWorkItemDraw, ProcessAttachments, template, styleSheet) {
	//], function (declare, json, template, styleSheet) {
	// Note that all of the above imports of ibm classes will log an error to the console but the classes are still loaded.
	// Using dojo.require doesn't log an error but also doesn't require the module when using AMD syntax.
	/*
	var HoverView = com.ibm.team.rtc.foundation.web.ui.views.HoverView;
	var ViewUtils = com.ibm.team.rtc.foundation.web.ui.views.ViewUtils;
	*/

	// Extend the AbstractAction class
	return declare("com.siemens.bt.jazz.workitemeditor.rtcPrintWorkItemAction.ui.PrintWorkItem",
		com.ibm.team.workitem.web.ui2.internal.action.AbstractAction,
		{
			isInitiallyVisible: false,

			contentWidth: 300, // Pixel width of the content. Needs to match what is set with CSS.
			buttonActionNode: null,
			configuration: null,

			_printableWorkItemDraw: null,
			_printableWorkItemPrintConfig: null,

			_requestResponse: null,

			_changeDropDownEvent: null,

			/**
			 * @requires PrintableWorkItemDraw
			 * @override PrintableWorkItemDraw.webURL
			 */
			// Get the baseurl for the WorkItemDrawer
			webURL: "",

			// Call the inherited constructor
			constructor: function (params) {

				this._changeDropDownEvent = this.changeResolutionDropDownEvent.bind(this);

				// Try to get the configuration from the parameter in the action specification

				//Needs to be called as soon as possible
				this.enableIESupport();

				//Set the WebURL
				var url_string_context = net.jazz.ajax._contextRoot;
				this.webURL = url_string_context && url_string_context.length > 0 ? url_string_context : "https://localhost:7443/jazz/";

				this._printableWorkItemDraw = new PrintableWorkItemDraw(this);

				try {
					if (params && params.actionSpec && params.actionSpec.parameter) {
						// Parse the configuration as JSON
						this.configuration = json.parse(params.actionSpec.parameter);
					}
				} catch (error) {
					console.warn("PrintWorkItem Error getting the configuration from the action specification. Message: " + error);

					// Reset the configuration if parsing fails
					this.configuration = null;
				}

				this.inherited(arguments);
			},

			/**
			 * Polyfill for everything that IE and EDGE does not support natively, in order for the
			 * PrintableWorkItemDraw to work.
		 	*/
			enableIESupport: function () {

				// Allow Foreach for NodeLists
				if (window.NodeList && !NodeList.prototype.forEach) {
					NodeList.prototype.forEach = Array.prototype.forEach;
				}

				// Production steps of ECMA-262, Edition 6, 22.1.2.1
				if (!Array.from) {
					Array.from = (function () {
						var toStr = Object.prototype.toString;
						var isCallable = function (fn) {
							return typeof fn === 'function' || toStr.call(fn) === '[object Function]';
						};
						var toInteger = function (value) {
							var number = Number(value);
							if (isNaN(number)) { return 0; }
							if (number === 0 || !isFinite(number)) { return number; }
							return (number > 0 ? 1 : -1) * Math.floor(Math.abs(number));
						};
						var maxSafeInteger = Math.pow(2, 53) - 1;
						var toLength = function (value) {
							var len = toInteger(value);
							return Math.min(Math.max(len, 0), maxSafeInteger);
						};

						// The length property of the from method is 1.
						return function from(arrayLike/*, mapFn, thisArg */) {
							// 1. Let C be the this value.
							var C = this;

							// 2. Let items be ToObject(arrayLike).
							var items = Object(arrayLike);

							// 3. ReturnIfAbrupt(items).
							if (arrayLike == null) {
								throw new TypeError('Array.from requires an array-like object - not null or undefined');
							}

							// 4. If mapfn is undefined, then let mapping be false.
							var mapFn = arguments.length > 1 ? arguments[1] : void undefined;
							var T;
							if (typeof mapFn !== 'undefined') {
								// 5. else
								// 5. a If IsCallable(mapfn) is false, throw a TypeError exception.
								if (!isCallable(mapFn)) {
									throw new TypeError('Array.from: when provided, the second argument must be a function');
								}

								// 5. b. If thisArg was supplied, let T be thisArg; else let T be undefined.
								if (arguments.length > 2) {
									T = arguments[2];
								}
							}

							// 10. Let lenValue be Get(items, "length").
							// 11. Let len be ToLength(lenValue).
							var len = toLength(items.length);

							// 13. If IsConstructor(C) is true, then
							// 13. a. Let A be the result of calling the [[Construct]] internal method
							// of C with an argument list containing the single item len.
							// 14. a. Else, Let A be ArrayCreate(len).
							var A = isCallable(C) ? Object(new C(len)) : new Array(len);

							// 16. Let k be 0.
							var k = 0;
							// 17. Repeat, while k < len… (also steps a - h)
							var kValue;
							while (k < len) {
								kValue = items[k];
								if (mapFn) {
									A[k] = typeof T === 'undefined' ? mapFn(kValue, k) : mapFn.call(T, kValue, k);
								} else {
									A[k] = kValue;
								}
								k += 1;
							}
							// 18. Let putStatus be Put(A, "length", len, true).
							A.length = len;
							// 20. Return A.
							return A;
						};
					}());
				}

				// Allow to user :Scope in the Selection by Query
				try {
					// test for scope support
					document.querySelector(':scope *');
				} catch (error) {
					(function (ElementPrototype) {
						// scope regex
						var scope = /:scope(?![\w-])/gi;
						// polyfill Element#querySelector
						var querySelectorWithScope = polyfill(ElementPrototype.querySelector);

						ElementPrototype.querySelector = function querySelector(selectors) {
							return querySelectorWithScope.apply(this, arguments);
						};

						// polyfill Element#querySelectorAll
						var querySelectorAllWithScope = polyfill(ElementPrototype.querySelectorAll);

						ElementPrototype.querySelectorAll = function querySelectorAll(selectors) {
							return querySelectorAllWithScope.apply(this, arguments);
						};

						// polyfill Element#matches
						if (ElementPrototype.matches) {
							var matchesWithScope = polyfill(ElementPrototype.matches);

							ElementPrototype.matches = function matches(selectors) {
								return matchesWithScope.apply(this, arguments);
							};

						}

						// polyfill Element#closest
						if (ElementPrototype.closest) {
							var closestWithScope = polyfill(ElementPrototype.closest);

							ElementPrototype.closest = function closest(selectors) {
								return closestWithScope.apply(this, arguments);
							};

						}

						function polyfill(qsa) {

							return function (selectors) {
								// whether the selectors contain :scope
								var hasScope = selectors && scope.test(selectors);

								if (hasScope) {
									// fallback attribute
									var attr = 'q' + Math.floor(Math.random() * 9000000) + 1000000;

									// replace :scope with the fallback attribute
									arguments[0] = selectors.replace(scope, '[' + attr + ']');

									// add the fallback attribute
									this.setAttribute(attr, '');

									// results of the qsa
									var elementOrNodeList = qsa.apply(this, arguments);

									// remove the fallback attribute
									this.removeAttribute(attr);

									// return the results of the qsa
									return elementOrNodeList;

								} else {
									// return the results of the qsa
									return qsa.apply(this, arguments);
								}
							};
						}
					})(Element.prototype);
				}

				// Allow to create the "template" tag
				(function () {
					var support = ("content" in document.createElement("template"));

					// Set the content property if missing
					if (!support) {
						var
							/**
							 * Prefer an array to a NodeList
							 * Otherwise, updating the content property of a node
							 * will update the NodeList and we'll loose the nested <template>
							 */
							templates = Array.prototype.slice.call(document.getElementsByTagName("template")),
							template, content, fragment, node, i = 0, j;

						// For each <template> element get its content and wrap it in a document fragment
						while ((template = templates[i++])) {
							content = template.children;
							fragment = document.createDocumentFragment();

							for (j = 0; node = content[j]; j++) {
								fragment.appendChild(node);
							}

							template.content = fragment;
						}
					}

					// Prepare a clone function to allow nested <template> elements
					function clone() {
						var
							templates = this.querySelectorAll("template"),
							fragments = [],
							template,
							i = 0;

						// If the support is OK simply clone and return
						if (support) {
							template = this.cloneNode(true);
							templates = template.content.querySelectorAll("template");

							// Set the clone method for each nested <template> element
							for (; templates[i]; i++) {
								templates[i].clone = clone;
							}

							return template;
						}

						// Loop through nested <template> to retrieve the content property
						for (; templates[i]; i++) {
							fragments.push(templates[i].content);
						}

						// Now, clone the document fragment
						template = this.cloneNode(true);

						// Makes sure the clone have a "content" and "clone" properties
						template.content = this.content;
						template.clone = clone;

						/**
						 * Retrieve the nested <template> once again
						 * Since we just cloned the document fragment,
						 * the content's property of the nested <template> might be undefined
						 * We have to re-set it using the fragment array we previously got
						 */
						templates = template.querySelectorAll("template");

						// Loop to set the content property of each nested template
						for (i = 0; templates[i]; i++) {
							templates[i].content = fragments[i];
							templates[i].clone = clone; // Makes sure to set the clone method as well
						}

						return template;
					}

					var
						templates = document.querySelectorAll("template"),
						template, i = 0;

					// Pollute the DOM with a "clone" method on each <template> element
					while ((template = templates[i++])) {
						template.clone = clone;
					}
				}());

			},

			// Run the initializer function to set the visible and enabled states
			initialize: function (initializer) {

				var devMode = false;
				window.location.hash.split("&").forEach(function (hashElement) {
					if (hashElement === "dev=true") {
						devMode = true;
					}
				});

				var _this = this;

				new ProcessAttachments().getAttachmentConfigurationByType(
					this.webURL,
					this.workingCopy.storedObject.attributes.projectArea.id,
					this.workingCopy.storedObject.attributes.workItemType.label.toLowerCase(),
					function (requestResponse) {
						_this._requestResponse = requestResponse;
						if (requestResponse.successful || devMode) {
							initializer();
						}
					},
					devMode
				);

				// Check if Modal already exists
				//if (document.body.querySelector(":scope > .printWorkItemModal") !== null) {
				if (this.getModalElement() !== null) {
					return;
				}

				//Create the modal

				var templateHolder = document.createElement("div");
				templateHolder.innerHTML = template;

				// Add "id" to difference the Modals
				templateHolder.querySelector(".printWorkItemModal").setAttribute("wi", this.workingCopy.idLabel);

				// Close span of the Modal
				templateHolder.querySelector(".printWorkItemClose").addEventListener("click", function (evt) {
					this.closeModal();
				}.bind(this));

				// Close button
				templateHolder.querySelector(".secondary-button").addEventListener("click", function (evt) {
					this.closeModal();
				}.bind(this));

				// Print button
				templateHolder.querySelector(".primary-button").addEventListener("click", function (evt) {
					try {

						var regex = /\<script .*\>(.*)\<\/script\>/gm;

						var printWindow = window.open("", "");

						printWindow.document.write(document.getElementsByTagName("head")[0].outerHTML.replace(regex, ""));
						printWindow.document.write(printWindow.document.getElementsByTagName("head")[0].innerHTML += "<style>" + styleSheet + "</style>");
						printWindow.document.write("<body></body>");

						printWindow.document.close();

						var copyNode = this.getModalElement().querySelector(":scope > .printWorkItemModal-content > .modal-body").children[0].cloneNode(true);

						if (copyNode == null) {
							console.warn("Can't find any Node to be copied");
							this.closeModal();
							return;
						}

						printWindow.document.getElementsByTagName("body")[0].appendChild(
							copyNode
						);

						printWindow.document.title = "Printable Workitem Print";
						printWindow.focus();

						if (!evt.altKey) {
							setTimeout(function () {
								printWindow.print();
								printWindow.close();
							}, 100);
						}

					} catch (e) {
						printWindow.close();
						console.warn("Error occurred while trying to print. Error: " + e);
						window.alert("Error occurred while trying to print");
					}

				}.bind(this));

				document.body.appendChild(templateHolder.firstChild);

			},

			closeModal: function () {
				this.getModalElement().style.display = "none";
				this.clearModalContent();
				this.getModalElement().querySelector(".print-wi-dropdown").removeEventListener("change", this._changeDropDownEvent);
			},

			clearModalContent: function () {
				this.getHolderElement().innerHTML = "";
			},

			changeResolutionDropDownEvent: function (evt) {
				try {
					this._printableWorkItemPrintConfig = JSON.parse(evt.target.value);
				} catch (exception) {
					this._printableWorkItemPrintConfig = null;
				}
				this.drawConfiguration();
			},

			getModalElement: function () {
				return document.body.querySelector(":scope > .printWorkItemModal[wi='" + this.workingCopy.idLabel + "']");
			},

			/**
			 * @override PrintableWorkItemDraw.getHolderElement
			 */
			getHolderElement: function () {
				return this.getModalElement().querySelector(":scope > .printWorkItemModal-content > .modal-body");
			},

			/**
			 * @override PrintableWorkItemDraw.showErrorMessage
			 */
			showErrorMessage: function (message) {
				window.alert("Message: " + message);
			},

			/**
			 * @override PrintableWorkItemDraw._updateTitle
			 */
			_updateTitle: function () { },

			// Override the _doRun function to get access to the event object
			_doRun: function (clickEvent) {
				// Get the button node from the event object
				this.buttonActionNode = clickEvent.currentTarget;

				// Call the inherited function (calls the run function)
				this.inherited(arguments);
			},

			// Called when the enabled button was clicked
			run: function (params) {
				this.drawConfiguration();
				this.getModalElement().querySelector(".print-wi-dropdown").addEventListener("change", this._changeDropDownEvent);
				return;
			},

			drawConfiguration: function () {

				if (
					this._requestResponse == null
					||
					!this._requestResponse.done
				) {
					console.info("Waiting for the request to be finished");
					window.alert("Some data is still loading. Please wait for a bit and retry");
					return;
				}

				var modalElement = this.getModalElement();

				if (modalElement == null) {
					console.warn("Can't find the modal");
					window.alert("Something is wrong with the Modal. Please reload the page and try again");
					return;
				}

				this.clearModalContent();

				this.getModalElement().querySelector(".print-wi-dropdown").value = (this._printableWorkItemPrintConfig ? JSON.stringify(this._printableWorkItemPrintConfig) : "");

				if (this._requestResponse.successful) {

					this._printableWorkItemDraw.drawTableFromConfiguration(
						this.workingCopy.idLabel,
						this._requestResponse.body,
						true,
						false,
						true,
						this._printableWorkItemPrintConfig
					);

				} else {
					console.error("Request-Error: " + this._requestResponse.message);
					this.getHolderElement().innerHTML = "<center style='font-size: 200%;'> Error-Message: " + this._requestResponse.message + "</center>";
				}

				modalElement.style.display = "block";

			},

			// Hide the action for new work items
			isVisible: function (params) {
				return !this.workingCopy.isNew();
			},

			// Disable the action when there are changes
			isEnabled: function (params) {
				return !this.workingCopy.isChanged();
			},

		});
});
