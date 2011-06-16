/**
 * MassTransit JavaScript Library
 * https://github.com/enix/MassTransit-JS
 *
 * Copyright 2011, Ernst Naezer
 * Licensed under the Apache License, Version 2.0.
 * http://www.apache.org/licenses/LICENSE-2.0 
 */

(function(exports){

	var _ = (typeof window === 'undefined') ? require('../nimble'): window._;
	
	var debug = function(str) { /*console.log("### ", str);*/ }
	var info = function(str) { console.log(" --- ", str); }
		
	/**
	 *  Masstransit servicebus
	 *
	 *	You can subscribe to two global events:
	 *
	 *		- ready				: gets triggered when the bus is ready to interact with the outside world.
	 *		- message			: gets triggered when a message is received. Contains the message as a parameter.
	 *		- connectionFailure	: gets triggered when the connection to the message broker fails. 
	 *
	 */
	function Servicebus(configuration) {
		EventEmitter.augment(this);
		
		var self = this;
		var subscriptionClient;
		var transport;
	
		var stompTransportFactory = new StompTransportFactory();
		var configuration = configuration;
		
		configuration.receiveFrom = new URI(configuration.receiveFrom);
		configuration.subscriptionService  = new URI(configuration.subscriptionService);
			
		/**
		 *  Initialize the servicebus by creating a subscription service and setting up message transports
		 */
		function init() {
		
			info("initializing the servicebus")

			var subscriptionTransport = stompTransportFactory.buildOutbound( configuration.subscriptionService, function(serviceTransport){
				info("outbound connection for subscription client ready");
				
				stompTransportFactory.buildInbound( configuration.receiveFrom, function(messageTransport){
					info("message transport ready, subscribing new client");
					
					messageTransport.on('message', deliver, self);
					transport = messageTransport;

					// bubble-up disconnect event
					messageTransport.on('disconnect', function(){ this.trigger('disconnect','messageTransport'); }, self);
					serviceTransport.on('disconnect', function(){ this.trigger('disconnect','subscription client'); }, self);
										
					subscriptionClient = new SubscriptionClient(self, configuration, serviceTransport);					
					subscriptionClient.once('ready', function(){ this.trigger('ready') }, self);
					subscriptionClient.addSubscriptionClient();
				});
			});
		}

		/**
		 *  Register a new subscription on the server and setup a local callback
		 */			
		function subscribe(messageName, callback) {
			info("subscribing to : " + messageName);
			subscriptionClient.addSubscription(messageName);	

			if(callback != null) 
				this.on(formatMessageUrn(messageName), callback);
		}		

		/**
		 *  Publishes a message
		 */				
		function publish(messageType, message) {
			info("searching for a subscription for: " + messageType);
			_.each(subscriptionClient.getSubscriptions(), function(val){
				if( formatMessageUrn(val.messageName) == messageType ){
					info("found");
					stompTransportFactory.buildOutbound( new URI(val.endpointUri), function(transport){
						transport.send({messageType:messageType, message:message});
					});
				}
			});
		}
		
		/**
		 *	Trigger an local subscription associated with the receveid message.
		 */
		function deliver(env) {
			info("trigger event: " + env.messageType[0])
			this.trigger(env.messageType[0], env.message);
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
 		 *	public function
		 */
		this.init = init;
		this.subscribe = subscribe;
		this.publish = publish;
	}
	
	/**
	 *	Subscription client is used for registering a client and consumers on the server
	 */
	function SubscriptionClient(serviceBus, configuration, transport){
		EventEmitter.augment(this);
		
		var configuration = configuration;
		var subscriptions = [];
		
		serviceBus.on("urn:message:MassTransit.Services.Subscriptions.Messages:SubscriptionRefresh", consumeSubscriptionRefresh, this);
		serviceBus.on("urn:message:MassTransit.Services.Subscriptions.Messages:RemoveSubscription",  consumeSubscriptionRemove, this);
		serviceBus.on("urn:message:MassTransit.Services.Subscriptions.Messages:AddSubscription", 	 consumeSubscriptionAdd, this);
	
		/**
		 *	Registers a new client in the pool
		 */
		function addSubscriptionClient(){ 

			info("registering a new client in the pool");
			
			var message = {
			    correlationId: Math.uuid().toLowerCase(),
				controlUri	 : configuration.receiveFrom.toString(),
				dataUri		 : configuration.receiveFrom.toString(),
			};
			
			transport.send({messageType:"urn:message:MassTransit.Services.Subscriptions.Messages:AddSubscriptionClient", message:message });
		}

		/**
		 *	Registers a new subscription
		 */
		function addSubscription(messageName){ 

			info("adding a message consumer for: " + messageName);
		
			var message = {
				subscription: {
					clientId: configuration.clientId,
					sequenceNumber: 1,
					messageName: messageName,
					endpointUri: configuration.receiveFrom.toString(),
					subscriptionId: Math.uuid() }};

			transport.send({ messageType:"urn:message:MassTransit.Services.Subscriptions.Messages:AddSubscription", message:message });
		}
		
		/**
		 *	Consume incomming subscription refresh messages
		 */
		function consumeSubscriptionRefresh(message){
		
			info("subscription refresh handling");
		
			_.each(message.subscriptions, function(val){
				info("subscription add: " + val.messageName + " from " + val.endpointUri);
				// check for duplicates
				if( _.filter(subscriptions, function(v){return v.subscriptionId == val.subscriptionId}).length == 0){
					subscriptions.push(val);
				}
			});
		
			this.trigger('ready');
		}

		/**
		 *	Consume incomming subscription remove messages
		 */
		function consumeSubscriptionRemove(message){
			info("subscription remove handling: " + message.subscription.messageName + " from " + message.subscription.endpointUri);
			subscriptions = _.filter(subscriptions, function(v){ return v.subscriptionId != message.subscription.subscriptionId})
		}

		/**
		 *	Consume incomming subscription add messages
		 */
		function consumeSubscriptionAdd(message){
			info("subscription add handling: " + message.subscription.messageName + " from " + message.subscription.endpointUri);
			if( _.filter(subscriptions, function(v){ return v.subscriptionId == message.subscription.subscriptionId}).length == 0)
				subscriptions.push(message.subscription);
		}
		
		/**
		 *	Gets the list of subscriptions
		 */
		function getSubscriptions(){
			return subscriptions;
		}
		
		this.addSubscription = addSubscription;
		this.addSubscriptionClient = addSubscriptionClient;
		this.getSubscriptions = getSubscriptions;
	}

	/**
	 *	Builds Stomp transport, reused client connections.
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
		
			var webSocketAddress = new URI(address.toString());
			webSocketAddress.setScheme("ws");
		
			info("building outbound connection for: " + address)
			
			// prevent crash
			if(!readyCallback) readyCallback = function(){};
		
			// check if we have a connection
			var found;
			_.filter(clientCache, function(val){
				if(val.address.getAuthority() == webSocketAddress.getAuthority() ){
					info("connection to " + webSocketAddress.getAuthority() + " found in cache");
					found = true;
					
					var transport = new StompTransport(address, val.client)
					
					readyCallback( transport, val.client);
				}
			});
			
			if(found) return;
		
			info("connection to " + webSocketAddress.getAuthority() + " not found in cache, bulding");
			
			// build a new connection
			var client = new Stomp.client(webSocketAddress);
			
			// inject event support
			EventEmitter.augment(client);

			client.debug = debug;
			client.onreceive = function(msg) { console.log("BLAP") };
			client.connect(null, null, function(){

				// store the client in out connection cache
				clientCache.push({address:webSocketAddress, client:client});
		
				var transport = new StompTransport(address, client)
		
				info("outbound connection ready: " + webSocketAddress);
				
				readyCallback(transport, client);
			
			}, function(){ client.trigger('disconnect'); });					
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
	
			info("building inbound connection for :" + address);
	
			buildOutbound(address, function(transport, client){
				
				var queue = address.getPath();
				var receiptId = Math.uuid();
				
				info("subscribing to: " + queue);
				
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
							client.trigger('message', message.body);
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
		EventEmitter.augment(this);
		
		var serializer = new Serializer();
		var address = address;
		var client	= client;
		
		client.on('message', receive, this);
				
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

	exports.Servicebus = Servicebus;

})(typeof exports === 'undefined'? this['masstransit']={}: exports);
