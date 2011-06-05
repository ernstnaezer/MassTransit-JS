(function($){
	
	/**
	 *	application entry point
	 */
	$(function() {
		
		var serviceBus = new masstransit.Servicebus();
		serviceBus.init( { receiveFrom: "stomp://localhost:8181/client", subscriptionService: "stomp://localhost:8181/subscriptions" } );
		
		serviceBus.ready(function(){
			serviceBus.subscribe("ServerApp.PingMessage, ServerApp", function(msg){
				$("#pings").append('<p>ping!</p>');
			});
		});

		});

	
})(jQuery);