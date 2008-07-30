THIS IS VERY MUCH ALPHA CODE - released under the MIT license

#Quick start
javascript_proxy.html goes in the root of the site that you are requesting data FROM
api.js is the client-side library
requires that the requesting page have an img on the page somewhere (this can be hacked)
need to change "proxyurl" in api.js

Make a request like:

    CritBoard.XSS.Request("url", opts); // where opts only takes opts.onComplete
