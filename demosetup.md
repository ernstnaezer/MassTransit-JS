Three PC demo
=============

This section describes a testing setup between three machines all running different parts of the system.

M1: a server box running Ubuntu 11.04, this will be our Stomp message broker 
M2: a Windows XP machine, this well run the MassTransit server hosting the subscription service
M3: A Macbook running Snow Leopard 10.6.7, this will run masstransit-js inside a nodeJs application

If you want you can throw in a browser as well...

Setting up the broker
---------------------
For the message broker in this demo we'll be using ActiveMQ for it's ease of configuration.

* make sure you have java installed on the machine (you can get it running with: sudo apt-get install default-jre-headless)
* get a copy of the [ActiveMq](https://activemq.apache.org/) message broker. This demo is build using version 5.5.0
* untar the fresh download 
* and edit *./conf/activemq.xml*
* find the *transportConnectors* section and make it look like this

 	<transportConnectors>
        <transportConnector name="openwire" uri="tcp://0.0.0.0:61616"/>
        <transportConnector name="websocket" uri="ws://0.0.0.0:61614"/>
    </transportConnectors>
	
* start the server by running *./bin/activemq start*

Your server should be up and running by now.

Setting up the PC
-----------------

Setting up the mac
------------------
Last, but certainly not least, we'll setup te Mac running the nodeJS application that will communicate with the Windows machine, exchaning ping and pong messages.

* make sure you have nodeJs installed on the machine, for a howto see (devpatch)[http://www.devpatch.com/2010/02/installing-node-js-on-os-x-10-6/]
* edit the included sample.js application and edit the *[server_ip]* part to match the address of the ubuntu box
* start the included sample app by running *node ./sample.js*



