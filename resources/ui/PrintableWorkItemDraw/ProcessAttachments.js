define([
	'dojo/_base/declare',
	'./../../classes/RequestResponse'
], function (declare, RequestResponse) {

	return declare(null, {

		baseProcessAttachmentUrl: '/service/com.ibm.team.workitem.common.internal.model.IImageContentService/processattachment/',

		/**
		 * Get the configuration based off the workItemType
		 * 
		 * @param {String} rootURL The base URL which gets used
		 * @param {String} projectAreaID The ID of the projectArea, where the attachment should get loaded from
		 * @param {String} workItemType The Type of the current work item
		 * @param {Function} _callback Gets called, after all the request have finished
		 * @param {Boolean} devMode Should the Dev-Mode be used or not
		 * @default devMode: false
		 * _callback(RequestResponse response)
		 */
		getAttachmentConfigurationByType: function (rootURL, projectAreaID, workItemType, _callback) {

			var devMode = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;

			var _this = this;

			var def_request = new XMLHttpRequest();
			def_request.open(
				"GET",
				rootURL + _this.baseProcessAttachmentUrl + projectAreaID + "/printable_wi_print_definition.json",
				true
			);
			def_request.responseType = "json";

			def_request.onreadystatechange = function () {
				if (def_request.readyState === 4) {
					if (def_request.status === 200) {
						if (def_request.response != null) {

							if (def_request.response.syntax != undefined && def_request.response.list != undefined) {

								if (def_request.response.list[workItemType] !== undefined) {
									var typeConfigFileName = def_request.response.syntax.replace(/\{\{type\}\}/gm, def_request.response.list[workItemType]);

									var conf_request = new XMLHttpRequest();
									conf_request.open(
										"GET",
										rootURL + _this.baseProcessAttachmentUrl + projectAreaID + "/" + typeConfigFileName,
										true
									);
									conf_request.responseType = "json";

									conf_request.onreadystatechange = function () {
										if (conf_request.readyState === 4) {
											if (conf_request.status === 200) {
												if (conf_request.response != null) {
													_callback(new RequestResponse(true, conf_request.response, "success"));
												} else {
													_callback(new RequestResponse(false, null, "Type configuration can't be loaded as JSON" + (devMode ? " ('" + typeConfigFileName + "')" : "")));
												}
											} else {
												_callback(new RequestResponse(false, null, "Can't find the type configuration file at the given path" + (devMode ? " ('" + typeConfigFileName + "')" : "")));
											}
										}
									};

									conf_request.send();

								} else {
									_callback(new RequestResponse(false, null, "No value for this Type can be found in the configuration" + (devMode ? (" (Type = '" + workItemType + "')") : "")));
								}

							} else {
								_callback(new RequestResponse(false, null, "Definition JSON is missing configuration values" + (devMode ? " (Can't find value 'syntax' and/or 'list' in 'printable_wi_print_definition.json')" : "")));
							}

						} else {
							_callback(new RequestResponse(false, null, "Definition Configuration isn't in the JSON format" + (devMode ? " ('printable_wi_print_definition.json')" : "")));
						}
					} else {
						_callback(new RequestResponse(false, null, "Can't find the Definition Configuration" + (devMode ? " ('printable_wi_print_definition.json')" : "")));
					}
				}
			};

			def_request.send();
		}

	});

});
