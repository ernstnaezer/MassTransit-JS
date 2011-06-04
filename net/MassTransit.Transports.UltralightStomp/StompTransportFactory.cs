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
    using Exceptions;
    using Ultralight.Client;

    public class StompTransportFactory : ITransportFactory
    {
        #region ITransportFactory Members

        public string Scheme
        {
            get { return "stomp"; }
        }

        public IDuplexTransport BuildLoopback(ITransportSettings settings)
        {
            EnsureProtocolIsCorrect(settings.Address.Uri);

            var client = GetConnection(settings.Address);
            return new StompTransport(settings.Address, client);
        }

        public IInboundTransport BuildInbound(ITransportSettings settings)
        {
            return BuildLoopback(settings);
        }

        public IOutboundTransport BuildOutbound(ITransportSettings settings)
        {
            return BuildLoopback(settings);
        }

        public IOutboundTransport BuildError(ITransportSettings settings)
        {
            return BuildLoopback(settings);
        }

        public void Dispose()
        {
        }

        #endregion

        private static StompClient GetConnection(IEndpointAddress address)
        {
            Uri wsAddress = new UriBuilder("ws", address.Uri.Host, address.Uri.Port).Uri;
            var client = new StompClient();
            client.Connect(wsAddress);

            client.Subscribe(address.Uri.PathAndQuery);

            return client;
        }

        private void EnsureProtocolIsCorrect(Uri address)
        {
            if (address.Scheme != Scheme)
                throw new EndpointException(address,
                                            string.Format("Address must start with 'stomp' not '{0}'", address.Scheme));
        }
    }
}