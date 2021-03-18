const API = function({service, plugin} = {}) {
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
  };

  this.showPanel = function(options={}){
    const {toolboxes} = options;
    toolboxes && Array.isArray(toolboxes) && service.getToolBoxes().forEach(toolbox => toolbox.setShow(toolboxes.indexOf(toolbox.getId()) !== -1));
    service.getPlugin().showEditingPanel(options);
  };

  this.hidePanel = function(options={}){
    service.getPlugin().hideEditingPanel(options);
  };

  this.startEditing = function(layerId, options={}){
    const toolbox = service.getToolBoxById(layerId);
    return toolbox && toolbox.start(options)
  };

  this.stopEditing = function(layerId, options={}) {
    const toolbox = service.getToolBoxById(layerId);
    return toolbox && toolbox.stop(options);
  };

  //used to reste eventualli state modified by other plugin
  this.resetDefault = function(){
    service.getToolBoxes().forEach(toolbox => toolbox.setShow(true));
  };


};

export default API;
