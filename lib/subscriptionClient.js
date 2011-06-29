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
	var Log 	= (typeof window === 'undefined') ? require('./log'): window['masstransit.Log'];
	
	/**
	 *	Subscription client is used for registering a client and consumers on the server
	 */
	function SubscriptionClient(serviceBus, configuration, transport){
		
		var configuration = configuration;
		var subscriptions = [];
		var self = this;
		
		serviceBus.on("urn:message:MassTransit.Services.Subscriptions.Messages:SubscriptionRefresh", consumeSubscriptionRefresh);
		serviceBus.on("urn:message:MassTransit.Services.Subscriptions.Messages:RemoveSubscription",  consumeSubscriptionRemove);
		serviceBus.on("urn:message:MassTransit.Services.Subscriptions.Messages:AddSubscription", 	 consumeSubscriptionAdd);
	
		/**
		 *	Registers a new client in the pool
		 */
		function addSubscriptionClient(){ 

			Log.info("registering a new client in the pool");
			
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

			Log.info("adding a message consumer for: " + messageName);
		
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
		
			Log.info("subscription refresh handling");
		
			_.each(message.subscriptions, function(val){
				Log.info("subscription add: " + val.messageName + " from " + val.endpointUri);
				// check for duplicates
				if( _.filter(subscriptions, function(v){return v.subscriptionId == val.subscriptionId}).length == 0){
					subscriptions.push(val);
				}
			});
		
			this.emit('subscriptionClientReady');
		}

		/**
		 *	Consume incomming subscription remove messages
		 */
		function consumeSubscriptionRemove(message){
			Log.info("subscription remove handling: " + message.subscription.messageName + " from " + message.subscription.endpointUri);
			subscriptions = _.filter(subscriptions, function(v){ return v.subscriptionId != message.subscription.subscriptionId})
		}

		/**
		 *	Consume incomming subscription add messages
		 */
		function consumeSubscriptionAdd(message){
			Log.info("subscription add handling: " + message.subscription.messageName + " from " + message.subscription.endpointUri);
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

	exports.SubscriptionClient = SubscriptionClient;

})(typeof exports === 'undefined'? this['masstransit.SubscriptionClient']={}: exports);