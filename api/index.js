const EasyAddFeatureWorflow = require('../workflows/easyaddfeatureworkflow');
const { Feature } = g3wsdk.core.layer.features;

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

  /**
   * Methos to subscrive editing event
   * @param event
   * @param fnc
   * @returns {Promise<PushSubscription>}
   */
  this.subscribe = function(event, fnc) {
    return service.subscribe(event, fnc);
  };

  /**
   * Method to unsubscrive editing event
   * @param event
   * @param fnc
   * @returns {Promise<PushSubscription>}
   */
  this.unsubscribe = function(event, fnc) {
    return service.unsubscribe(event, fnc);
  };

  /**
   * Show editing panel
   * @param options
   */
  this.showPanel = function(options={}){
    const {toolboxes} = options;
    toolboxes && Array.isArray(toolboxes) && service.getToolBoxes().forEach(toolbox => toolbox.setShow(toolboxes.indexOf(toolbox.getId()) !== -1));
    service.getPlugin().showEditingPanel(options);
  };

  /**
   * Method to hide Editing Panel
   * @param options
   */
  this.hidePanel = function(options={}){
    service.getPlugin().hideEditingPanel(options);
  };

  /**
   * Return Toolbx by id if exist
   * @param toolboxId
   * @returns {*}
   */
  this.getToolBoxById = function(toolboxId){
    return service.getToolBoxById(toolboxId);
  };

  /**
   * Method to start editing api
   * @param layerId
   * @param options
   * @returns {Promise<unknown>}
   */
  this.startEditing = function(layerId, options={}, data=false){
    const {
      tools,
      feature,
      selected=true,
      title,
      disablemapcontrols=false,
      showselectlayers=true
    } = options;
    return new Promise((resolve, reject) =>{
      // get toolbox related to layer id
      const toolbox = service.getToolBoxById(layerId);
      // set show select layers input visibility
      service.setShowSelectLayers(showselectlayers);
      //setselected
      if (toolbox) {
        toolbox.setSelected(selected);
        // set seletcted toolbox
        selected && service.setSelectedToolbox(toolbox);
        title && toolbox.setTitle(title);
        // start editing toolbox (options contain also filter type)
        toolbox.start(options).then(data => {
          //disablemapcontrols in conflict
          disablemapcontrols && service.disableMapControlsConflict(true);
          //opts contain information about start editing has features loaded
          data ? resolve({
            toolbox,
            data
          }) : resolve(toolbox);
        }).fail(err=> {
          reject(err)
        })
      } else reject();
    })
  };
  
  /*
  * Save mode editing : 
  * default: each change it save temporary. Press floppy or stoop editing toolbox to save data permanently on database
  * autosave: each change we ahe to commit
  * */
  this.setSaveConfig = function(options={}){
    service.setSaveConfig(options);
  };

  this.addNewFeature = function(layerId, options={}) {
    return service.addNewFeature(layerId, options);
  };

  /**
   * Method to Stop editing on layerId
   * @param layerId
   * @param options
   * @returns {Promise<unknown>}
   */
  this.stopEditing = function(layerId, options={}) {
    return new Promise((resolve, reject)=>{
      const toolbox = service.getToolBoxById(layerId);
      toolbox.stop(options).then(resolve).fail(reject)
    })
  };

  this.commitChanges = function(options={}){
    return service.commit(options);
  };

  /**
   *   used to reset default toolbox state modified by other plugin
   *
  */
  this.resetDefault = function({plugin=true, toolboxes=true}={}){
    toolboxes && service.getToolBoxes().forEach(toolbox => {
      toolbox.resetDefault();
    });
    plugin && service.resetDefault();
  };

  /**
   * Method to set up permanenty contraints on editing as filter to get features, filter layers to edit etc...
   * @param constraints
   */
  this.setApplicationEditingConstraints = function(constraints={}){
    service.setApplicationEditingConstraints(constraints);
  };

  /**
   *
   */
  this.getMapService = function(){
    return service.getMapService()
  }

  /**
   * @since v3.7 --> g3w-client v3.9
   */
  /**
   * Easy editing feature layer Methods
   * Add, edit, delete no require to ask if save.
   *
   */

  /**
   * Add Feature
   * @param layerId
   * @param feature //
   */
  this.addLayerFeature = function({layerId, feature} ={}) {
    return new Promise((resolve, reject) => {
      //Mandatory params
      if (undefined === feature || undefined === layerId) {
        reject();
        return;
      }
      const layer = service.getLayerById(layerId);
      // get session
      const session = service.getSessionById(layerId);
      const attributes = layer
        .getEditingFields()
        .filter(attribute => !attribute.pk);
      //start session (get no features but set layer in editing)
      session.start({
        filter: {
          nofeatures: true, //no feature
          nofeatures_field: attributes[0].name //get first field in editing form
        },
        editing: true,
      })
      //create workflow
      const workflow = new EasyAddFeatureWorflow({
        push: true,
      });

      try {
        /**
         * @TODO check geometry of feature is equal to layer in editing
         */

        //check if feature has property of layer
        attributes.forEach(a => {
          if (undefined === feature.get(a.name)) {
            feature.set(a.name, null);
          }
        })

        //set feature as g3w feature
        feature = new Feature({
          feature,
          properties: attributes.map(a => a.name)
        });
        //set new
        feature.setTemporaryId();
        //add to session as new feature
        session.pushAdd(layerId, feature, false);
        //need to be added to source
        layer.getEditingLayer()
          .getSource()
          .addFeature(feature);
        //start workflow
        workflow.start({
          inputs: {
            layer,
            features: [feature],
          },
          context: {
            session,
          }
        })
          .then(() => {
            session.save();
            service
              .commit({
                toolbox: service.getToolBoxById(layerId),
                modal: false,
              })
              .then(() => {
                workflow.stop();
                session.stop();
                resolve();
              })
              .fail(reject);
          })
          .fail(reject);
      } catch(err) {
        console.warn(err);
        reject();
      }
    })
  }

  /**
   * Update Feature
   * @param layerId
   * @param featureId
   * @param type type of update: Ex attribute, move, etc ...
   */
  this.updateLayerFeature = function({layerId, featureId, type='attribute'} ={}) {
    //@TODO
  }

  //Delete Feature
  this.deleteLayerFeature = function({layerId, featureId} ={}) {
    //@TODO
  }


};

export default API;
