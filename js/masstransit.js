/**
 * MassTransit JavaScript Library
 * https://github.com/enix/MassTransit-JS
 *
 * Copyright 2011, Ernst Naezer
 * Licensed under the Apache License, Version 2.0.
 * http://www.apache.org/licenses/LICENSE-2.0 
 */

(function(exports){

	var debug = function(str) { /*console.log("----------------\n" + str + "\n------------------");*/ }
	var info = function(str) { console.log(" >>> " + str); }
		
	/**
	 *  Masstransit servicebus
	 */
	function Servicebus() {
	
		var subscriptionService = new SubscriptionService();
		var transport = new StompTransport();
		var configuration;

		EventEmitter.augment(transport);
		
		/**
		 *  Initialize the servicebus by creating a subscription service and setting up message transports
		 */
		function init(config) {
		
			info("initializing the servicebus")
		
			configuration = config;
			configuration.clientId =  Math.uuid().toLowerCase() ;
	
			subscriptionService.on('ready', initializeTransport, this);
			subscriptionService.init(config);
		}

		/**
		 *  Initialize message transport
		 */		
		function initializeTransport(){
		
			info("initializing message transport")
			
			transport.on('ready', function () {
				info("message transport ready, triggering servicebus ready event")
				this.trigger('ready'); 
			}, this);
			transport.on('message', deliver, this);		
			transport.init(configuration.receiveFrom);
		}

		/**
		 *  Register a new subscription on the server and setup a local callback
		 */			
		function subscribe(messageName, callback) {
			subscriptionService.addSubscription(messageName);			
			this.on(formatMessageUrn(messageName), callback);
		}		
		
		/*
		function publish(messageType, message) { with(this){
			transport.publish({messageType:messageType, message:message});
		}}
		*/

		/**
		 *	Register a callback to be executed when the servicebus has been setup
		 */
		function ready(callback) {
			this.on('ready', callback);
		}

		/**
		 *	Trigger an local subscription associated with the receveid message.
		 */
		function deliver(env) {
			info("message received:" + env.messageType[0])
			this.trigger(env.messageType[0], env.message);
		}
		
		/**
		 *	Converts an .net assemblyname to a MT urn format.
		 */
		function formatMessageUrn(messageName){
			var parts = messageName.split(",");
			return "urn:message:" + parts[0].replace(".",":");
		}
				
		EventEmitter.augment(Servicebus.prototype);
				
		/**
 		 *	public function
		 */
		this.init = init;
		this.subscribe = subscribe;
		//this.publish = publish;
		this.ready = ready;
	}	
	
	/**
	 *	Subscription service is used for registering a client and consumers on the server
	 */
	function SubscriptionService(){
	
		var transport = new StompTransport();
		var configuration;

		EventEmitter.augment(transport);
		
		/**
		 *	Initialized the subsciption service by registering a new client.
		 */
		function init(config){
			info("initializing subscription service")
		
			configuration = config;
		
			transport.on('ready', addSubscriptionClient, this);
			transport.on('message', messageReceived, this);	
			transport.init(configuration.subscriptionService);
		}

		function messageReceived(env){
			if( (env.message.clientId == configuration.clientId && env.messageType[0].match("SubscriptionClientAdded$"))){
				info("subscription service ready")
				this.trigger("ready");
			}		
		}
		
		/**
		 *	Registers a new client
		 */
		function addSubscriptionClient(){ 

			info("adding a subscription client");
		
			var messageType = [
				"urn:message:MassTransit.Services.Subscriptions.Messages:AddSubscriptionClient",
				"urn:message:MassTransit.Services.Subscriptions.Messages:SubscriptionClientMessageBase"
			];
	
			var message = {
			    correlationId: configuration.clientId,
				controlUri	 : configuration.receiveFrom,
				dataUri		 : configuration.receiveFrom,
			};

			transport.publish({ messageType:messageType, message:message });
		}

		/**
		 *	Registers a new subscription
		 */
		function addSubscription(messageName){ 

			info("adding a message consumer for: " + messageName);
		
			var messageType = [
				"urn:message:MassTransit.Services.Subscriptions.Messages:AddSubscription",
				"urn:message:MassTransit.Services.Subscriptions.Messages:SubscriptionChange"
			];
			
			var message = {
				subscription: {
					clientId: configuration.clientId,
					sequenceNumber: 1,
					messageName: messageName,
					endpointUri: configuration.receiveFrom,
					subscriptionId: Math.uuid() }};

			transport.publish({ messageType:messageType, message:message });
		}

		EventEmitter.augment(SubscriptionService.prototype);
		
		this.init = init;	
		this.addSubscription = addSubscription;
	}

		/**
	 *	Stomp transport communicates with a stomp broker message queue.
	 */
	function StompTransport() {
	
		var serializer = new Serializer();
		var address;
		var queue;
		var host;
		var client;
	
		/**
		 *	Initialize a new Stomp transport channel.
		 *   The given endpoint should match: stomp://[server]:[port]/queue
		 */
		function init(endpoint) { 
		
			// unpack the endpoint data
			address = new URI(endpoint);
			queue = address.getPath();
			host = new URI(endpoint);
			host.setScheme("ws");
				
			client = new Stomp.client(host);
			client.debug = debug;

			var self = this;

			// connect to the broker
			client.connect(null, null, function (frame) {
				info("connected to Stomp server: " + host);

				var receiptId = Math.uuid();
				
				// when we receive a receipt for the requested subscription, we are ready to go
				client.onreceipt = function (message) {
					if (message.headers['receipt-id'] == "subscription-" + receiptId) {
						debug("subscription receipt received, we are ready to go");
						self.trigger('ready');
					}
				}

				info("subscribing to: " + queue);
				// subscribe to the request queue
				client.subscribe(queue, function (message) {
					debug("STOMP message received");

					switch (message.command) {
						// message dispatcher
						case "MESSAGE":
							debug("message body = " + message.body)
							self.trigger('message', serializer.deserialize(message.body) );
							break;
					}
				}, { 'receipt': 'subscription-' + receiptId });
			});
		}
		
		/**
		 *	Publishes the given message to the configured message queue
		 */
		function publish(msg){
			info("publish to: " + queue);
			client.send( queue, {}, serializer.serialize(msg) );
		}
		
		/**
 		 *	public function
		 */
		
		this.init = init;
		this.publish = publish;
	}

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
	exports.StompTransport = StompTransport;
	exports.SubscriptionService = SubscriptionService;
	exports.Servicebus = Servicebus;

})(typeof exports === 'undefined'? this['masstransit']={}: exports);
