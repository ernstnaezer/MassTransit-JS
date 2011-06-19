/**
 * MassTransit JavaScript Library
 * https://github.com/enix/MassTransit-JS
 *
 * Copyright 2011, Ernst Naezer
 * Licensed under the Apache License, Version 2.0.
 * http://www.apache.org/licenses/LICENSE-2.0 
 */

(function(exports){

	var _ 			= (typeof window === 'undefined') ? require('nimble'): window._;
	var Emitter 	= (typeof window === 'undefined') ? require('events').EventEmitter: window.EventEmitter;

	var Math 		= (typeof window === 'undefined') ? require('../inc/Math.uuid'): window.masstransit.Log;
	var URI 		= (typeof window === 'undefined') ? require('../inc/uri').URI: window.URI;
	var Stomp 		= (typeof window === 'undefined') ? require('../inc/stompclient').Stomp: window.stompClient.Stomp;
	var Serializer 	= (typeof window === 'undefined') ? require('../serializer').Serializer: window.masstransit.Serializer;
	var Log 		= (typeof window === 'undefined') ? require('../log'): window.masstransit.Log;

	/**
	 *	Builds Stomp transport, reuses client connections.
	 */
	function StompTransportFactory(){

		var clientCache = [];
		var self = this;

		/**
		 *	Builds a connection for sending messages
		 *
		 * 	params: 
		 *		Uri 	 address
		 *		Function callback to be triggered when the client connected
		 */
		function buildOutbound(address, readyCallback){
		
			address.setScheme("ws");
			var adrStr =  "ws://" + address.getAuthority()  + "/stomp";
			
			Log.info("building outbound connection to: " + adrStr)
			
			// prevent crash
			if(!readyCallback) readyCallback = function(){};
		
			// check if we have a connection
			var found;
			_.filter(clientCache, function(val){
				if(val.address.getAuthority() == address.getAuthority() ){
					Log.info("connection to ws://" + address.getAuthority() + " found in cache");
					found = true;
					
					var transport = new StompTransport(address, val.client)
					
					readyCallback( transport, val.client);
				}
			});
			
			if(found) return;
		
			Log.info("connection to " + adrStr + " not found in cache, bulding");
			
			var client = new Stomp.client(adrStr);
			client.debug = Log.debug;
			
			var transport = new StompTransport(address, client)

			client.connect(null, null, function(){
				Log.info("outbound connection ready: " + address);

				// store the client in out connection cache
				clientCache.push({address:address, client:client});
				readyCallback(transport, client);
			
			}, function(){ Log.info("error building connection to: " + adrStr); transport.emit('disconnect'); });		
		
		}
		
		/**
		 *	Build a connection for receiving messages
		 *
		 * 	params: 
		 *		Uri 	 address
		 *		Function callback to be triggered when the client subscribed
		 */	
		function buildInbound(address, readyCallback){

			if(!readyCallback) readyCallback = function(){};
	
			Log.info("building inbound connection for :" + address);
	
			buildOutbound(address, function(transport, client){
				
				var queue = address.getPath();
				var receiptId = Math.uuid();
				
				Log.info("subscribing to: " + queue);
				
				// when we receive a receipt for the requested subscription, we are ready to go
				client.onreceipt = function (message) {
					if (message.headers['receipt-id'] == "subscription-" + receiptId) {
						readyCallback(transport);
					}
				}
				
				// subscribe to the queue
				client.subscribe(queue, function (message) {
					switch (message.command) {
						// message dispatcher
						case "MESSAGE":
							transport.emit('internalMessage', message.body);
							break;
					}
				}, { 'receipt': 'subscription-' + receiptId });
			});

		}
		this.buildOutbound = buildOutbound;
		this.buildInbound  = buildInbound;
	}
	
	/**
	 *	Stomp transport communicates with a stomp broker message queue.
	 *
	 *	params:
	 *		Uri			address
	 *		StompClient	a connected STOMP client
	 *
	 */
	function StompTransport(address, client) {
		StompTransport.prototype.__proto__ = Emitter.prototype; 
		
		var serializer = new Serializer();
		var address = address;
		var client	= client;
		
		this.on('internalMessage', receive, this);
				
		/**
		 *	Delivers the received message to anyone who is listening
		 */
		function receive(content){			
			var message = serializer.deserialize(content)

			// since we are sharing connections, we need to check that the received message is actualy for this transport
			if( message.destinationAddress == address.toString()) this.trigger('message', message );
		}
		
		/**
		 *	Sends the given message to the configured message queue
		 */
		function send(msg){
			client.send( address.getPath(), {}, serializer.serialize(msg) );
		}
		
		/**
 		 *	public function
		 */
		this.send = send;
	}

	exports.TransportFactory = new StompTransportFactory();

})(typeof exports === 'undefined'? this['masstransit']={}: exports);