(function($){
		
	/**
	 *	application entry point
	 */
	$(function() {
		
		var serviceBus = new masstransit.Servicebus({ 
			receiveFrom: "stomp://nawa:61614/queue/client", 
			subscriptionService: "stomp://nawa:61614/queue/mt_subscriptions",
			transport: "stomp" });
					
		serviceBus.on('ready',function(){
			serviceBus.subscribe("ServerApp.PingMessage, ServerApp", function(msg){
				$("#pings").append('<p>' + msg.tag + '</p>');
			});
			
			setInterval( function() {
				serviceBus.publish("urn:message:ServerApp:PongMessage", {tag: new Date()});
			}, 4000);
		});
		
		serviceBus.init();
	});

	
})(jQuery);