define([
	'dojo/_base/declare',
], function (declare) {

	return declare(null, {

		done: false,
		successful: false,
		body: null,
		message: "",

		constructor: function (_successful, _body, _message) {
			this.successful = _successful;
			this.body = _body;
			this.message = _message;
			this.done = true;
		},

	});

});
