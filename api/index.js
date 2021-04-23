const API = function({service, plugin} = {}) {
  this.addFormComponents = function({layerId, components=[]}= {}) {
    service.addFormComponents({
      layerId,
      components
    });
  };

  this.getEditableLayersId = function(){
    return Object.keys(service.getEditableLayers());
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
    const {tools, feature, selected=true, title, disablemapcontrols=false} = options;
    return new Promise((resolve, reject) =>{
      // get toolbox related to layer id
      const toolbox = service.getToolBoxById(layerId);
      //setselected
      toolbox.setSelected(selected);
      // set seletcted toolbox
      selected && service.setSelectedToolbox(toolbox);
      title && toolbox.setTitle(title);
      // start editing toolbox (options contain also filter type)
      toolbox.start(options).then(opts => {
        //disablemapcontrols in conflict
        disablemapcontrols && service.disableMapControlsConflict(true);
        const {features} = opts;
        resolve(toolbox);
      }).fail(err=> {
        reject(err)
      })
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
    return new Promise((resolve, reject)=>{
      const toolbox = service.getToolBoxById(layerId);
      toolbox.stop(options).then(resolve).fail(reject)
    })
  };

  this.commitChanges = function(options={}){
    return service.commit(options);
  };

  //used to reset default toolbox state modified by other plugin
  this.resetDefault = function(){
    service.getToolBoxes().forEach(toolbox => {
      toolbox.resetDefault();
    });
    service.resetDefault();
  };
};

export default API;
