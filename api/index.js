const API = function({service} = {}) {
  this.addFormComponents = function({layerId, components=[]}= {}) {
    service.addFormComponents({
      layerId,
      components
    });
    return this;
  };
  
  this.getSession = function(options = {}) {
    return service.getSession(options)
  };

  this.getFeature = function(options = {}) {
    return service.getFeature(options)
  }
};

export default API;
