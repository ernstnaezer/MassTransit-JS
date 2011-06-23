(function($){
	
	/**
	 *	application entry point
	 */
	$(function() {
		
		var serviceBus = new masstransit.Servicebus({ receiveFrom: "stomp://localhost:61614/queue/client", subscriptionService: "stomp://localhost:61614/queue/mt_subscriptions" });
		serviceBus.init();
		
		serviceBus.on('ready',function(){
			serviceBus.subscribe("ServerApp.PingMessage, ServerApp", function(msg){
				$("#pings").append('<p>' + msg.tag + '</p>');
			});
			
			setInterval( function() {
				serviceBus.publish("urn:message:ServerApp:PongMessage", {tag: new Date()});
			}, 4000);
		});

	});

	
})(jQuery);