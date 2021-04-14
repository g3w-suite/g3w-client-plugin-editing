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

  /**
   * Method to start editing api
   * @param layerId
   * @param options
   * @returns {Promise<unknown>}
   */
  this.startEditing = function(layerId, options={}){
    const {tools, feature, startstopediting=true} = options;
    return new Promise((resolve, reject) =>{
      // get toolbox related to layer id
      const toolbox = service.getToolBoxById(layerId);
      // set seletcted toolbox
      service.setSelectedToolbox(toolbox);
      // set enable disable start sto editing toobx
      toolbox.setStartStopEditing(startstopediting);
      //set enables tools
      tools && toolbox.setEnablesTools(tools);
      // start editing toolbox (options contain also filter type)
      toolbox.start(options).then(opts => {
        const {features} = opts;
        // TEMP set first toolbax active
        if (tools){
          const tool = toolbox.getToolById(tools[0]);
          toolbox.setActiveTool(tool);
          // in case of editattributes tool
          if (tool.getId()  === 'editattributes' && feature) {
            // create the operator configuration needed to run a certain step
            const {inputs, context} = tool.createOperatorOptions({
              features: features.length ? features : [feature]
            });
            tool.getOperator().getStep(1).run(inputs, context).then(()=>{
              toolbox.getSession().save();
              resolve(toolbox)
            });
          } else resolve(toolbox)
        } else resolve(toolbox);
      }).fail(err=> reject(err))
    })
  };
  
  /*
  * Save mode editing : 
  * default: each change is save temporary. Press floppy or stoop editing toolbox to save data permanently on database
  * autosave: each change we ahe to commit
  * */
  this.setSaveConfig = function(options={}){
    service.setSaveConfig(options);
  };

  this.addNewFeature = function(layerId, options={}) {
    return service.addNewFeature(layerId, options);
  };

  this.stopEditing = function(layerId, options={}) {
    const toolbox = service.getToolBoxById(layerId);
    return toolbox.stop(options);
  };

  this.commitChanges = function(options={}){
    return service.commit(options);
  };

  //used to reset default toolbox state modified by other plugin
  this.resetDefault = function(){
    service.getToolBoxes().forEach(toolbox => {
      toolbox.setEnablesTools();
      toolbox.setStartStopEditing(true);
      toolbox.setShow(true)
    });
    service.resetDefault();
  };
};

export default API;
