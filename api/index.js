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
    const {tools, feature} = options;
    return new Promise((resolve, reject) =>{
      const toolbox = service.getToolBoxById(layerId);
      toolbox.setEnablesTools(tools);
      toolbox ? toolbox.start(options).then(opts => {
        const {features} = opts;
        const tool = toolbox.getToolById(tools[0]);
        toolbox.setActiveTool(tool);
        const {inputs, context} = tool.createOperatorOptions({
          features: features.length ? features : [feature]
        });
        if (tool.getId()  === 'editattributes')
          tool.getOperator()._steps[1].run(inputs, context).then(()=>{
            toolbox.getSession().save();
            resolve(toolbox)
          });
        else resolve(toolbox)
      }).fail(err=> reject(err)) : reject(null)
    })
  };

  this.addNewFeature = function(layerId, options={}) {
    return service.addNewFeature(layerId, options);
  };

  this.stopEditing = function(layerId, options={}) {
    const toolbox = service.getToolBoxById(layerId);
    return toolbox && toolbox.stop(options);
  };

  this.commitChanges = function(options={}){
    return service.commit(options);
  };

  //used to reste eventualli state modified by other plugin
  this.resetDefault = function(){
    service.getToolBoxes().forEach(toolbox => {
      toolbox.setEnablesTools();
      toolbox.setShow(true)
    });
  };
};

export default API;
