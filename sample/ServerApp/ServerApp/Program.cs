namespace ServerApp
{
    using System;
    using MassTransit;
    using MassTransit.Saga;
    using MassTransit.Services.Subscriptions.Server;
    using MassTransit.Transports.UltralightStomp;
    using Ultralight;
    using Ultralight.Listeners;

    internal class Program
    {
        private static IServiceBus _serviceBus;

        private static void Main(string[] args)
        {
            StartWebsocketServer();
            StartSubscriptionService();
            CreateServiceBus();

            Console.WriteLine("ready... press enter to fire and 'exit' to stop");

            _serviceBus.SubscribeHandler<PongMessage>(x => Console.Out.WriteLine("x.Tag = {0}", x.Tag));

            while (Console.ReadLine() != "exit")
            {
                 _serviceBus.Publish(
                            new PingMessage{Tag = DateTime.Now.ToString()},
                            contextCallback => contextCallback.IfNoSubscribers(
                                message => Console.WriteLine("Make sure the browser is connected...")));
            }
        }

        private static void CreateServiceBus()
        {
            Console.Out.WriteLine("starting the servicebus");

            _serviceBus = ServiceBusFactory
                .New(sbc =>
                         {
                             sbc.ReceiveFrom("stomp://localhost:8181/server");
                             sbc.UseStomp();
                             sbc.UseJsonSerializer();
                             
                             sbc.UseSubscriptionService("stomp://localhost:8181/subscriptions");
                         });
        }

        private static void StartSubscriptionService()
        {
            Console.Out.WriteLine("starting the subscription service");

            var serviceBus =
                ServiceBusFactory.New(sbc =>
                                          {
                                              sbc.UseStomp();
                                              sbc.UseJsonSerializer();

                                              sbc.ReceiveFrom("stomp://localhost:8181/subscriptions");
                                          });

            var subscriptionService =
                new SubscriptionService(serviceBus,
                                        new InMemorySagaRepository<SubscriptionSaga>(),
                                        new InMemorySagaRepository<SubscriptionClientSaga>());

            subscriptionService.Start();
        }

        private static void StartWebsocketServer()
        {
            Console.Out.WriteLine("starting the websockets service");

            var wsListener = new StompWsListener(new Uri("ws://localhost:8181/"));
            var server = new StompServer(wsListener);
            server.Start();
        }
    }

    public class PingMessage
    {
        public string Tag { get; set; }
    }

    public class PongMessage
    {
        public string Tag { get; set; }
    }
}