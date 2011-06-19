/**
 * Javascript client for communicating with MassTransit via STOMP
 *
 * https://github.com/enix/MassTransitClient
 * 
 * Licensed under the Apache 2 license:
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 */

var MassTransit = {}
MassTransit._construct = function(){

	var debug = function(str) { /*console.log(str);*/ }
	var info = function(str) { console.log(" >>> " + str); }

	/**
	 *  Masstransit servicebus client version
	 */
	function ServiceBus() {
	
		var localBus = new MicroEvent();
		var subscriptionService = new SubsriptionService();
		var transport = new StompTransport();

		/**
		 *  Initialize the servicebus by creating a subscription service and setting up message transports
		 */
		function init(config) {
		
			info("initializing the servicebus")
		
			this.config = config;
			this.config.clientId =  Math.uuid().toLowerCase() ;

			var self = this;
		
			subscriptionService.bind("ready", function(){ initializeTransport.apply(self) });
			subscriptionService.init(config);
		}

		/**
		 *  Initialize message transport
		 */		
		function initializeTransport(){
		
			info("initializing message transport")
			
			transport.bind('ready', function () { 
				info("message transport ready")
				localBus.trigger('ready'); 
			});
			transport.bind('message', function (msg) { deliver(msg); });		
			transport.init(this.config.receiveFrom);
		}

		/**
		 *  Register a new subscription on the server and setup a local callback
		 */			
		function subscribe(messageName, callback) { with(this){
			info("setting up a subscription for: " + formatMessageUrn(messageName));
			subscriptionService.addSubscription(messageName);
				
			localBus.bind(formatMessageUrn(messageName), callback);
		}}		
		
		/*
		function publish(messageType, message) { with(this){
			transport.publish({messageType:messageType, message:message});
		}}
		*/

		/**
		 *	Register a callback to be executed when the servicebus has been setup
		 */
		function ready(callback) {
			localBus.bind('ready', callback);
		}

		/**
		 *	Trigger an local subscription associated with the receveid message.
		 */
		function deliver(env) {
			info("message received:" + env.messageType[0])
			localBus.trigger(env.messageType[0], env.message);
		}
		
		/**
		 *	Converts an .net assemblyname to a MT urn format.
		 */
		function formatMessageUrn(messageName){
			var parts = messageName.split(",");
			return "urn:message:" + parts[0].replace(".",":");
		}
		
		MicroEvent.mixin(ServiceBus);
		
		/**
 		 *	public function
		 */
		this.init = init;
		this.subscribe = subscribe;
		//this.publish = publish;
		this.ready = ready;
	}
	
	/**
	 *	Subscription service client is used for registering a client and it's interests on the server
	 */
	function SubsriptionService(){
	
		/**
		 *	Initialized the subsciption service by registering a new client.
		 */
		function init(config){
		
			info("initializing subscription service")
		
			this.config = config;
		
			var self = this;
		
			this.transport = new StompTransport();
			this.transport.bind('ready', function () { 
				addSubscriptionClient.apply(self);
			});
			
			var msgReceived = function (env) {
				if( (env.message.clientId == self.config.clientId && env.messageType[0].match("SubscriptionClientAdded$"))){
					info("subscription service ready")
					self.trigger("ready");
				}
			}
			
			this.transport.bind('message', msgReceived);	
			this.transport.init(this.config.subscriptionService);
		}

		/**
		 *	Registers a new client
		 */
		function addSubscriptionClient(){ with(this) {

			var messageType = [
				"urn:message:MassTransit.Services.Subscriptions.Messages:AddSubscriptionClient",
				"urn:message:MassTransit.Services.Subscriptions.Messages:SubscriptionClientMessageBase"
			];
	
			var message = {
			    correlationId: config.clientId,
				controlUri	 : config.receiveFrom,
				dataUri		 : config.receiveFrom,
			};
			
			transport.publish({ messageType:messageType, message:message });
		}}

		/**
		 *	Registers a new subscription
		 */
		function addSubscription(messageName){ with(this){

			var messageType = [
				"urn:message:MassTransit.Services.Subscriptions.Messages:AddSubscription",
				"urn:message:MassTransit.Services.Subscriptions.Messages:SubscriptionChange"
			];
			
			var message = {
				subscription: {
					clientId: config.clientId,
					sequenceNumber: 1,
					messageName: messageName,
					endpointUri: config.receiveFrom,
					subscriptionId: Math.uuid() }};

			transport.publish({ messageType:messageType, message:message });
		}}

		MicroEvent.mixin(SubsriptionService);
		
		this.init = init;	
		this.addSubscription = addSubscription;
	}
	
	/**
	 *	Stomp transport communicates with a stomp broker message queue.
	 */
	function StompTransport() {
	
		/**
		 *	Initialize a new Stomp transport channel.
		 *   The given endpoint should match: stomp://[server]:[port]/queue
		 */
		function init(endpoint) { 
		
			// unpack the endpoint data
			this.address = new URI(endpoint);
			this.queue = this.address.getPath();
			this.websocketAddress = new URI(endpoint);
			this.websocketAddress.setScheme("ws");
					
			this.client = Stomp.client(this.websocketAddress);
			//this.client.debug = function (str) { console.log(str); };

			var self = this;

			// connect to the broker
			this.client.connect(null, null, function (frame) {
				info("connected to Stomp server: " + self.websocketAddress);
				info("subscribing to: " + self.queue);

				var receiptId = Math.uuid();
				
				// when we receive a receipt for the requested subscription, we are ready to go
				self.client.onreceipt = function (message) {
					if (message.headers['receipt-id'] == "subscription-" + receiptId) {
						debug("subscription receipt received, we are ready to go");
						self.trigger('ready');
					}
				}

				// subscribe to the request queue
				self.client.subscribe(self.queue, function (message) {
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
		function publish(msg){with(this){
			this.client.send( this.queue, {}, serializer.serialize(msg) );
		}}
		
		MicroEvent.mixin(StompTransport);
		
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
	
	var serializer = new Serializer();

	/**
	 *	public function
	 */
	this.ServiceBus = ServiceBus;
}
 
MassTransit._construct();