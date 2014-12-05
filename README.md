node-redis-queue web demo
===============

Demonstrates how to use node-redis-queue in a web application.

This app permits the user to enter one or more URLs. Upon hitting
the Submit button, the page at each URL is downloaded and an SHA1
value is computed for the page body. When complete, the URL and
SHA1 values are displayed on this app's main page.

##Installation

    git clone https://github.com/cwjohan/node-redis-queue-web-demo.git

##Run the demo

    npm start

##Environment Variables

####PORT

The port on which the web server is to listen. Defaults to 3000.

####THRIFTY

Set this to `true` to indicate that the job processing should run in the same process
as the web server. Defaults to undefined.

####WORK_QUEUE_ARITY

Set this to indicate how many URLs are to be scraped in parallel. Defaults to 1.

##Main Application Components

###web.js

Creates an Express HTTP server to listen on the given port.
Dispatches `GET /` which displays the home page, home.jade.

When the user clicks the `Submit` button, it dispatches `POST /urls`
to routes.home.routeMe, which extracts the URLs provided by the
user in the urlsText textarea and submits those to the `app` component,
which does the scraping and SHA1 computation. The results are
returned in a `results` variable, an array of URL and SHA1 values,
which subsequently is displayed on the home page.

###routes/home.js

Creates a singular instance of a Home object, which has just one function: routeMe.

####routeMe(req, res)

Extracts the user-provided URLs from the request body `urlsText` element into a `urls` array.
It assumes each line of `urlsText` contains a single URL.
It then calls app.getSha1Results with the current session ID, the `urls` array, and
a callback that is called each time some data is available. These are just pushed onto
a results array.  When it is the last data item (i.e., when `isDone` is true), the
home.jade page is rendered using the page title option setting, the current urlsText
value, and the results array.

###app/index.js

####connect(arity, cb)

Creates a WorkQueueMgr instance and uses it to connect to redis-server
in 'half-duplex' or 'full-duplex' mode depending on `arity`.

Creates and clears a job queue named 'demo:jobq' which will contain URLs to be scraped.

When the queue has been cleared, it calls the user-provided callback function `cb`.

####getSession

Creates an express-session instance that uses a Redis store. This is intended
to be provided to the express HTTP server to use as middleware.

####getSha1Results(sessID, urls, cb)

Initially, it creates a session-specific queue named 'demo:rq' + sessID, which
will receive SHA1 results.

For each URL, if any, in the `urls` array, this function checks for a 'http://' or 'https://'
prefix. If there is none, it adds an 'http://' prefix.

Each such URL and associated session ID then is sent to the job queue 'demo:jobq'
enclosed in a hash, such as, for example:

    { url: 'http://code.google.com', rq: 'demo:rq.Zw1nINEibCWHLbtmlGpOtAmTo8-3J2GC' }

It then waits for results to appear in the result queue. Each result that appears
is sent to the user-provided callback function `cb` with an indication of whether
or not this is the last expected result. Each result is a URL and SHA1 value enclosed
in a hash, such as, for example:

    { url: 'http://code.google.com', sha1: '3abb5c5983ce5160edab588c5f34216259d11f18' }


####consumeJobRequests(cb)

This function waits for job requests to appear in the job queue 'demo:jobq'.

The URL in each job request is used to obtain a web page via the `request` module.
An SHA1 value is computed from the body of the web page. The URL and SHA1 value
are assembled into a hash, such as, for example:

    { url: 'http://code.google.com', sha1: '3abb5c5983ce5160edab588c5f34216259d11f18' }

which is pushed into the result queue associated with the given session ID.

If an error occurs in the URL lookup or page retreival, a different sort of hash
is returned in the result queue, such as, for example:

    { url: 'http://our-stories.org', err: 'Website not found' }

