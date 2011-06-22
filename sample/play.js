var ServiceBus = require("../index").Servicebus;

var bus = new ServiceBus({
	receiveFrom : "stomp://nawa:61614/queue/nodejs",
	subscriptionService: "stomp://nawa:61614/queue/mt_subscriptions",
	transport :'stomp'
});

bus.on('ready', function(){
	console.log("we are ready for departure!");
})

bus.on('disconnect', function(source){
	console.log("woeps... fail:", source)
});

bus.init();
