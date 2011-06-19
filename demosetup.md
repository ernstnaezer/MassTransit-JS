Three PC demo
-------------

This section describes a testing setup between three machines all running different parts of the system.

M1: a server box running Ubuntu 11.04, this will be our Stomp message broker 
M2: A Macbook running Snow Leopard 10.6.7, this will run masstransit-js inside a nodeJs application
M3: a Windows XP machine, this weill run a MassTransit server hosting the subscription service

If you want you can throw in a browser as well...

*Setting up the broker*

* make sure you have java installed on the machine (you can get it running with: sudo apt-get install default-jre-headless)
* get a copy of the [HorentQ](http://www.jboss.org/hornetq) message broker. This demo is build using version 2.2.5.Final
* edit *./config/stand-alone/non-clustered/hornetq-configuration.xml*
* add

	<acceptor name="stomp-ws-acceptor">
		<factory-class>org.hornetq.core.remoting.impl.netty.NettyAcceptorFactory</factory-class>
		<param key="protocol" value="stomp_ws"/>
		<param key="port" value="61614"/>
		<param key="host"  value="${hornetq.remoting.netty.host:[server_ip]}"/>
	</acceptor>
	
* replace *[server_ip]* with the ip address of you server so it can be reached from the network, also make sure there is no firewall in the way
* jump into the *bin* directory and start the server by running *./run.sh*

*Setting up the mac*

* make sure you have nodeJs installed on the machine (for a howto check: http://www.devpatch.com/2010/02/installing-node-js-on-os-x-10-6/)
* edit the included sample.js application and edit the *[server_ip]* part to match the address of the ubuntu box
* start the included sample app by running *node ./sample.js*


* jump into the *bin* directory and start the server by running ./run.sh

