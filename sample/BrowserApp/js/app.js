(function($){
	
	/**
	 *	application entry point
	 */
	$(function() {
		
		var serviceBus = new MassTransit.ServiceBus();
		serviceBus.init( { receiveFrom: "stomp://localhost:8181/client", subscriptionService: "stomp://localhost:8181/subscriptions" } );
		
		serviceBus.ready(function(){
			serviceBus.subscribe("ManagedMassTransit.PingMessage, ManagedMassTransit", function(msg){
					console.log("ping received");
			});
		});
	});
	
})(jQuery);