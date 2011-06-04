MassTransit JS
==============
Masstransit javascript messaging using STOMP over Websockets.

Introduction
------------
MassTransit JS is a javascript implementation of the Masstransit messaging framework that bring this power to your browser. It provides a way to communicate with other MassTransit instances in your network via Stomp message brokering.

The library is written for a project I'm currently working on and to get a better understanding of the MassTransit internals. By no means is it complete at this stage! Please check the *todo section* for details.

Component stack
---------------------------
The project currently relies on a Stomp broker that communicates via websockets, both serverside as well as in your browser. This means it will run in browsers like Chrome, Safari and recent Firefox builds.

Communication between your C# application and a browser application in done via component stack:

	Your server application				|
		> MassTransit .Net				| all in C#
			> MT Stomp transport 		|
				> Stomp client 			|
										
					> websockets		| 
						> stomp broker	| also in C#, but could be anything... 
					< websockets 		|
					
				< Stomp client 			|	  
			< MT Stomp transport 		| all Javascript
		< Masstranist JS 				|
	Your browser application			|

Internals
---------
The Javascript version loosly follows the .net implementation in it's naming and (very) general setup.There is a main object called ServiceBus that allows you to publish messages and subscribe consumers.

Next to that there is the SubsriptionService which is used to register a new client and tell the world there is a new consumer available on the network. The StompTransport is used to talk to the Stomp client and notifies the bus when there is a new message available. This is it differs somewhat from the .net version, we assume an active client and rely on a 'push' model to kick-off the message delivery.

And last but cerainly not least, there is the Serializer, a thin layer to convert JSON objects into strings and back again.
	
Libraries
---------
The following libraries are used to create the full stack

* Stomp Javascript client http://jmesnil.net/ 
* Math.uuid.js http://www.broofa.com
* MicroEvent.js
* uri.js	Dominic Mitchell
* Ultralight Stomp message broker
* Ultralight Stomp message client

Things to do
------------
This project is in a very early 'hurray, it works!' state, so that means a lot can and probably needs change.

For example:

* Currenly you can only receive messages in your browser! So you can not publish from your browser. As far as I know the subscribtion service inside MT publishes a list of subscription information that contains all that is needed to support this. These events need to be captured and need to find there way into the JS internals so we can have the same Publish loop, but this is something that needs to be look in.

* Only the 'happy happy joy joy everything is alright' flow is implemented at this moment. That means poor error handling, no reconnect support, no healtmonitoring and everything you would like to see in mature software.
	
* You can not unsubscribe a message consumer.

* We also open two websocket connections to the broker, but it looks they both receive multiple messages so this needs to be looked into as well.Perhaps we can reduced this to one connection by given the transport channels some TLC and refactoring.
	
* Delivered message contain a differnt namespace notation that is converted quick and dirty to support the demo.
	
* .... and most likely a ton of other things
	
License
-------
Copyright 2011 Ernst Naezer, et. al.
 
Licensed under the Apache License, Version 2.0 (the "License"); you may not use 
this file except in compliance with the License. You may obtain a copy of the 
License at 

    http://www.apache.org/licenses/LICENSE-2.0 

Unless required by applicable law or agreed to in writing, software distributed 
under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR 
CONDITIONS OF ANY KIND, either express or implied. See the License for the 
specific language governing permissions and limitations under the License.
