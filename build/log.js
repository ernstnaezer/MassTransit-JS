/**
 * MassTransit JavaScript Library
 * https://github.com/enix/MassTransit-JS
 *
 * Copyright 2011, Ernst Naezer
 * Licensed under the Apache License, Version 2.0.
 * http://www.apache.org/licenses/LICENSE-2.0 
 */

(function(exports){

	/**
	 *	Info level
	 */
	function info(str){
		console.log("---", str);
	}
	
	/**
	 *	Debug level
	 */
	function debug(str){
		//console.log(">>>", str);
	}
	
	exports.debug = debug;
	exports.info = info;

})(typeof exports === 'undefined'? this['masstransit.Log']={}: exports);