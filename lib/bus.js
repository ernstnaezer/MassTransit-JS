/**
 * MassTransit JavaScript Library
 * https://github.com/enix/MassTransit-JS
 *
 * Copyright 2011, Ernst Naezer
 * Licensed under the Apache License, Version 2.0.
 * http://www.apache.org/licenses/LICENSE-2.0 
 */

(function(exports){

	var _ 		= (typeof window === 'undefined') ? require('nimble'): window._;
	var Emitter = (typeof window === 'undefined') ? require('events').EventEmitter: window.EventEmitter;
	var Log 	= (typeof window === 'undefined') ? require('./log'): window['masstransit.Log'];
	var URI 	= (typeof window === 'undefined') ? require('./inc/uri').URI: window.URI;
	var SubscriptionClient 	= (typeof window === 'undefined') ? require('./subscriptionclient').SubscriptionClient: window['masstransit.SubscriptionClient'].SubscriptionClient;

	/**
	 *  Masstransit servicebus
	 *
	 *	You can subscribe to the following global events:
	 *
	 *		- ready				: gets triggered when the bus is ready to interact with the outside world.
	 *		- message			: gets triggered when a message is received. Contains the message as a parameter.
	 *		- connectionFailure	: gets triggered when the connection to the message broker fails. 
	 *
	 */
	function Servicebus(configuration) {
		Servicebus.prototype.__proto__ = Emitter.prototype; 
		
		var ready = false;
		var self = this;
		var subscriptionClient;
		var transport;

		var configuration = configuration;
		configuration.receiveFrom = new URI(configuration.receiveFrom);
		configuration.subscriptionService  = new URI(configuration.subscriptionService);

		var transportFactory = getTransportFactory( configuration.transport, configuration.dialect );
			
		/**
		 *  Initialize the servicebus by creating a subscription service and setting up message transports
		 */
		function init() {
		
			Log.info("initializing the servicebus")

			var subscriptionTransport = transportFactory.buildOutbound( configuration.subscriptionService, function(serviceTransport){
				Log.info("outbound connection for subscription client ready");
				
				transportFactory.buildInbound( configuration.receiveFrom, function(messageTransport){
					Log.info("message transport ready, subscribing new client");
					
					messageTransport.on('message', function(envelope){ deliver.apply(self, [envelope] ) });
					transport = messageTransport;

					// bubble-up disconnect event
					messageTransport.on('disconnect', function(){ self.emit('disconnect','messageTransport'); });
					serviceTransport.on('disconnect', function(){ self.emit('disconnect','subscription client'); });
										
					subscriptionClient = new SubscriptionClient(self, configuration, serviceTransport);
					self.once('subscriptionClientReady', function(){ self.emit('ready'); ready=true; });
					subscriptionClient.addSubscriptionClient();
				});
			});
		}

		/**
		 *  Register a new subscription on the server and setup a local callback
		 */			
		function subscribe(messageName, callback) {
			Log.info("subscribing to : " + messageName);
			subscriptionClient.addSubscription(messageName);	

			if(callback != null) 
				this.on(formatMessageUrn(messageName), callback);
		}		

		/**
		 *  Publishes a message
		 */				
		function publish(messageType, message) {
			if(!ready){
				Log.info("bus is not initialed yet, can't publish your message");
				return;
			}
			Log.info("searching for a subscription for: " + messageType);
			_.each(subscriptionClient.getSubscriptions(), function(val){
				if( formatMessageUrn(val.messageName) == messageType ){
					Log.info("found");
					transportFactory.buildOutbound( new URI(val.endpointUri), function(transport){
						transport.send({messageType:messageType, message:message});
					});
				}
			});
		}
		
		/**
		 *	Trigger an local subscription associated with the receveid message.
		 */
		function deliver(envelope) {
			Log.info("trigger event: " + envelope.messageType[0])
			this.emit(envelope.messageType[0], envelope.message);
		}
		
		/**
		 *	Converts an .net assemblyname to a MT urn format.
		 */
		function formatMessageUrn(messageName){
			var part = messageName.split(",")[0];
			var lastDot = part.lastIndexOf('.');
			part = part.substring(0, lastDot) +  ':' + part.substring(lastDot+1);
			return "urn:message:" + part;
		}
		
		/**
		 *	Load the given transport factory.
		 */
		function getTransportFactory(transportName, dialect) {
			var transportFactory = typeof masstransit === 'undefined' 
				? transportName.indexOf('/') === 0 ? require(transportName).TransportFactory : require('./transport/' + transportName).TransportFactory
				: window["masstransit." + transportName + 'TransportFactory'].TransportFactory;
			return new transportFactory(dialect);
		}
								
		/**
 		 *	public function
		 */
		this.init = init;
		this.subscribe = subscribe;
		this.publish = publish;
		this.isReady = function(){ return ready; }
	}
	
	exports.Servicebus = Servicebus;

})(typeof exports === 'undefined'? this['masstransit']={}: exports);