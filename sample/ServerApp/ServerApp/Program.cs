// Copyright 2011 Ernst Naezer, et. al.
//  
// Licensed under the Apache License, Version 2.0 (the "License"); you may not use 
// this file except in compliance with the License. You may obtain a copy of the 
// License at 
// 
//     http://www.apache.org/licenses/LICENSE-2.0 
// 
// Unless required by applicable law or agreed to in writing, software distributed 
// under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR 
// CONDITIONS OF ANY KIND, either express or implied. See the License for the 
// specific language governing permissions and limitations under the License.

namespace ServerApp
{
    using System;
    using System.IO;
    using MassTransit.Transports.Stomp;
    using log4net.Config;
    using Magnum.Extensions;
    using MassTransit;
    using MassTransit.Saga;
    using MassTransit.Services.Subscriptions.Server;
    using Ultralight;
    using Ultralight.Listeners;

    internal class Program
    {
        private const string Host = "stomp://localhost:61614/queue";

        private static void Main(string[] args)
        {
            XmlConfigurator.Configure(new FileInfo("runner.log4net.xml"));

            // comment me to use an external stomp broker
            StartWebsocketServer();

            StartSubscriptionService();

            Console.Out.WriteLine("starting the servicebus");
            var serviceBus = ServiceBusFactory
                .New(sbc =>
                         {
                             sbc.ReceiveFrom("{0}/server".FormatWith(Host));
                             sbc.UseStomp();

                             sbc.UseSubscriptionService("{0}/mt_subscriptions".FormatWith(Host));
                             sbc.UseControlBus();

                             sbc.Subscribe(s => s.Handler<PongMessage>(x => Console.Out.WriteLine("x.Tag = {0}", x.Tag)));                             
                         });

            Console.WriteLine("ready... press enter to fire and 'exit' to stop");

            while (Console.ReadLine() != "exit")
            {
                serviceBus.Publish(
                    new PingMessage {Tag = DateTime.Now.ToString()},
                    contextCallback => contextCallback.IfNoSubscribers( () => Console.WriteLine("Make sure the browser is connected...")));
            }
        }

        private static void StartSubscriptionService()
        {
            Console.Out.WriteLine("starting the subscription service");

            var subscriptionSagaRepository = new InMemorySagaRepository<SubscriptionSaga>();
            var clientSagaRepository = new InMemorySagaRepository<SubscriptionClientSaga>();

            var serviceBus =
                ServiceBusFactory.New(sbc =>
                                          {
                                              sbc.UseStomp();

                                              sbc.ReceiveFrom("{0}/mt_subscriptions".FormatWith(Host));
                                              sbc.SetConcurrentConsumerLimit(1);
                                          });

            var subscriptionService = new SubscriptionService(serviceBus, subscriptionSagaRepository,
                                                              clientSagaRepository);
            subscriptionService.Start();
        }

        private static void StartWebsocketServer()
        {
            Console.Out.WriteLine("starting the websockets service");

            var wsListener = new StompWsListener(new Uri("ws://localhost:61614/"));
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