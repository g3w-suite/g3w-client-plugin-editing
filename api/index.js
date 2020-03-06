const API = function({service} = {}) {
  this.addFormComponents = function({layerId, components=[]}= {}) {
    service.addFormComponents({
      layerId,
      components
    });
  };

  this.getSession = function(options = {}) {
    return service.getSession(options)
  };

  this.getFeature = function(options = {}) {
    return service.getFeature(options)
  };

  this.subscribe = function(event, fnc) {
    return service.subscribe(event, fnc);
  };

  this.unsubscribe = function(event, fnc) {
    return service.unsubscribe(event, fnc);
  }
};

export default API;
