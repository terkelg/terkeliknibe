// Avoid `console` errors in browsers that lack a console.
(function() {
    var method;
    var noop = function () {};
    var methods = [
        'assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error',
        'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log',
        'markTimeline', 'profile', 'profileEnd', 'table', 'time', 'timeEnd',
        'timeStamp', 'trace', 'warn'
    ];
    var length = methods.length;
    var console = (window.console = window.console || {});

    while (length--) {
        method = methods[length];

        // Only stub undefined methods.
        if (!console[method]) {
            console[method] = noop;
        }
    }
}());




/*!
 * viewport-units-buggyfill v0.3.1
 * @web: https://github.com/rodneyrehm/viewport-units-buggyfill/
 * @author: Rodney Rehm - http://rodneyrehm.de/en/
 */
(function (root, factory) {
  'use strict';
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define([], factory);
  } else if (typeof exports === 'object') {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like enviroments that support module.exports,
    // like Node.
    module.exports = factory();
  } else {
    // Browser globals (root is window)
    root.viewportUnitsBuggyfill = factory();
  }
}(this, function () {
  'use strict';
  /*global document, window, location, XMLHttpRequest, XDomainRequest*/

  var initialized = false;
  var viewportUnitExpression = /([0-9.-]+)(vh|vw|vmin|vmax)/g;
  var forEach = [].forEach;
  var join = [].join;
  var dimensions;
  var declarations;
  var styleNode;
  var is_safari_or_uiwebview = /(iPhone|iPod|iPad).+AppleWebKit/i.test(window.navigator.userAgent);

  function initialize(force) {
    if (initialized || (!force && !is_safari_or_uiwebview)) {
      // this buggyfill only applies to mobile safari
      return;
    }

    initialized = true;
    styleNode = document.createElement('style');
    styleNode.id = 'patched-viewport';
    document.head.appendChild(styleNode);

    // Issue #6: Cross Origin Stylesheets are not accessible through CSSOM,
    // therefore download and inject them as <style> to circumvent SOP.
    importCrossOriginLinks(function() {
      //window.addEventListener('orientationchange', updateStyles, true);
      // doing a full refresh rather than updateStyles because an orientationchange
      // could activate different stylesheets
      window.addEventListener('orientationchange', refresh, true);
      refresh();
    });
  }

  function updateStyles() {
    styleNode.textContent = getReplacedViewportUnits();
  }

  function refresh() {
    if (!initialized) {
      return;
    }
    findProperties();
    updateStyles();
  }

  function findProperties() {
    declarations = [];
    forEach.call(document.styleSheets, function(sheet) {
      if (sheet.ownerNode.id === 'patched-viewport' || !sheet.cssRules) {
        // skip entire sheet because no rules ara present or it's the target-element of the buggyfill
        return;
      }
      if (sheet.media.mediaText && !window.matchMedia(sheet.media.mediaText).matches) {
        // skip entire sheet because media attribute doesn't match
        return;
      }
      forEach.call(sheet.cssRules, findDeclarations);
    });
    return declarations;
  }

  function findDeclarations(rule) {
    if (rule.type === 7) {
      var value = rule.cssText;
      viewportUnitExpression.lastIndex = 0;
      if (viewportUnitExpression.test(value)) {
        declarations.push([rule, null, value]);
      }
      return;
    }

    if (!rule.style) {
      if (!rule.cssRules) {
        return;
      }

      forEach.call(rule.cssRules, function(_rule) {
        findDeclarations(_rule);
      });

      return;
    }

    forEach.call(rule.style, function(name) {
      var value = rule.style.getPropertyValue(name);
      viewportUnitExpression.lastIndex = 0;
      if (viewportUnitExpression.test(value)) {
        declarations.push([rule, name, value]);
      }
    });
  }

  function getReplacedViewportUnits() {
    dimensions = getViewport();

    var css = [];
    var buffer = [];
    var open;
    var close;

    declarations.forEach(function(item) {
      var _item = overwriteDeclaration.apply(null, item);
      var _open = _item.selector.length ? (_item.selector.join(' {\n') + ' {\n') : '';
      var _close = new Array(_item.selector.length + 1).join('\n}');

      if (!_open || _open !== open) {
        if (buffer.length) {
          css.push(open + buffer.join('\n') + close);
          buffer.length = 0;
        }

        if (_open) {
          open = _open;
          close = _close;
          buffer.push(_item.content);
        } else {
          css.push(_item.content);
          open = null;
          close = null;
        }

        return;
      }

      if (_open && !open) {
        open = _open;
        close = _close;
      }

      buffer.push(_item.content);
    });

    if (buffer.length) {
      css.push(open + buffer.join('\n') + close);
    }

    return css.join('\n\n');
  }

  function overwriteDeclaration(rule, name, value) {
    var _value = value.replace(viewportUnitExpression, replaceValues);
    var _selectors = [];
    if (name) {
      _selectors.push(rule.selectorText);
      _value = name + ': ' + _value + ';';
    }

    var _rule = rule.parentRule;
    while (_rule) {
      _selectors.unshift('@media ' + join.call(_rule.media, ', '));
      _rule = _rule.parentRule;
    }

    return {
      selector: _selectors,
      content: _value
    };
  }

  function replaceValues(match, number, unit) {
    var _base = dimensions[unit];
    var _number = parseFloat(number) / 100;
    return (_number * _base) + 'px';
  }

  function getViewport() {
    var vh = window.innerHeight;
    var vw = window.innerWidth;
    return {
      vh: vh,
      vw: vw,
      vmax: Math.max(vw, vh),
      vmin: Math.min(vw, vh)
    };
  }

  function importCrossOriginLinks(next) {
    var _waiting = 0;
    var decrease = function() {
      _waiting--;
      if (!_waiting) {
        next();
      }
    };

    forEach.call(document.styleSheets, function(sheet) {
      if (!sheet.href || origin(sheet.href) === origin(location.href) ) {
        // skip <style> and <link> from same origin
        return;
      }
      _waiting++;
      convertLinkToStyle(sheet.ownerNode, decrease);
    });

    if (!_waiting) {
      next();
    }
  }

  function origin(url) {
    return url.slice(0, url.indexOf('/', url.indexOf('://') + 3));
  }

  function convertLinkToStyle(link, next) {
    getCors(link.href, function() {
      var style = document.createElement('style');
      style.media = link.media;
      style.setAttribute('data-href', link.href);
      style.textContent = this.responseText;
      link.parentNode.replaceChild(style, link);
      next();
    }, next);
  }

  function getCors(url, success, error) {
    var xhr = new XMLHttpRequest();
    if ('withCredentials' in xhr) {
      // XHR for Chrome/Firefox/Opera/Safari.
      xhr.open('GET', url, true);
    } else if (typeof XDomainRequest !== 'undefined') {
      // XDomainRequest for IE.
      xhr = new XDomainRequest();
      xhr.open('GET', url);
    } else {
      throw new Error('cross-domain XHR not supported');
    }

    xhr.onload = success;
    xhr.onerror = error;
    xhr.send();
    return xhr;
  }

  return {
    version: '0.3.1',
    findProperties: findProperties,
    getCss: getReplacedViewportUnits,
    init: initialize,
    refresh: refresh
  };
}));


/* Share Button
 * https://github.com/carrot/share-button
 */
!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Share=e()}}(function(){var define,module,exports;
function getStyles(config){ return ""+config.selector+"{width:92px;height:20px;-webkit-touch-callout:none;-khtml-user-select:none;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}"+config.selector+" [class*=entypo-]:before{font-family:entypo,sans-serif}"+config.selector+" label{font-size:16px;cursor:pointer;margin:0;padding:5px 10px;border-radius:5px;background:#a29baa;color:#333;-webkit-transition:all .3s ease;transition:all .3s ease}"+config.selector+" label:hover{opacity:.8}"+config.selector+" label span{text-transform:uppercase;font-size:.9em;font-family:Lato,sans-serif;font-weight:700;-webkit-font-smoothing:antialiased;padding-left:6px}"+config.selector+" .social{opacity:0;-webkit-transition:all .4s ease;transition:all .4s ease;margin-left:-15px;visibility:hidden}"+config.selector+" .social.top{-webkit-transform-origin:0 0;-ms-transform-origin:0 0;transform-origin:0 0;margin-top:-80px}"+config.selector+" .social.bottom{-webkit-transform-origin:0 0;-ms-transform-origin:0 0;transform-origin:0 0;margin-top:5px}"+config.selector+" .social.middle{margin-top:-34px}"+config.selector+" .social.middle.right{-webkit-transform-origin:5% 50%;-ms-transform-origin:5% 50%;transform-origin:5% 50%;margin-left:105px}"+config.selector+" .social.middle.left{-webkit-transform-origin:5% 50%;-ms-transform-origin:5% 50%;transform-origin:5% 50%}"+config.selector+" .social.right{margin-left:14px}"+config.selector+" .social.load{-webkit-transition:none!important;transition:none!important}"+config.selector+" .social.networks-1{width:60px}"+config.selector+" .social.networks-1.center,"+config.selector+" .social.networks-1.left{margin-left:14px}"+config.selector+" .social.networks-1.middle.left{margin-left:-70px}"+config.selector+" .social.networks-1 ul{width:60px}"+config.selector+" .social.networks-2{width:120px}"+config.selector+" .social.networks-2.center{margin-left:-13px}"+config.selector+" .social.networks-2.left{margin-left:-44px}"+config.selector+" .social.networks-2.middle.left{margin-left:-130px}"+config.selector+" .social.networks-2 ul{width:120px}"+config.selector+" .social.networks-3{width:180px}"+config.selector+" .social.networks-3.center{margin-left:-45px}"+config.selector+" .social.networks-3.left{margin-left:-102px}"+config.selector+" .social.networks-3.middle.left{margin-left:-190px}"+config.selector+" .social.networks-3 ul{width:180px}"+config.selector+" .social.networks-4{width:240px}"+config.selector+" .social.networks-4.center{margin-left:-75px}"+config.selector+" .social.networks-4.left{margin-left:162px}"+config.selector+" .social.networks-4.middle.left{margin-left:-250px}"+config.selector+" .social.networks-4 ul{width:240px}"+config.selector+" .social.networks-5{width:300px}"+config.selector+" .social.networks-5.center{margin-left:-105px}"+config.selector+" .social.networks-5.left{margin-left:-225px}"+config.selector+" .social.networks-5.middle.left{margin-left:-320px}"+config.selector+" .social.networks-5 ul{width:300px}"+config.selector+" .social.active{opacity:1;-webkit-transition:all .4s ease;transition:all .4s ease;visibility:visible}"+config.selector+" .social.active.top{-webkit-transform:scale(1) translateY(-10px);-ms-transform:scale(1) translateY(-10px);transform:scale(1) translateY(-10px)}"+config.selector+" .social.active.bottom{-webkit-transform:scale(1) translateY(15px);-ms-transform:scale(1) translateY(15px);transform:scale(1) translateY(15px)}"+config.selector+" .social.active.middle.right{-webkit-transform:scale(1) translateX(10px);-ms-transform:scale(1) translateX(10px);transform:scale(1) translateX(10px)}"+config.selector+" .social.active.middle.left{-webkit-transform:scale(1) translateX(-10px);-ms-transform:scale(1) translateX(-10px);transform:scale(1) translateX(-10px)}"+config.selector+" .social ul{position:relative;left:0;right:0;height:46px;color:#fff;margin:auto;padding:0;list-style:none}"+config.selector+" .social ul li{font-size:20px;cursor:pointer;width:60px;margin:0;padding:12px 0;text-align:center;float:left;display:none;height:22px;position:relative;z-index:2;-webkit-box-sizing:content-box;-moz-box-sizing:content-box;box-sizing:content-box;-webkit-transition:all .3s ease;transition:all .3s ease}"+config.selector+" .social ul li:hover{color:rgba(0,0,0,.5)}"+config.selector+" .social li[class*=facebook]{background:#3b5998;display:"+config.networks.facebook.display+"}"+config.selector+" .social li[class*=twitter]{background:#6cdfea;display:"+config.networks.twitter.display+"}"+config.selector+" .social li[class*=gplus]{background:#e34429;display:"+config.networks.google_plus.display+"}"+config.selector+" .social li[class*=pinterest]{background:#c5282f;display:"+config.networks.pinterest.display+"}"+config.selector+" .social li[class*=paper-plane]{background:#42c5b0;display:"+config.networks.email.display+"}"};var ShareUtils;"classList"in document.documentElement||!Object.defineProperty||"undefined"==typeof HTMLElement||Object.defineProperty(HTMLElement.prototype,"classList",{get:function(){var t,e,o;return o=function(t){return function(o){var n,i;n=e.className.split(/\s+/),i=n.indexOf(o),t(n,i,o),e.className=n.join(" ")}},e=this,t={add:o(function(t,e,o){~e||t.push(o)}),remove:o(function(t,e){~e&&t.splice(e,1)}),toggle:o(function(t,e,o){~e?t.splice(e,1):t.push(o)}),contains:function(t){return!!~e.className.split(/\s+/).indexOf(t)},item:function(t){return e.className.split(/\s+/)[t]||null}},Object.defineProperty(t,"length",{get:function(){return e.className.split(/\s+/).length}}),t}}),ShareUtils=function(){function t(){}return t.prototype.extend=function(t,e,o){var n,i;for(i in e)n=void 0!==t[i],n&&"object"==typeof e[i]?this.extend(t[i],e[i],o):(o||!n)&&(t[i]=e[i])},t.prototype.hide=function(t){return t.style.display="none"},t.prototype.show=function(t){return t.style.display="block"},t.prototype.has_class=function(t,e){return t.classList.contains(e)},t.prototype.add_class=function(t,e){return t.classList.add(e)},t.prototype.remove_class=function(t,e){return t.classList.remove(e)},t.prototype.is_encoded=function(t){return decodeURIComponent(t)!==t},t.prototype.encode=function(t){return this.is_encoded(t)?t:encodeURIComponent(t)},t.prototype.popup=function(t,e){var o,n,i,r;return null==e&&(e={}),n={width:500,height:350},n.top=screen.height/2-n.height/2,n.left=screen.width/2-n.width/2,i=function(){var t;t=[];for(o in e)r=e[o],t.push(""+o+"="+this.encode(r));return t}.call(this).join("&"),i&&(i="?"+i),window.open(t+i,"targetWindow","toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,left="+n.left+",top="+n.top+",width="+n.width+",height="+n.height)},t}();var Share,__hasProp={}.hasOwnProperty,__extends=function(t,e){function o(){this.constructor=t}for(var n in e)__hasProp.call(e,n)&&(t[n]=e[n]);return o.prototype=e.prototype,t.prototype=new o,t.__super__=e.prototype,t};Share=function(t){function e(t,e){var o;return this.element=t,this.el={head:document.getElementsByTagName("head")[0],body:document.getElementsByTagName("body")[0]},this.config={enabled_networks:0,protocol:-1===["http","https"].indexOf(window.location.href.split(":")[0])?"https://":"//",url:window.location.href,caption:null,title:(o=document.querySelector('meta[property="og:title"]')||document.querySelector('meta[name="twitter:title"]'))?o.getAttribute("content"):(o=document.querySelector("title"))?o.innerText:void 0,image:(o=document.querySelector('meta[property="og:image"]')||document.querySelector('meta[name="twitter:image"]'))?o.getAttribute("content"):void 0,description:(o=document.querySelector('meta[property="og:description"]')||document.querySelector('meta[name="twitter:description"]')||document.querySelector('meta[name="description"]'))?o.getAttribute("content"):"",ui:{flyout:"top center",button_text:"Share",button_font:!0,icon_font:!0},networks:{google_plus:{enabled:!0,url:null},twitter:{enabled:!0,url:null,description:null},facebook:{enabled:!0,load_sdk:!0,url:null,app_id:null,title:null,caption:null,description:null,image:null},pinterest:{enabled:!0,url:null,image:null,description:null},email:{enabled:!0,title:null,description:null}}},this.setup(t,e),this}return __extends(e,t),e.prototype.setup=function(t,e){var o,n,i,r,s;for(i=document.querySelectorAll(t),this.extend(this.config,e,!0),this.set_global_configuration(),this.normalize_network_configuration(),this.config.ui.icon_font&&this.inject_icons(),this.config.ui.button_font&&this.inject_fonts(),this.config.networks.facebook.enabled&&this.config.networks.facebook.load_sdk&&this.inject_facebook_sdk(),o=r=0,s=i.length;s>r;o=++r)n=i[o],this.setup_instance(t,o)},e.prototype.setup_instance=function(t,e){var o,n,i,r,s,c,l,a,p=this;for(n=document.querySelectorAll(t)[e],this.hide(n),this.add_class(n,"sharer-"+e),n=document.querySelectorAll(t)[e],this.inject_css(n),this.inject_html(n),this.show(n),i=n.getElementsByTagName("label")[0],o=n.getElementsByClassName("social")[0],s=n.getElementsByTagName("li"),this.add_class(o,"networks-"+this.config.enabled_networks),i.addEventListener("click",function(){return p.event_toggle(o)}),p=this,a=[],e=c=0,l=s.length;l>c;e=++c)r=s[e],a.push(r.addEventListener("click",function(){return p.event_network(n,this),p.event_close(o)}));return a},e.prototype.event_toggle=function(t){return this.has_class(t,"active")?this.event_close(t):this.event_open(t)},e.prototype.event_open=function(t){return this.has_class(t,"load")&&this.remove_class(t,"load"),this.add_class(t,"active")},e.prototype.event_close=function(t){return this.remove_class(t,"active")},e.prototype.event_network=function(t,e){var o;return o=e.getAttribute("data-network"),this.hook("before",o,t),this["network_"+o](),this.hook("after",o,t)},e.prototype.open=function(){return this["public"]("open")},e.prototype.close=function(){return this["public"]("close")},e.prototype.toggle=function(){return this["public"]("toggle")},e.prototype["public"]=function(t){var e,o,n,i,r,s,c;for(s=document.querySelectorAll(this.element),c=[],o=i=0,r=s.length;r>i;o=++i)n=s[o],e=n.getElementsByClassName("social")[0],c.push(this["event_"+t](e));return c},e.prototype.network_facebook=function(){return this.config.networks.facebook.load_sdk?window.FB?FB.ui({method:"feed",name:this.config.networks.facebook.title,link:this.config.networks.facebook.url,picture:this.config.networks.facebook.image,caption:this.config.networks.facebook.caption,description:this.config.networks.facebook.description}):console.error("The Facebook JS SDK hasn't loaded yet."):this.popup("https://www.facebook.com/sharer/sharer.php",{u:this.config.networks.facebook.url})},e.prototype.network_twitter=function(){return this.popup("https://twitter.com/intent/tweet",{text:this.config.networks.twitter.description,url:this.config.networks.twitter.url})},e.prototype.network_google_plus=function(){return this.popup("https://plus.google.com/share",{url:this.config.networks.google_plus.url})},e.prototype.network_pinterest=function(){return this.popup("https://www.pinterest.com/pin/create/button",{url:this.config.networks.pinterest.url,media:this.config.networks.pinterest.image,description:this.config.networks.pinterest.description})},e.prototype.network_email=function(){return this.popup("mailto:",{subject:this.config.networks.email.title,body:this.config.networks.email.description})},e.prototype.inject_icons=function(){return this.inject_stylesheet("https://www.sharebutton.co/fonts/v2/entypo.min.css")},e.prototype.inject_fonts=function(){return this.inject_stylesheet("http://fonts.googleapis.com/css?family=Lato:900&text="+this.config.ui.button_text)},e.prototype.inject_stylesheet=function(t){var e;return this.el.head.querySelector('link[href="'+t+'"]')?void 0:(e=document.createElement("link"),e.setAttribute("rel","stylesheet"),e.setAttribute("href",t),this.el.head.appendChild(e))},e.prototype.inject_css=function(t){var e,o,n,i;return n="."+t.getAttribute("class").split(" ").join("."),this.el.head.querySelector("meta[name='sharer"+n+"']")?void 0:(this.config.selector=n,e=getStyles(this.config),i=document.createElement("style"),i.type="text/css",i.styleSheet?i.styleSheet.cssText=e:i.appendChild(document.createTextNode(e)),this.el.head.appendChild(i),delete this.config.selector,o=document.createElement("meta"),o.setAttribute("name","sharer"+n),this.el.head.appendChild(o))},e.prototype.inject_html=function(t){return t.innerHTML="<label class='entypo-export'><span>"+this.config.ui.button_text+"</span></label><div class='social load "+this.config.ui.flyout+"'><ul><li class='entypo-pinterest' data-network='pinterest'></li><li class='entypo-twitter' data-network='twitter'></li><li class='entypo-facebook' data-network='facebook'></li><li class='entypo-gplus' data-network='google_plus'></li><li class='entypo-paper-plane' data-network='email'></li></ul></div>"},e.prototype.inject_facebook_sdk=function(){var t,e;return window.FB||!this.config.networks.facebook.app_id||this.el.body.querySelector("#fb-root")?void 0:(e=document.createElement("script"),e.text="window.fbAsyncInit=function(){FB.init({appId:'"+this.config.networks.facebook.app_id+"',status:true,xfbml:true})};(function(e,t,n){var r,i=e.getElementsByTagName(t)[0];if(e.getElementById(n)){return}r=e.createElement(t);r.id=n;r.src='"+this.config.protocol+"connect.facebook.net/en_US/all.js';i.parentNode.insertBefore(r,i)})(document,'script','facebook-jssdk')",t=document.createElement("div"),t.id="fb-root",this.el.body.appendChild(t),this.el.body.appendChild(e))},e.prototype.hook=function(t,e,o){var n,i;n=this.config.networks[e][t],"function"==typeof n&&(i=n.call(this.config.networks[e],o),void 0!==i&&(i=this.normalize_filter_config_updates(i),this.extend(this.config.networks[e],i,!0),this.normalize_network_configuration()))},e.prototype.set_global_configuration=function(){var t,e,o,n,i,r;i=this.config.networks,r=[];for(e in i){n=i[e];for(o in n)null==this.config.networks[e][o]&&(this.config.networks[e][o]=this.config[o]);this.config.networks[e].enabled?(t="block",this.config.enabled_networks+=1):t="none",r.push(this.config.networks[e].display=t)}return r},e.prototype.normalize_network_configuration=function(){return this.config.networks.facebook.app_id||(this.config.networks.facebook.load_sdk=!1),this.is_encoded(this.config.networks.twitter.description)||(this.config.networks.twitter.description=encodeURIComponent(this.config.networks.twitter.description)),"integer"==typeof this.config.networks.facebook.app_id?this.config.networks.facebook.app_id=this.config.networks.facebook.app_id.toString():void 0},e.prototype.normalize_filter_config_updates=function(t){return this.config.networks.facebook.app_id!==t.app_id&&(console.warn("You are unable to change the Facebook app_id after the button has been initialized. Please update your Facebook filters accordingly."),delete t.app_id),this.config.networks.facebook.load_sdk!==t.load_sdk&&(console.warn("You are unable to change the Facebook load_sdk option after the button has been initialized. Please update your Facebook filters accordingly."),delete t.app_id),t},e}(ShareUtils); return Share;
});



/*! WOW - v0.1.12 - 2014-06-29
* Copyright (c) 2014 Matthieu Aussaguel; Licensed MIT */(function(){var a,b,c,d=function(a,b){return function(){return a.apply(b,arguments)}},e=[].indexOf||function(a){for(var b=0,c=this.length;c>b;b++)if(b in this&&this[b]===a)return b;return-1};b=function(){function a(){}return a.prototype.extend=function(a,b){var c,d;for(c in a)d=a[c],null!=d&&(b[c]=d);return b},a.prototype.isMobile=function(a){return/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(a)},a}(),c=this.WeakMap||this.MozWeakMap||(c=function(){function a(){this.keys=[],this.values=[]}return a.prototype.get=function(a){var b,c,d,e,f;for(f=this.keys,b=d=0,e=f.length;e>d;b=++d)if(c=f[b],c===a)return this.values[b]},a.prototype.set=function(a,b){var c,d,e,f,g;for(g=this.keys,c=e=0,f=g.length;f>e;c=++e)if(d=g[c],d===a)return void(this.values[c]=b);return this.keys.push(a),this.values.push(b)},a}()),a=this.MutationObserver||this.WebkitMutationObserver||this.MozMutationObserver||(a=function(){function a(){console.warn("MutationObserver is not supported by your browser."),console.warn("WOW.js cannot detect dom mutations, please call .sync() after loading new content.")}return a.notSupported=!0,a.prototype.observe=function(){},a}()),this.WOW=function(){function f(a){null==a&&(a={}),this.scrollCallback=d(this.scrollCallback,this),this.scrollHandler=d(this.scrollHandler,this),this.start=d(this.start,this),this.scrolled=!0,this.config=this.util().extend(a,this.defaults),this.animationNameCache=new c}return f.prototype.defaults={boxClass:"wow",animateClass:"animated",offset:0,mobile:!0,live:!0},f.prototype.init=function(){var a;return this.element=window.document.documentElement,"interactive"===(a=document.readyState)||"complete"===a?this.start():document.addEventListener("DOMContentLoaded",this.start),this.finished=[]},f.prototype.start=function(){var b,c,d,e;if(this.stopped=!1,this.boxes=this.element.getElementsByClassName(this.config.boxClass),this.all=function(){var a,c,d,e;for(d=this.boxes,e=[],a=0,c=d.length;c>a;a++)b=d[a],e.push(b);return e}.call(this),this.boxes.length)if(this.disabled())this.resetStyle();else{for(e=this.boxes,c=0,d=e.length;d>c;c++)b=e[c],this.applyStyle(b,!0);window.addEventListener("scroll",this.scrollHandler,!1),window.addEventListener("resize",this.scrollHandler,!1),this.interval=setInterval(this.scrollCallback,50)}return this.config.live?new a(function(a){return function(b){var c,d,e,f,g;for(g=[],e=0,f=b.length;f>e;e++)d=b[e],g.push(function(){var a,b,e,f;for(e=d.addedNodes||[],f=[],a=0,b=e.length;b>a;a++)c=e[a],f.push(this.doSync(c));return f}.call(a));return g}}(this)).observe(document.body,{childList:!0,subtree:!0}):void 0},f.prototype.stop=function(){return this.stopped=!0,window.removeEventListener("scroll",this.scrollHandler,!1),window.removeEventListener("resize",this.scrollHandler,!1),null!=this.interval?clearInterval(this.interval):void 0},f.prototype.sync=function(){return a.notSupported?this.doSync(this.element):void 0},f.prototype.doSync=function(a){var b,c,d,f,g;if(!this.stopped){for(a||(a=this.element),a=a.parentNode||a,f=a.getElementsByClassName(this.config.boxClass),g=[],c=0,d=f.length;d>c;c++)b=f[c],e.call(this.all,b)<0?(this.applyStyle(b,!0),this.boxes.push(b),this.all.push(b),g.push(this.scrolled=!0)):g.push(void 0);return g}},f.prototype.show=function(a){return this.applyStyle(a),a.className=""+a.className+" "+this.config.animateClass},f.prototype.applyStyle=function(a,b){var c,d,e;return d=a.getAttribute("data-wow-duration"),c=a.getAttribute("data-wow-delay"),e=a.getAttribute("data-wow-iteration"),this.animate(function(f){return function(){return f.customStyle(a,b,d,c,e)}}(this))},f.prototype.animate=function(){return"requestAnimationFrame"in window?function(a){return window.requestAnimationFrame(a)}:function(a){return a()}}(),f.prototype.resetStyle=function(){var a,b,c,d,e;for(d=this.boxes,e=[],b=0,c=d.length;c>b;b++)a=d[b],e.push(a.setAttribute("style","visibility: visible;"));return e},f.prototype.customStyle=function(a,b,c,d,e){return b&&this.cacheAnimationName(a),a.style.visibility=b?"hidden":"visible",c&&this.vendorSet(a.style,{animationDuration:c}),d&&this.vendorSet(a.style,{animationDelay:d}),e&&this.vendorSet(a.style,{animationIterationCount:e}),this.vendorSet(a.style,{animationName:b?"none":this.cachedAnimationName(a)}),a},f.prototype.vendors=["moz","webkit"],f.prototype.vendorSet=function(a,b){var c,d,e,f;f=[];for(c in b)d=b[c],a[""+c]=d,f.push(function(){var b,f,g,h;for(g=this.vendors,h=[],b=0,f=g.length;f>b;b++)e=g[b],h.push(a[""+e+c.charAt(0).toUpperCase()+c.substr(1)]=d);return h}.call(this));return f},f.prototype.vendorCSS=function(a,b){var c,d,e,f,g,h;for(d=window.getComputedStyle(a),c=d.getPropertyCSSValue(b),h=this.vendors,f=0,g=h.length;g>f;f++)e=h[f],c=c||d.getPropertyCSSValue("-"+e+"-"+b);return c},f.prototype.animationName=function(a){var b;try{b=this.vendorCSS(a,"animation-name").cssText}catch(c){b=window.getComputedStyle(a).getPropertyValue("animation-name")}return"none"===b?"":b},f.prototype.cacheAnimationName=function(a){return this.animationNameCache.set(a,this.animationName(a))},f.prototype.cachedAnimationName=function(a){return this.animationNameCache.get(a)},f.prototype.scrollHandler=function(){return this.scrolled=!0},f.prototype.scrollCallback=function(){var a;return!this.scrolled||(this.scrolled=!1,this.boxes=function(){var b,c,d,e;for(d=this.boxes,e=[],b=0,c=d.length;c>b;b++)a=d[b],a&&(this.isVisible(a)?this.show(a):e.push(a));return e}.call(this),this.boxes.length||this.config.live)?void 0:this.stop()},f.prototype.offsetTop=function(a){for(var b;void 0===a.offsetTop;)a=a.parentNode;for(b=a.offsetTop;a=a.offsetParent;)b+=a.offsetTop;return b},f.prototype.isVisible=function(a){var b,c,d,e,f;return c=a.getAttribute("data-wow-offset")||this.config.offset,f=window.pageYOffset,e=f+this.element.clientHeight-c,d=this.offsetTop(a),b=d+a.clientHeight,e>=d&&b>=f},f.prototype.util=function(){return this._util||(this._util=new b)},f.prototype.disabled=function(){return!this.config.mobile&&this.util().isMobile(navigator.userAgent)},f}()}).call(this);
