var ServiceBus = require("../index").Servicebus;

var bus = new ServiceBus({
	receiveFrom : "stomp://nawa:61614/stomp/client",
	subscriptionService: "stomp://nawa:61614/stomp/client",
	transport :'stomp'
});

bus.on('ready', function(){
	console.log("we are ready for departure!");
})

bus.on('disconnect', function(source){
	console.log("woeps... fail:", source)
});

bus.init();
