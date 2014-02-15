go-dependency-force-layout
==========================

This is a tool to visualise the web of dependencies present in a large configuration of ThoughtWorks’s Go system for continuous delivery.

It uses the excellent work of Mike Bostock on d3, adapted from a number of his examples (e.g. http://bl.ocks.org/mbostock/4062045).

I built this to see if it could help me understand how our organisation was using Go, and it proved very enlightening.

It works by fetching the configuration XML over HTTP, either from the configuration API (provided you are a logged in Go Admin) or from a supplied URL. If you want to fetch directly from Go, then you should issue the Access-Control-Allow-Credentials: true header from your Go instance to ensure your browser is allowed to send your cookie credentials to Go. See here for more info about Cross Origin Resource Sharing: http://enable-cors.org/server_apache.html

Since it makes a cross origin request, you need the be looking at the HTML page via a web server. A script is included to quickly get a server running using Python.

Simply point the page at the configuration XML by supplying a configUrl parameter like this:

http://localhost:8081/pipeline-dependencies.html?configUrl=http://yourgoserver/go/admin/config_xml

It will default to the included sample.xml if you do not supply the parameter, to give you an idea of how it works.

If, like me, yours does not fit on the screen, hit zoom out a few times and refresh the page.
