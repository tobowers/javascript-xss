/* MIT license */

CritBoard.XSS = function() {
  var publicObj = {};
  
  var requestId = 0;
  
  var proxyURL = "http://staging.critboard.com";
  var cachedStaticUrl = null;
  var staticUrlRegex = new RegExp("http://" + document.domain);
  
  var hiddenField = function(name, value) {
    publicObj.debug("calling hidden field");
    if(!name || !value) {
      throw new Error("name and value must be specified");
    }
    publicObj.debug(["<input type='hidden' name='", name, "' value='", value, "' />"].join(""));
    return ["<input type='hidden' name='XSSparams_", name, "' value='", value, "' />"].join("");
  };
  
  var utilityField = function(name, value) {
    if(!name || !value) {
      throw new Error("name and value must be specified");
    }
    return ["<input type='hidden' name='", name, "' value='", value, "' />"].join("");
  };
  
  var formHTML = function(fields) {
    return ["<form method='get' action='", proxyURL, "'>", fields, "</form>"].join("");
  };
  
  var iframeHTML = function(htmlString) {
    return ["<html><body onload='document.forms[0].submit();'>", htmlString, "</body></html>"].join("");
  };
  
  var createIframe = function(htmlSource) {
    publicObj.debug("creating iframe");
    var iframe = document.createElement("iframe");
    iframe.height = 0;
    iframe.width = 0;
    iframe.name = "CritBoard_xss_request_" + requestId;
    iframe.id = iframe.name = "CritBoard_xss_request_" + requestId;
    document.body.appendChild(iframe);
    var doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(htmlSource);
    doc.close();
    ++requestId;
    return iframe;
  };
  
  var prepareHTML = function(endPoint, staticClientResource, opts) {
    publicObj.debug("called prepare HTML");
    opts = opts || {};
    var fields = "";
    var form = "";
    var htmlSource = "";
    opts.method = opts.method || "post";
    var parameters = opts.parameters || opts.params || {};
    fields += fields += utilityField('method', opts.method);
    fields += utilityField('end_point', endPoint);
    fields += utilityField('static_resource', staticClientResource);
    for(param in parameters) {
      publicObj.debug(param);
      publicObj.debug(parameters[param]);
      if(parameters.hasOwnProperty(param)) {
        publicObj.debug("adding param: " + parameters[param]);
        fields += hiddenField(param, parameters[param]);
      }
    }
    publicObj.debug(fields);
    form = formHTML(fields);
    htmlSource = iframeHTML(form);
    publicObj.debug(htmlSource);
    return htmlSource;
  };
  
  var findStaticUrl = function() {
    if(cachedStaticUrl && cachedStaticUrl.match(staticUrlRegex)) {
      return cachedStaticUrl;
    } else {
      publicObj.debug("finding static url");
      publicObj.debug(document.domain);
      var imgs = document.body.getElementsByTagName("IMG");
      var img = null;
      var len = imgs.length;
      
      for(var i=0;i < len; ++i) {
        publicObj.debug("for loop");
        img = imgs[i];
        if(img.src.match(staticUrlRegex)) {
          publicObj.debug('match');
          cachedStaticUrl = img.src.split("?")[0];
          publicObj.debug("oh yeah: " + cachedStaticUrl);
          return cachedStaticUrl;
          publicObj.debug("never reach here!");
        }
      }

      if(!cachedStaticUrl) {
        throw new Error("did not find an image that matches your domain");
      }
    }   
  };
  
  var getStatusFromIframe = function(iframeName) {
    publicObj.debug("getting status hash");
    return window.frames[iframeName].frames["statusIframe"].location.hash.substring(1);
  };
  
  var getResponseFromIframe = function(iframeName, num) {
    num = num || 1;
    //do more processing here
    publicObj.debug("getting response iframe hash");
    var data = window.frames[iframeName].frames[["responseIframe_", num].join("")].location.hash.substring(1);
    publicObj.debug(data);
    return data;
  };
  
  var getCountFromIframe = function(iframeName) {
    return window.frames[iframeName].frames["countIframe"].location.hash.substring(1);
  };
  
  publicObj.Request = function(url, opts) {
    if(!url) {
      throw new Error("must specify a url");
    }
    opts = opts || {};
    if(url.charAt(0) != "/") {
      url = "/" + url;
    }
    var pollCount = 0;
    var maxPollCount = 400;
    
    var staticClientResource = findStaticUrl();
    publicObj.debug(staticClientResource);
    
    var htmlSource = prepareHTML(url, staticClientResource, opts);
    publicObj.debug(htmlSource);
    var iframe = createIframe(htmlSource);
    publicObj.debug(iframe);
    var iframeName = iframe.name;
    
    
    var pollIframe = function(that) {
      ++pollCount;
      return function() {        
        var getInfo = function() {
          var response = {};
          var frameCount = getCountFromIframe(iframeName);
          response.status = getStatusFromIframe(iframeName);
          publicObj.debug(response.status);
          var responseData = "";
          for(var i=1; i <= frameCount; ++i) {
            responseData = [responseData, getResponseFromIframe(iframeName, i)].join("");
          }
          publicObj.debug(responseData);
          response.responseText = responseData;
          iframe.parentNode.removeChild(iframe);
          publicObj.debug(response);
          if(opts.onComplete) {
            opts.onComplete(response);
          }
        };
        
        var throwError = function() {
          if(opts.onComplete) {
            var response = {};
            response.status = "error";
            response.responseText = "time out";
            opts.onComplete(response);
          }
        };
        try {
          if(window.frames[iframeName].frames && window.frames[iframeName].frames["statusIframe"]) {
            publicObj.debug('found the iframe');
            getInfo();
          } else {
            if(pollCount < maxPollCount) {
              setTimeout(pollIframe(that), 250);
            } else {
              throwError();
            }
          }
        } catch(e) {
            // publicObj.debug(e);
            if(pollCount < maxPollCount) {
              setTimeout(pollIframe(that), 150);
            } else {
              throwError();
            }
            return;
        }
      };
    };
    setTimeout(pollIframe(this), 200);
    return "loading";
  };
  
  publicObj.debug = function(debugCode) {
    console.log(debugCode);
  };
  
  return publicObj;
}();