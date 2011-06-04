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

namespace MassTransit.Transports.UltralightStomp
{
    using System;
    using System.Collections.Concurrent;
    using System.IO;
    using System.Text;
    using Context;
    using Ultralight.Client;

    public class StompTransport : TransportBase
    {
        private readonly StompClient _client;
        private readonly ConcurrentQueue<string> _messages = new ConcurrentQueue<string>();

        /// <summary>
        /// Initializes a new instance of the <see cref="StompTransport"/> class.
        /// </summary>
        /// <param name="address">The address.</param>
        /// <param name="client">The client.</param>
        public StompTransport(IEndpointAddress address, StompClient client)
            : base(address)
        {
            _client = client;
            _client.OnMessage = msg => _messages.Enqueue(msg.Body);
        }

        public override void Receive(Func<IReceiveContext, Action<IReceiveContext>> callback, TimeSpan timeout)
        {
            GuardAgainstDisposed();

            string message;
            if (!_messages.TryDequeue(out message))
                return;

            using (var ms = new MemoryStream(Encoding.UTF8.GetBytes(message)))
            {
                var context = new ConsumeContext(ms);

                using (ContextStorage.CreateContextScope(context))
                {
                    var receive = callback(context);

                    if (receive != null)
                    {
                        receive(context);
                    }
                }
            }
        }

        public override void Send(ISendContext context)
        {
            GuardAgainstDisposed();

            using (var body = new MemoryStream())
            {
                context.SerializeTo(body);

                var msg = Encoding.UTF8.GetString(body.ToArray());
                _client.Send(Address.Uri.PathAndQuery, msg);
            }
        }

        protected override void OnDisposing()
        {
            //_client.Disconnect();
        }
    }
}