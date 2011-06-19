var ServiceBus = require("../index").Servicebus;

var bus = new ServiceBus({
	receiveFrom : "stomp://localhost:8181/client",
	subscriptionService: "stomp://localhost:8181/subscription",
	transport :'stomp'
});

bus.on('ready', function(){
	console.log("we are ready for departure!");
})

bus.init();
