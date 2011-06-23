var ServiceBus = require("../../index").Servicebus;

var serviceBus = new ServiceBus({
	receiveFrom : "stomp://nawa:61614/queue/nodejs",
	subscriptionService: "stomp://nawa:61614/queue/mt_subscriptions",
	transport :'stomp'
});

serviceBus.on('ready', function(){
	console.log("we are ready for departure!");		

	serviceBus.subscribe("ServerApp.PingMessage, ServerApp", function(msg){
		console.log("from the PC:" + msg.tag);
	});
	
	setInterval( function() {
		serviceBus.publish("urn:message:ServerApp:PongMessage", {tag: new Date()});
	}, 4000);
})

serviceBus.on('disconnect', function(source){
	console.log("woeps... fail:", source)
});

serviceBus.init();
