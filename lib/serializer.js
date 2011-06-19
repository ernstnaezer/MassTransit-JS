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
	*	JSON serializer, responsible for converting objects to strings and vice versa
	*/
	function Serializer () {
	
		/**
		 *  serialize the given instance
		 */
		function serialize(instance) {
			return JSON.stringify(instance);
		}

		/**
		 *  deserialize the given string
		 */
		function deserialize(data) {
			return JSON.parse(data);
		}
		
		this.serialize = serialize;
		this.deserialize = deserialize;
	}

	exports.Serializer = Serializer;

})(typeof exports === 'undefined'? this['masstransit']={}: exports);
