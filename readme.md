MassTransit JS
==============
Masstransit javascript messaging using STOMP over Websockets.

Introduction
------------
MassTransit JS is a javascript implementation of the Masstransit messaging framework. It provides a way to communicate with other MassTransit instances in your network via Stomp message brokering. You can run the code both from nodeJs as well as a webbrowser that supports websockets.

Please check out the sample setup below for more stuff.

Installation
------------
Right now the only way to install is by cloning from git

	git clone git://github.com/enix/MassTransit-JS.git
	
If you want to run the nodeJs version of the code you have to install run 

	npm install
	
from the directory that you've cloned the code into. That should be it.

Configuration
-------------
*node-js*
In node-js you have the advantage of being able to require just the package file and specify which transport you want to use via the scheme in the configuration object.

	var Servicebus = require("masstransit-js").Servicebus;

	var serviceBus = new Servicebus({
		receiveFrom : "stomp://localhost:61614/queue/nodejs",
		subscriptionService: "stomp://localhost:61614/queue/mt_subscriptions",
		transport :'stomp'
	});
	
*browser*
At this moment you have to include a lot of file... see the BrowserApp for all the details, but after that the configuration is pretty much the same.
	<html>
    	<script type="text/javascript" src="./masstransit.js"></script>
	
		<script>
			var serviceBus = new masstransit.Servicebus({ 
				receiveFrom: "stomp://localhost:61614/queue/client", 
				subscriptionService: "stomp://localhost:61614/queue/mt_subscriptions",
				transport: "stomp" });					
		</script>
	</html>
	
Logging
-------
By default we log to the console. Please modify the debug and info functions of the Logger to suite your needs.

Component stack
---------------
The project currently relies on a Stomp broker that communicates via websockets, both serverside as well as in your browser. This means it will run in browsers like Chrome, Safari and recent Firefox builds.

Communication between your C# application and a browser application in done via component stack:

	Your server application				|
		> MassTransit .Net				| all in C#
			> MT Stomp transport 		|
				> Stomp client 			|
										
					> websockets		| 
						> stomp broker	| ActiveMq / Ultralight / ... 
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

Three PC demo
=============
This section describes a demo setup between three machines all running different parts of the system.

M1: a server box running Ubuntu 11.04, this will be our Stomp message broker
M2: a Windows XP machine, this well run the MassTransit server hosting the subscription service
M3: A Macbook running Snow Leopard 10.6.7, this will run masstransit-js inside a nodeJs application

Please note that the order of starting these applications is important. ActiveMQ need to run first, after that you start the MassTransit PC version and then you fire up the nodeJs sample. This is because the javascript version of MT is a client and it connects to a subscription service for it's information. Since ActiveMQ isn't configured as durable messages get lost when the subscription service isn't running and the demo won't work.

If you want you can throw in a browser as well, but remember the execution order.

Setting up the broker
---------------------
For the message broker in this demo we'll be using ActiveMQ for it's ease of configuration.

* You need to have java installed on the machine (you can get it running with: sudo apt-get install default-jre-headless)
* get a copy of the [ActiveMq](https://activemq.apache.org/) message broker. 

	*important:* ActiveMQ build 5.5 contains a very nasty bug where the stomp body received over a web socket connection is truncated! Make sure you get a fresh snapshot of their 5.6 tree.

* untar the download 
* edit *./conf/activemq.xml*
* find the *transportConnectors* section and make it look like this

 	<transportConnectors>
        <transportConnector name="openwire" uri="tcp://0.0.0.0:61616"/>
        <transportConnector name="websocket" uri="ws://0.0.0.0:61614"/>
    </transportConnectors>
	
* start the server by running *./bin/activemq start*

Your server should be up and running by now.

Setting up the PC
-----------------
The PC will run the MassTransit subscription service, this service is coordinating the subscription information between consumers in your network. You register a new client by posting a message into the *subscription* queue, after that you're new client receives refresh messages so it known where to send which message.

* open the included *ServerApp* in Visual studio
* edit the *localhost* part to match you're activeMQ server
* press run and watch it go

Setting up the mac
------------------
Last, but certainly not least, we'll setup te Mac running the nodeJS application that will communicate with the Windows machine, exchanging ping and pong messages.

* make sure you have nodeJs installed on the machine, for a how to see (devpatch)[http://www.devpatch.com/2010/02/installing-node-js-on-os-x-10-6/]
* open the included sample.js application in an editor
* change *localhost* to match the address of the broker
* start the included sample app by running *node ./play.js*

Things to do
============
This project is still in a very early 'hurray, it works!' state, so that means a lot can and probably needs change.

For example:

* Only the 'happy happy joy joy everything is alright' flow is implemented at this moment. That means poor error handling, no reconnect support, no healtmonitoring and everything you would like to see in mature software.

* You can not unsubscribe a message consumer.

* .... and most likely a ton of other things
	
Credits
=======
This code doens't run by without the help of a couple of great libraries, so here we go

Libraries
---------
The following libraries are used to create the full stack

* Stomp Javascript client 	http://jmesnil.net/ 
* Math.uuid.js 				http://www.broofa.com
* EventEmitter				http://github.com/pete-otaqui
* uri.js					http://code.google.com/p/js-uri/
* Nimble functions			http://caolan.github.com/nimble/
* Ultralight Message Broker	http://github.com/enix/ultralight

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
