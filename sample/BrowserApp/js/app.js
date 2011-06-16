(function($){
	
	/**
	 *	application entry point
	 */
	$(function() {
		
		var serviceBus = new masstransit.Servicebus({ receiveFrom: "stomp://localhost:8181/client", subscriptionService: "stomp://localhost:8181/subscriptions" });
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