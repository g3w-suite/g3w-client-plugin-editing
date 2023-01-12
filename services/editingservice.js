import API from '../api'
const {G3W_FID} = g3wsdk.constant;
const {ApplicationState, ApplicationService} = g3wsdk.core;
const {DataRouterService} = g3wsdk.core.data;
const {base, inherit, XHR} = g3wsdk.core.utils;
const { Geometry } = g3wsdk.core.geometry;
const {
  getFeaturesFromResponseVectorApi,
  isSameBaseGeometryType,
} = g3wsdk.core.geoutils;
const {WorkflowsStack} = g3wsdk.core.workflow;
const {PluginService} = g3wsdk.core.plugin;
const {SessionsRegistry} = g3wsdk.core.editing;
const {CatalogLayersStoresRegistry} = g3wsdk.core.catalog;
const {MapLayersStoreRegistry} = g3wsdk.core.map;
const {Layer, LayersStore} = g3wsdk.core.layer;
const {Feature} = g3wsdk.core.layer.features;
const {GUI} = g3wsdk.gui;
const {Server:serverErrorParser}= g3wsdk.core.errors.parsers;
const t = g3wsdk.core.i18n.tPlugin;
const {getScaleFromResolution, getResolutionFromScale} = g3wsdk.ol.utils;
const ToolBoxesFactory = require('../toolboxes/toolboxesfactory');
const CommitFeaturesWorkflow = require('../workflows/commitfeaturesworkflow');
const MAPCONTROL_TOGGLED_EVENT_NAME = 'mapcontrol:toggled';
const OFFLINE_ITEMS = {
  CHANGES: 'EDITING_CHANGES'
};

function EditingService() {
  base(this);
  // contains alla sessions
  this._sessions = {};
  // constraints
  this.constraints = {};
  this._vectorUrl;
  this._projectType;
  // contain array of object setter(as key), key to unby (as value)
  this._unByKeys = [];
  // store setter keys event listerner
  this.setterKeys = [];
  // events
  this._events = {
    layer: {
      start_editing: {
        before: {},
        after: {}
      }
    }
  };
  /**
   * Store unique fields value for each layer
   * @type {{mode: string, messages: undefined, modal: boolean, cb: {error: undefined, done: undefined}}}
   */
  this.layersUniqueFieldsValues = {};

  this.saveConfig = {
    mode: "default", // default, autosave
    modal: false,
    messages: undefined, // object to set custom message
    cb: {
      done: undefined, // function after commit change done
      error: undefined // function after commit chenges error
    }
  };

  //application editing contraints
  //Usefult if some plgin or case we need to setup a editing contrains such as layer, filter to get features
  this.applicationEditingConstraints = {
    toolboxes: {},
    showToolboxesExcluded: true
  };

  // state of editing
  this.state = {
    open: false, // check if panel is open or not
    toolboxes: [],
    toolboxselected: null,
    toolboxidactivetool: null,
    message: null,
    relations: [],
  };

  /**
   */
  this.loadLayersFeaturesToResultWhenCloseEditing = {
    // KEY LAYERID, VALUES ARRAY OF FEATURE FID CHANGES OR ADDED
  };

  this._layers_in_error = false;
  //mapservice
  this._mapService = GUI.getService('map');
  //set mapcontrol toggle event
  this.mapControlToggleEventHandler = evt =>{
    if (evt.target.isToggled() && evt.target.isClickMap()){
      let toolboxselected = this.state.toolboxselected;
      toolboxselected && toolboxselected.getActiveTool() && toolboxselected.stopActiveTool();
    }
  };

  this._mapService.on(MAPCONTROL_TOGGLED_EVENT_NAME, this.mapControlToggleEventHandler);
  //plugin components
  this._formComponents = {};
  this._subscribers = {};
  this.init = function(config={}) {
    this._vectorUrl = config.vectorurl;
    this._projectType = config.project_type;
    this._layersstore = new LayersStore({
      id: 'editing',
      queryable: false
    });
    //add editing layer store to mapstoreregistry
    MapLayersStoreRegistry.addLayersStore(this._layersstore);
    this.config = config;
    this._editableLayers = {};
    this._toolboxes = [];
    this.state.toolboxes = [];
    let layers = this._getEditableLayersFromCatalog();
    const EditableLayersPromises = [];
    for (const layer of layers) {
      // getLayerForEditing return a promise with layer usefult for editing
      EditableLayersPromises.push(layer.getLayerForEditing({
        vectorurl: this._vectorUrl,
        project_type: this._projectType
      }))
    }
    Promise.allSettled(EditableLayersPromises)
      .then(editableLayers  => {
        editableLayers.forEach(promise => {
          const {status, value} = promise;
          if (status === "fulfilled") {
            const editableLayer = value;
            const layerId = editableLayer.getId();
            this._editableLayers[layerId] = editableLayer;
            this._attachLayerWidgetsEvent(editableLayer);
            this._sessions[layerId] = null;
          } else this._layers_in_error = true;
        });
      this._ready();
    })
  };
  this._ready = function() {
    this.registerFeaturesLockByOtherUserSetterHandler();
    // set toolbox colors
    this.setLayersColor();
    // after add layers to layerstore
    this._layersstore.addLayers(this.getLayers());
    // create toolboxes
    this._buildToolBoxes();
    // create a dependencies tree
    this._createToolBoxDependencies();
    //setApi
    this.setApi({
      api: new API({
        service:this
      })
    });
    this.registerResultEditingAction();
    this.emit('ready');
  }
}

inherit(EditingService, PluginService);

const proto = EditingService.prototype;

//api methods

proto.getAppState = function(){
  return ApplicationState;
};

proto.getFormComponentsById = function(layerId) {
  return this._formComponents[layerId] || [];
};

proto.getFormComponents = function() {
  return this._formComponents;
};

proto.addFormComponents = function({layerId, components= []} = {}) {
  if (!this._formComponents[layerId])
    this._formComponents[layerId] = [];
  for (let i=0; i < components.length; i++) {
    const component = components[i];
    this._formComponents[layerId].push(component)
  }
};

proto.getSession = function({layerId} = {}) {
  const toolbox = this.getToolBoxById(layerId);
  return toolbox.getSession();
};

proto.getFeature = function({layerId} = {}) {
  const toolbox = this.getToolBoxById(layerId);
  const tool = toolbox.getActiveTool();
  return tool.getFeature();
};

proto.subscribe = function(event, fnc) {
  if (!this._subscribers[event]) this._subscribers[event] = [];
  if (!this._subscribers[event].find(subscribe => subscribe === fnc)) this._subscribers[event].push(fnc);
  return fnc;
};

proto.unsubscribe = function(event, fnc) {
  this._subscribers[event] = this._subscribers[event].filter(subscribe => subscribe !== fnc);
};

// END API

proto.registerFeaturesLockByOtherUserSetterHandler = function(){
  this.getLayers().forEach(editingLayer =>{
    editingLayer.getFeaturesStore().onafter('featuresLockedByOtherUser', () => {
      GUI.showUserMessage({
        type: 'warning',
        subtitle: editingLayer.getName().toUpperCase(),
        message: 'plugins.editing.messages.featureslockbyotheruser'
      })
    })
  })
};

/**
 * Register result editing action
 */
proto.registerResultEditingAction = function(){
  const queryResultsService = GUI.getService('queryresults');
  this.setterKeys.push({
    setter: 'editFeature',
    key: queryResultsService.onafter('editFeature', ({layer, feature}) => {
      this.editResultLayerFeature({
        layer,
        feature
      })
    })
  });
};

proto.unregisterResultEditingAction = function(){
  const queryResultsService = GUI.getService('queryresults');
  this.setterKeys.forEach(({setter, key}) => queryResultsService.un(setter, key));
};

/**
 * function to start to edit feature selected from results;
 *
 */
proto.editResultLayerFeature = function({layer, feature}={}){
  // get Layer Id
  const layerId = layer.id;
  // get Feature id
  const featureId = feature.attributes[G3W_FID];
  this.getToolBoxes().forEach(toolbox => toolbox.setShow(toolbox.getId() === layerId));
  this.getPlugin().showEditingPanel();
  const toolBox = this.getToolBoxById(layerId);
  //get scale constraint from setting layer
  const {scale} = toolBox.getEditingConstraints();
  // if feature has geometry
  if (feature.geometry) {
    (typeof scale !== "undefined") && this._mapService.getMap().once('moveend', () => {
      const mapUnits = this._mapService.getMapUnits();
      const map = this._mapService.getMap();
      //check current scale after zoom to feature
      const currentScale = parseInt(getScaleFromResolution(map.getView().getResolution(), mapUnits));
      // if currentScale is more that scale constraint set by layer editing
      // need to go to scale setting by layer editing constraint
      if (currentScale > scale) {
        const resolution = getResolutionFromScale(scale, mapUnits);
        map.getView().setResolution(resolution);
      }
    });
  }
  // start toolbox
  toolBox.start({
    filter: {
      fids: featureId // filter by fid (feature id)
    }
  })
    .then(({features=[]}) => {
      const feature = features.find(feature => feature.getId() == featureId);
      if (feature){
        feature.getGeometry() && this._mapService.zoomToGeometry(feature.getGeometry());
        toolBox.setSelected(true);
        const session = toolBox.getSession();
        this.setSelectedToolbox(toolBox);
        const workflow = require('../workflows/editnopickmapfeatureattributesworkflow');
        const options = {
          inputs: {
            layer: toolBox.getLayer(),
            features: [feature]
          },
          context: {
            session
          }
        };
        const editFeatureWorkFlow = new workflow({
          runOnce: true
        });
        editFeatureWorkFlow.start(options)
          .then(() => session.save()
            .then(() => this.saveChange()))
          .fail(()=> session.rollback())
      }
    })
    .fail(err => console.log(err))
};

/**
 *
 */
proto.disableMapControlsConflict = function(bool=true) {
  this._mapService.disableClickMapControls(bool);
};

/**
 * Used on commit if no toolbox is passed as parameter
 * @param toolbox
 */
proto.setSelectedToolbox = function(toolbox){
  this.state.toolboxselected = toolbox;
};

/**
 * 
 */
proto.getToolboxSelected = function(){
  return this.state.toolboxselected;
};

/**
 * 
 */

// create a new feature
proto.addNewFeature = function(layerId, options={}){
  const {geometry, properties} = options;
  const feature = new Feature();
  geometry && feature.setGeometry(new ol.geom[geometry.type](geometry.coordinates));
  feature.setProperties(properties);
  feature.setTemporaryId();
  const toolbox = this.getToolBoxById(layerId);
  const editingLayer = toolbox.getLayer().getEditingLayer();
  const session = toolbox.getSession();
  editingLayer.getSource().addFeature(feature);
  session.pushAdd(layerId, feature, false);
  return feature;
};

proto.getLayersInError = function() {
  return this._layers_in_error;
};

proto.getMapService = function() {
  return this._mapService;
};

proto._initOffLineItems = function() {
  for (const id in OFFLINE_ITEMS) {
    !this.getOfflineItem(OFFLINE_ITEMS[id]) && ApplicationService.setOfflineItem(OFFLINE_ITEMS[id]);
  }
};

proto._handleOfflineChangesBeforeSave = function(data) {
  const changes = ApplicationService.getOfflineItem(OFFLINE_ITEMS.CHANGES);
  const applyChanges = ({layerId, current, previous})=> {
    current[layerId].add = [...previous[layerId].add, ...current[layerId].add];
    current[layerId].delete = [...previous[layerId].delete, ...current[layerId].delete];
    previous[layerId].update.forEach(updateItem => {
      const {id} = updateItem;
      const find = current[layerId].update.find(updateItem => updateItem.id === id);
      !find && current[layerId].update.unshift(updateItem);
    });
    const lockids = previous[layerId].lockids|| [];
    lockids.forEach(lockidItem => {
      const {featureid} = lockidItem;
      const find = current[layerId].lockids.find(lockidItem => lockidItem.featureid === featureid);
      !find && current[layerId].update.unshift(lockidItem);
    })
  };
  for (const layerId in changes) {
    // check if previous changes are made in the same layer or in relationlayer of current
    const current = data[layerId] ? data :
      data[Object.keys(data)[0]].relations[layerId] ?
        data[Object.keys(data)[0]].relations : null;
    if (current)
      applyChanges({
        layerId,
        current,
        previous: changes
      });
    else {
      // check if in the last changes
      const currentLayerId = Object.keys(data)[0];
      const relationsIds = Object.keys(changes[layerId].relations);
      if (relationsIds.length) {
        if (relationsIds.indexOf(currentLayerId) !== -1) {
          applyChanges({
            layerId: currentLayerId,
            current: data,
            previous: changes[layerId].relations
          });
          changes[layerId].relations[currentLayerId] = data[currentLayerId];
          data = changes;
        }
      } else data[layerId] = changes[layerId];
    }
  }
  return data;
};

proto.saveOfflineItem = function({id, data}={}) {
  if (id === OFFLINE_ITEMS.CHANGES) data = this._handleOfflineChangesBeforeSave(data);
  return ApplicationService.setOfflineItem(id, data);
};

proto.setOfflineItem = function(id, data){
  ApplicationService.setOfflineItem(id, data);
};

proto.getOfflineItem = function(id){
  return ApplicationService.getOfflineItem(id);
};

/**
 * Check if alread have off lines changes
 * @param modal
 * @returns {Promise<unknown>}
 */
proto.checkOfflineChanges = function({modal=true, unlock=false}={}) {
  return new Promise((resolve, reject) => {
    const changes = ApplicationService.getOfflineItem(OFFLINE_ITEMS.CHANGES);
    // if find changes offline previously
    if (changes) {
      const promises = [];
      const layerIds = [];
      //FORCE TO WAIT OTHERWISE STILL OFF LINE
      setTimeout(()=>{
        for (const layerId in changes) {
          layerIds.push(layerId);
          const toolbox = this.getToolBoxById(layerId);
          const commitItems = changes[layerId];
          promises.push(this.commit({
            toolbox,
            commitItems,
            modal
          }))
        }
        $.when.apply(this, promises)
          .then(() =>resolve())
          .fail(error=>reject(error))
          .always(() =>{
            unlock && layerIds.forEach(layerId => {
              this.getLayerById(layerId).unlock()
            });
            // always reset items to null
            this.setOfflineItem(OFFLINE_ITEMS.CHANGES);
          })
      }, 1000)

    }
  })
};

/**
 * called by Editng Panel on creation time
 */
proto.registerOnLineOffLineEvent = function() {
  // in case of starting panel editing check if there arae some chenging pending
  // if true i have to commit chanhes on server and ulock all layers features temporary locked
  if (ApplicationState.online) this.checkOfflineChanges({
    unlock: true
  });
  const offlineKey =  ApplicationService.onafter('offline', ()=>{});
  const onlineKey = ApplicationService.onafter('online', () =>{
    this.checkOfflineChanges({
      modal:false
    }).then(()=>{
    }).catch(error =>GUI.notify.error(error))
  });

  this._unByKeys.push({
    owner : ApplicationService,
    setter: 'offline',
    key: offlineKey
  });

  this._unByKeys.push({
    owner : ApplicationService,
    setter: 'online',
    key: onlineKey
  });

};

proto.unregisterOnLineOffLineEvent = function() {
  this.unregisterSettersEvents(['online', 'offline'])
};

proto.unregisterSettersEvents = function(setters=[]) {
  this._unByKeys.forEach(registered => {
    const {owner, setter, key} = registered;
    owner.un(setter, key);
  })
};

proto.fireEvent = function(event, options={}) {
  return new Promise(resolve => {
    this._subscribers[event] && this._subscribers[event].forEach(fnc => {
      const response = fnc(options);
      response && response.once && this.unsubscribe(event, fnc);
    });
    resolve();
  });
};

proto.activeQueryInfo = function() {
  this._mapService.activeMapControl('query');
};

proto.setLayersColor = function() {

  const LAYERS_COLOR = [
    "#C43C39",
    '#d95f02',
    "#91522D",
    "#7F9801",
    "#0B2637",
    "#8D5A99",
    "#85B66F",
    "#8D2307",
    "#2B83BA",
    "#7D8B8F",
    "#E8718D",
    "#1E434C",
    "#9B4F07",
    '#1b9e77',
    "#FF9E17",
    '#7570b3',
    "#204B24",
    "#9795A3",
    "#C94F44",
    "#7B9F35",
    "#373276",
    "#882D61",
    "#AA9039",
    "#F38F3A",
    "#712333",
    "#3B3A73",
    "#9E5165",
    "#A51E22",
    "#261326",
    "#e4572e",
    "#29335c",
    "#f3a712",
    "#669bbc",
    "#eb6841",
    "#4f372d",
    "#cc2a36",
    "#00a0b0",
    "#00b159",
    "#f37735",
    "#ffc425",
  ];

  for (const layer of this.getLayers()) {
    !layer.getColor() ? layer.setColor(LAYERS_COLOR.splice(0,1)[0]): null;
  }
};

proto._layerChildrenRelationInEditing = function(layer) {
  let relations = layer.getChildren();
  const childrenrealtioninediting = relations.filter(relation => this.getLayerById(relation));
  return childrenrealtioninediting;
};

/**
 * Undo method
 */
proto.undo = function(){
  const session = this.state.toolboxselected.getSession();
  const layerId = session.getId();
  const sessionItems = session.getLastHistoryState().items;
  this.undoRedoLayerUniqueFieldValues({
    layerId,
    sessionItems,
    action: 'undo'
  });
  const undoItems = session.undo();

  this.undoRedoRelationUniqueFieldValues({
    relationSessionItems: undoItems,
    action: 'undo'
  });

  this.undoRelations(undoItems);
};

// undo relations
proto.undoRelations = function(undoItems) {
  Object.entries(undoItems).forEach(([toolboxId, items]) => {
    const toolbox = this.getToolBoxById(toolboxId);
    const session = toolbox.getSession();
    session.undo(items);
  })
};

// undo relations
proto.rollbackRelations = function(rollbackItems) {
  Object.entries(rollbackItems).forEach(([toolboxId, items]) => {
    const toolbox = this.getToolBoxById(toolboxId);
    const session = toolbox.getSession();
    session.rollback(items);
  })
};

/**
 *  method
 */
proto.redo = function(){
  const session = this.state.toolboxselected.getSession();
  const layerId = session.getId();
  const sessionItems = session.getLastHistoryState().items;
  this.undoRedoLayerUniqueFieldValues({
    layerId,
    sessionItems,
    action: 'redo'
  });
  const redoItems = session.redo();

  this.undoRedoRelationUniqueFieldValues({
    relationSessionItems: redoItems,
    action: 'redo'
  });

  this.redoRelations(redoItems);
};

// redo relations
proto.redoRelations = function(redoItems) {
  Object.entries(redoItems).forEach(([toolboxId, items]) => {
    const toolbox = this.getToolBoxById(toolboxId);
    const session = toolbox.getSession();
    session.redo(items);
  })
};

proto.getEditingLayer = function(id) {
  return this._editableLayers[id].getEditingLayer();
};

/**
 * options contain eventually editing type (create/update/delete)
 * @param options
 * @private
 */
proto._buildToolBoxes = function(options={}) {
  for (const layer of this.getLayers()) {
    const toolbox = ToolBoxesFactory.build(layer, options);
    this.addToolBox(toolbox);
  }
};

proto.addToolBox = function(toolbox) {
  this._toolboxes.push(toolbox);
  // add session
  this._sessions[toolbox.getId()] = toolbox.getSession();
  this.state.toolboxes.push(toolbox.state);
};

//** Method to set state in editing 
proto.setOpenEditingPanel = function(bool){
  this.state.open = bool;
  this._getEditableLayersFromCatalog().forEach(layer => layer.setInEditing(bool));
};

/*
* Add event
* @param {String} type - Event Type
* @param
* */
proto.addEvent = function({type, id, fnc}={}) {
  if (!this._events[type]) this._events[type] = {};
  if (!this._events[type][id]) this._events[type][id] = [];
  this._events[type][id].push(fnc);
};

/*
* Add event
* @param {String} type - Event Type
* @param
* */
proto.addEvents = function({types=[], id, fnc}={}) {
  types.forEach(type => this.addEvent({
    type,
    id, 
    fnc
  }));
};

proto.runEventHandler = function({type, id} = {}) {
  this._events[type] && this._events[type][id] && this._events[type][id].forEach(fnc => fnc());
};

/**
 *
 * @param mode -  default or autosave
 * @param cb object contain done/error two functions
 * @param modal - Boolean true or false to show to ask
 * @param messages - object success or error
 */
proto.setSaveConfig = function({mode = 'default', cb={}, modal=false, messages}={}){
  this.saveConfig.mode = mode;
  this.saveConfig.modal = modal;
  this.saveConfig.messages = messages;
  this.saveConfig.cb = {
    ...this.saveConfig.cb,
    ...cb
  }
};

//return save mode
proto.getSaveConfig = function(){
  return this.saveConfig;
};

/**
 * Reset default values
 */
proto.resetDefault = function(){
  this.saveConfig = {
    mode: "default", // default, autosave
    modal: false,
    messages: null, // object to set custom message
    cb: {
      done: null, // function Called after save
      error: null, // function called affte commit error
    }
  };
  this.disableMapControlsConflict(false);
};

proto._attachLayerWidgetsEvent = function(layer) {
  const fields = layer.getEditingFields();
  for (let i=0; i < fields.length; i++) {
    const field = fields[i];
    if (field.input) {
      if (field.input.type === 'select_autocomplete' && !field.input.options.filter_expression) {
        const options = field.input.options;
        let {key, values, value, usecompleter, layer_id, loading} = options;
        const self = this;
        if (!usecompleter) {
          this.addEvents({
            types: ['start-editing', 'show-relation-editing'],
            id: layer.getId(),
            fnc() {
              // remove all values
              loading.state = 'loading';
              field.input.options.values = [];
              const relationLayer = CatalogLayersStoresRegistry.getLayerById(layer_id);
              if (relationLayer) {
                if (relationLayer) {
                  relationLayer.getDataTable({
                    ordering: key
                  }).then(response => {
                    if (response && response.features) {
                      const features = response.features;
                      self.fireEvent('autocomplete', {
                        field,
                        features
                      });
                      for (let i = 0; i < features.length; i++) {
                        field.input.options.values.push({
                          key: features[i].properties[key],
                          value: features[i].properties[value]
                        })
                      }
                      loading.state = 'ready';
                    }
                  }).fail(error => {
                    loading.state = 'error'
                  });
                } else {
                  loading.state = 'error'
                }
              } else {
                self.fireEvent('autocomplete', {
                  field,
                  features: []
                });
                loading.state = 'ready';
              }
            }
          })
        }
      }
    }
  }
};

proto._createToolBoxDependencies = function() {
  this._toolboxes.forEach(toolbox => {
    const layer = toolbox.getLayer();
    toolbox.setFather(layer.isFather());
    toolbox.state.editing.dependencies = this._getToolBoxEditingDependencies(layer);
    if (layer.isFather() && toolbox.hasDependencies() ) {
      const layerRelations = layer.getRelations().getRelations();
      for (const relationName in layerRelations) {
        const relation = layerRelations[relationName];
        toolbox.addRelation(relation);
      }
    }
  })
};

/**
 * Check if field of layer is required
 * @param layerId
 * @param fieldName
 * @returns {*}
 */
proto.isFieldRequired = function(layerId, fieldName) {
  return this.getLayerById(layerId).isFieldRequired(fieldName);
};

proto._getToolBoxEditingDependencies = function(layer) {
  let relationLayers = [...layer.getChildren(), ...layer.getFathers()];
  return relationLayers.filter((layerName) => {
    return !!this.getLayerById(layerName);
  });
};

proto._hasEditingDependencies = function(layer) {
  let toolboxesIds = this._getToolBoxEditingDependencies(layer);
  return !!toolboxesIds.length;
};

proto.handleToolboxDependencies = function(toolbox) {
  let dependecyToolBox;
  if (toolbox.isFather()) this.getLayersDependencyFeatures(toolbox.getId());
  toolbox.getDependencies().forEach(toolboxId => {
    dependecyToolBox = this.getToolBoxById(toolboxId);
    dependecyToolBox.setEditing(false);
  })
};

proto._getEditableLayersFromCatalog = function() {
  let layers = CatalogLayersStoresRegistry.getLayers({
    EDITABLE: true
  });
  return layers;
};

proto.getLayers = function() {
  return Object.values(this._editableLayers);
};

proto.getCurrentWorkflow = function() {
  return WorkflowsStack.getCurrent();
};

proto.getCurrentWorkflowData = function() {
  const currentWorkFlow = WorkflowsStack.getCurrent();
  return {
    session: currentWorkFlow.getSession(),
    inputs: currentWorkFlow.getInputs(),
    context: currentWorkFlow.getContext(),
    feature: currentWorkFlow.getCurrentFeature(),
    layer: currentWorkFlow.getLayer()
  };
};

proto.getRelationsAttributesByFeature = function({layerId, relation, feature}={}) {
  const layer = this.getToolBoxById(layerId).getLayer();
  const relations = this.getRelationsByFeature({layerId, relation, feature});
  return relations.map(relation => {
    return {
      fields: layer.getFieldsWithValues(relation, {
        relation: true
      }),
      id: relation.getId()
    };
  });
};

proto._getRelationLayerId = function({layerId, relation}={}){
  return relation.getChild() === layerId ? relation.getFather() : relation.getChild();
};

proto.getRelationsByFeature = function({layerId, relation, feature, layerType}={}) {
  const {ownField, relationField} = this._getRelationFieldsFromRelation({
    layerId,
    relation
  });
  const featureValue = feature.get(relationField);
  const features = this._getFeaturesByLayerId(layerId);
  return features.filter(feature => feature.get(ownField) == featureValue);
};

proto.registerLeavePage = function(bool){
  ApplicationService.registerLeavePage({
    bool
  });
};

proto.loadPlugin = function() {
  return this._load = !!this._getEditableLayersFromCatalog().length;
};

proto.getLayerById = function(layerId) {
  return this._editableLayers[layerId];
};

proto.beforeEditingStart = function({layer} = {}) {
  this._checkLayerWidgets(layer);
};

proto.afterEditingStart = function({layer}= {}) {
  //TODO
};

proto.getToolBoxById = function(toolboxId) {
  return this._toolboxes.find(toolbox => toolbox.getId() === toolboxId);
};

/**
 * Method to apply filter editing contsraint to toolbox editing 
 * @param constinst
 */
proto.setApplicationEditingConstraints = function(constraints={showToolboxesExcluded: true, toolboxes:{}}){
  this.applicationEditingConstraints = {
    ...this.applicationEditingConstraints,
    ...constraints
  };
  
  const {toolboxes, showToolboxesExcluded} = constraints;
  const toolboxIds = Object.keys(toolboxes);
  !showToolboxesExcluded && this.state.toolboxes.forEach(toolbox => toolbox.show =  toolboxIds.indexOf(toolbox.id) !== -1);
  toolboxIds.forEach(toolboxId => {
    const toolbox = this.getToolBoxById(toolboxId);
    toolbox.setEditingConstraints(toolboxes[toolboxId]);
  });
};

/**
 * Get application editing contraints if applied
 */

proto.getApplicationEditingConstraints = function(){
  return this.applicationEditingConstraints;
};

/**
 *
 */

proto.getApplicationEditingConstraintById = function(toolboxId){
  return this.applicationEditingConstraints.toolboxes[toolboxId];
};

proto.getToolBoxes = function() {
  return this._toolboxes;
};

proto.getEditableLayers = function() {
  return this._editableLayers;
};

proto._cancelOrSave = function(){
  return resolve();
};

proto.stop = function() {
  return new Promise((resolve, reject) => {
    const commitpromises = [];
    this._toolboxes.forEach(toolbox => {
      // check if temp changes are waiting to save on server
      if (toolbox.getSession().getHistory().state.commit) {
        // ask to commit before exit
        commitpromises.push(this.commit(toolbox, true));
      }
    });
    $.when.apply(this, commitpromises)
      .always(() => {
        this._toolboxes.forEach(toolbox => toolbox.stop());
        this.clearState();
        //this.activeQueryInfo();
        this._mapService.refreshMap();
        resolve();
    });
  });
};

// remove Editing LayersStore
proto.clear = function() {
  MapLayersStoreRegistry.removeLayersStore(this._layersstore);
  SessionsRegistry.clear();
  //turn off events
  this._mapService.off(MAPCONTROL_TOGGLED_EVENT_NAME, this.mapControlToggleEventHandler);
  this.unregisterResultEditingAction();
};

proto.clearState = function() {
  this.state.toolboxselected = null;
  this.state.toolboxidactivetool =  null;
  this.state.message =  null;
};

/**
 * Get Relation in editing
 * @param layerId
 * @param relations
 * @param feature
 * @returns {[]}
 */
proto.getRelationsInEditing = function({layerId, relations=[], feature}={}) {
  let relationsinediting = [];
  let relationinediting;
  relations.forEach(relation => {
    const relationLayerId = this._getRelationLayerId({layerId, relation});
    if (this.getLayerById(relationLayerId)) {
      relationinediting = {
        relation: relation.getState(),
        relations: this.getRelationsAttributesByFeature({
          layerId: relationLayerId,
          relation,
          feature
        })
      };
      relationinediting.validate = {
        valid:true
      };
      relationsinediting.push(relationinediting);
    }
  });
  return relationsinediting;
};

proto._filterRelationsInEditing = function({layerId, relations=[]}) {
  return relations.filter(relation => {
    const relationId = this._getRelationId({
      layerId,
      relation
    });
    return this.getToolBoxById(relationId)
  })
};

proto.stopToolboxesChildren = function(layerId){
  const layer = this.getLayerById(layerId);
  const relations = this._filterRelationsInEditing({
    relations: layer.getRelations() ? layer.getRelations().getArray() : [],
    layerId
  });
  relations
    .filter(relation => relation.getFather() === layerId)
    .forEach(relation => {
      const relationId = this._getRelationId({
        layerId,
        relation
      });
      this.getToolBoxById(relationId).inEditing() && this.getToolBoxById(relationId).stop();
    })
};

proto.stopSessionChildren = function(layerId) {
  const layer = this.getLayerById(layerId);
  const relations = this._filterRelationsInEditing({
    relations: layer.getRelations() ? layer.getRelations().getArray() : [],
    layerId
  });
  relations
    .filter(relation => relation.getFather() === layerId)
    .forEach(relation => {
      const relationId = this._getRelationId({
        layerId,
        relation
      });
      // In case of no editing is started (click on pencil of relation layer) need to stop (unlock) features
      if (!this.getToolBoxById(relationId).inEditing()) {
        this._sessions[relationId].stop();
      }
    })
};

proto.fatherInEditing = function(layerId) {
  let inEditing = false;
  let toolbox;
  let relationLayerFathers = this.getLayerById(layerId).getFathers();
  relationLayerFathers.forEach(id => {
    toolbox = this.getToolBoxById(id);
    if (toolbox && toolbox.inEditing()) {
      inEditing = true;
      return false;
    }
  });
  return inEditing;
};

proto._getRelationFieldsFromRelation = function({layerId, relation} = {}) {
  const childId = relation.getChild ? relation.getChild() : relation.child;
  const isChild = childId !== layerId;
  const _fatherField = relation.getFatherField ? relation.getFatherField() : relation.fatherField;
  const _childField = relation.getChildField ? relation.getChildField() : relation.childField;
  const ownField = isChild ? _fatherField : _childField;
  const relationField = isChild ? _childField : _fatherField;
  return {
    ownField,
    relationField
  }
};

proto.createEditingDataOptions = function(filterType='all', options={}) {
  const {feature, relation, field, layerId, operator} = options;
  let filter;
  switch (filterType) {
    //case all leave filter undefined
    case 'all':
    break;
    case 'bbox':
      filter = {
        bbox: this._mapService.getMapBBOX()
      };
      break;
    case 'field': // case of field
      filter = {
        field: {
          field,
          type: 'editing'
        }
      };
      break;
    case 'fid':
      // case to get relations of current feature
      if (operator !== 'not')
        filter = {
          fid: {
            fid: feature.getId(),
            layer: {
              id: layerId
            },
            type: 'editing',
            relation: relation.state,
            formatter: 0 //add formatter 0 to get stored value
          }
        };
      break;
  }
  return {
    registerEvents: true, // usefult to get register vent on toolbox example mapmoveend
    editing: true,
    filter
  }
};

proto._getFeaturesByLayerId = function(layerId) {
  return this.getLayerById(layerId).readEditingFeatures();
};

proto.getLayersDependencyFeaturesFromSource = function({layerId, relation, feature, operator='eq'}={}){
  return new Promise(resolve => {
    const features = this._getFeaturesByLayerId(layerId);
    const {ownField, relationField} = this._getRelationFieldsFromRelation({
      layerId,
      relation
    });
    const featureValue = feature.get(relationField);
    const find = operator === 'eq' ? features.find(featureSource => {
      const featureSourceValue = featureSource.get(ownField) ;
      return featureSourceValue == featureValue;
    }): false;
    resolve(find);
  })
};

proto._getRelationId = function({layerId, relation}={}) {
  const fatherId = relation.getFather ? relation.getFather() : relation.father;
  const childId = relation.getChild ? relation.getChild() : relation.child;
  return fatherId === layerId ? childId: fatherId;
};

proto.getLayersDependencyFeatures = function(layerId, opts={}) {
  const promises = [];
  const layer = this.getLayerById(layerId);
  const relations = opts.relations ? opts.relations : layer.getChildren().length && layer.getRelations() ? this._filterRelationsInEditing({
    relations: layer.getRelations().getArray().filter(relation => relation.getFather() === layerId),
    layerId
  }) : [];
  const online = ApplicationState.online;
  relations.forEach(relation => {
    if (relation.setLoading) relation.setLoading(true);
    else relation.loading = true;
    const id = this._getRelationId({
      layerId,
      relation
    });
    const promise = new Promise(resolve => {
      const filterType = opts.filterType || 'fid';
      opts.relation = relation;
      opts.layerId = layerId;
      const options = this.createEditingDataOptions(filterType, opts);
      const session = this._sessions[id];
      const toolbox = this.getToolBoxById(id);
      if (online && session) {
        toolbox.startLoading();
        if (!session.isStarted())
          session.start(options)
            .always((promise) => {
              promise.always(()=>{
                toolbox.stopLoading();
                resolve(id);
              })
            });
        else {
          this.getLayersDependencyFeaturesFromSource({
            layerId: id,
            relation,
            feature: opts.feature,
            operator: opts.operator
          }).then(find =>{
            if (find) {
              resolve(id);
              toolbox.stopLoading();
            } else {
              session.getFeatures(options).always(promise => {
                promise.always(()=>{
                  toolbox.stopLoading();
                  resolve(id);
                });
              });
            }
          })
        }
      } else {
        this.getLayersDependencyFeaturesFromSource({
          layerId: id,
          relation,
          feature: opts.feature,
          operator: opts.operator
        }).then(()=>resolve(id))
      }
    });
    promises.push(promise);
  });
  // at the end se loading false
  Promise.all(promises).finally(()=> relations.forEach(relation => {
    if (relation.setLoading) relation.setLoading(false);
    else relation.loading = false;
  }));
  return Promise.all(promises);
};

proto.commitDirtyToolBoxes = function(layerId) {
  return new Promise(resolve => {
    const toolbox = this.getToolBoxById(layerId);
    const children = this.getLayerById(layerId).getChildren();
    if (toolbox.isDirty() && toolbox.hasDependencies()) {
      this.commit(toolbox)
        .fail(() => {
          toolbox.revert()
            .then(() => {
              toolbox.getDependencies().forEach((layerId) => {
                children.indexOf(layerId) !== -1 && this.getToolBoxById(layerId).revert();
              })
            })
        })
        .always(() => resolve(toolbox))
    } else
      resolve(toolbox);
  });
};

proto._createCommitMessage = function(commitItems) {
  function create_changes_list_dom_element(add, update, del) {
    const changeIds = {};
    changeIds[`${t('editing.messages.commit.add')}`] = add.length;
    changeIds[`${t('editing.messages.commit.update')}`] = `[${update.map((item)=> item.id).join(',')}]`;
    changeIds[`${t('editing.messages.commit.delete')}`] = `[${del.join(',')}]`;
    let dom = `<h4>${t('editing.messages.commit.header')}</h4>`;
    dom+=`<h5>${t('editing.messages.commit.header_add')}</h5>`;
    dom+=`<h5>${t('editing.messages.commit.header_update_delete')}</h5>`;
    dom+= `<ul style='border-bottom-color: #f4f4f4;'>`;
    Object.entries(changeIds).forEach(([action, ids]) => {
      dom += `<li>${action} : ${ids} </li>`;
    });
    dom += `</ul>`;
    return dom;
  }

  let message = "";
  message += create_changes_list_dom_element(commitItems.add, commitItems.update, commitItems.delete);
  if (!_.isEmpty(commitItems.relations)) {
    message += "<div style='height:1px; background:#f4f4f4;border-bottom:1px solid #f4f4f4;'></div>";
    message += "<div style='margin-left: 40%'><h4>"+ t('editing.relations') +"</h4></div>";
    Object.entries(commitItems.relations).forEach(([ relationName, commits]) => {
      message +=  "<div><span style='font-weight: bold'>" + relationName + "</span></div>";
      message += create_changes_list_dom_element(commits.add, commits.update, commits.delete);
    })
  }
  return message;
};

proto.showCommitModalWindow = function({layer, commitItems, close, commitPromise}) {
  // messages set to commit
  const messages = {
    success: {
      message: "plugins.editing.messages.saved",
      autoclose: true
    },
    error: {}
  };

  return new Promise((resolve, reject) =>{
    const workflow = new CommitFeaturesWorkflow({
      type: 'commit'
    });
    workflow.start({
      inputs: {
        layer,
        message: this._createCommitMessage(commitItems),
        close
      }
    })
      .then(() => {
        const dialog = GUI.dialog.dialog({
          message: `<h4 class="text-center"><i style="margin-right: 5px;" class=${GUI.getFontClass('spinner')}></i>${t('editing.messages.saving')}</h4>`,
          closeButton: false
        });
        resolve(messages);
        commitPromise.always(()=>dialog.modal('hide')) // hide saving dialog
      })
      .fail(error => reject(error))
      .always(()=> workflow.stop())
  })
};

/**
 * Functioncalled very single change saved temporary
 */
proto.saveChange = async function() {
  switch (this.saveConfig.mode) {
    case 'autosave':
      return this.commit({
        modal: false // set to not show modal ask window
      });
  }
};

proto.addLayersFeaturesToShowOnResult = function({layerId, fids=[]}){
  if (this.loadLayersFeaturesToResultWhenCloseEditing[layerId] === undefined)
    this.loadLayersFeaturesToResultWhenCloseEditing[layerId] = new Set();
  fids.forEach(fid => this.loadLayersFeaturesToResultWhenCloseEditing[layerId].add(fid))
};

/**
 * Called on close editingpanel panel
 */
proto.onCloseEditingPanel = async function(){
  await this.showChangesToResult();
  this.getToolBoxes().forEach(toolbox => toolbox.resetDefault());
};

/**
 *
 * Method to show feature that are updated or created with editing on result content
 * @returns {Promise<void>}
 */
proto.showChangesToResult = async function(){
  const layerIdChanges = Object.keys(this.loadLayersFeaturesToResultWhenCloseEditing);
  if (layerIdChanges.length) {
    const inputs = {
      layers: [],
      fids: [],
      formatter: 1
    };
    layerIdChanges.forEach(layerId => {
      const fids = [...this.loadLayersFeaturesToResultWhenCloseEditing[layerId]];
      if (fids.length) {
        const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
        inputs.layers.push(layer);
        inputs.fids.push(fids);
      }
    });
    const promise = inputs.layers.length ? DataRouterService.getData('search:layersfids', {
      inputs,
      outputs: {
        title: 'plugins.editing.editing_changes',
        show: {
          loading: false
        }
      }
    }) : Promise.resolve();
    try {
      await promise;
    } catch(err) {}
  }
  this.loadLayersFeaturesToResultWhenCloseEditing = {};
};

/**
 * Metyhod to commit and save changes on server persistently
 *
 * @param toolbox
 * @param commitItems
 * @param messages
 * @param done
 * @param modal
 * @param close
 * @returns {*}
 */
proto.commit = function({toolbox, commitItems, modal=true, close=false}={}) {
  const d = $.Deferred();
  const commitPromise = d.promise();
  const { cb={}, messages={success:{}, error:{}} } = this.saveConfig;
  toolbox = toolbox || this.state.toolboxselected;
  let session = toolbox.getSession();
  let layer = toolbox.getLayer();
  const layerType = layer.getType();
  const items = commitItems;
  commitItems = commitItems || session.getCommitItems();
  const {add=[], delete:cancel=[], update=[], relations={}} = commitItems;
  if ([...add, ...cancel, ...update, ...Object.keys(relations)].length === 0) {
    GUI.showUserMessage({
      type: 'info',
      message: 'Nothing to save',
      autoclose: true,
      closable: false
    });
    d.resolve(toolbox);
    return d.promise();
  }
  const promise = modal ? this.showCommitModalWindow({
    layer,
    commitItems,
    close,
    commitPromise // add a commit promise
  }) : Promise.resolve(messages);
  promise
    .then(messages => {
    if (ApplicationState.online) {
      session.commit({items: items || commitItems})
        .then((commitItems, response) => {
          if (ApplicationState.online) {
            if (response.result) {
              const {autoclose=true, message="plugins.editing.messages.saved"} = messages.success;
              if (messages && messages.success) GUI.showUserMessage({
                type: 'success',
                message,
                duration: 3000,
                autoclose
              });
              layerType === Layer.LayerTypes.VECTOR && this._mapService.refreshMap({force: true});
              cb.done && cb.done instanceof Function && cb.done(toolbox);
              this.addLayersFeaturesToShowOnResult({
                layerId: toolbox.getId(),
                fids: [...response.response.new.map(({id}) => id), ...commitItems.update.map(update => update.id)]
              });
            } else {
              const parser = new serverErrorParser({
                error: response.errors
              });
              const errorMessage = parser.parse({
                type: 'String'
              });
              const {autoclose=false, message} = messages.error;
              GUI.showUserMessage({
                type: 'alert',
                message: message || errorMessage,
                textMessage: !message,
                autoclose
              });
              cb.error && cb.error instanceof Function && cb.error(toolbox, message || errorMessage);
            }
            d.resolve(toolbox);
          }
        })
        .fail((error={}) => {
          const parser = new serverErrorParser({
            error: error.errors ? error.errors : error
          });
          const errorMessage = parser.parse({
            type: 'String'
          });
          const {autoclose = false, message} = messages.error;
          GUI.showUserMessage({
            type: 'alert',
            message: message || errorMessage,
            textMessage: !message,
            autoclose
          });
          d.reject(toolbox);
          cb.error && cb.error instanceof Function && cb.error(toolbox, message || errorMessage);
        });
      //case offline
    } else this.saveOfflineItem({
            data: {
              [session.getId()]: commitItems
            },
            id: OFFLINE_ITEMS.CHANGES
          }).then(() =>{
            GUI.showUserMessage({
              type: 'success',
              message: "plugins.editing.messages.saved_local",
              autoclose: true
            });
            session.clearHistory();
            d.resolve(toolbox);
          }).catch(error=>{
            GUI.showUserMessage({
              type: 'alert',
              message: error,
              textMessage: true,
            });
            d.reject(toolbox);
          })
    })
    .catch(() => {
      d.reject(toolbox)
  });
  return commitPromise;
};

/**
 * Unique field layer values handler
 */

proto.clearAllLayersUniqueFieldsValues = function(){
  this.layersUniqueFieldsValues = {};
};

proto.clearLayerUniqueFieldsValues = function(layerId){
  this.layersUniqueFieldsValues[layerId] = {};
};

proto.removeLayerUniqueFieldValuesFromFeature = function({layerId, feature}) {
  if (this.layersUniqueFieldsValues[layerId]) {
    Object.keys(feature.getProperties()).forEach(property =>{
      if (typeof this.layersUniqueFieldsValues[layerId][property] !== "undefined")
        this.layersUniqueFieldsValues[layerId][property].delete(feature.get(property));
    })
  }
};

proto.removeRelationLayerUniqueFieldValuesFromFeature = function({layerId, relationLayerId, feature}) {
  if (typeof this.layersUniqueFieldsValues[relationLayerId].__uniqueFieldsValuesRelations === "undefined")
    this.layersUniqueFieldsValues[relationLayerId].__uniqueFieldsValuesRelations = {};
  Object.keys(feature.getProperties()).forEach(property =>{
    if (typeof this.layersUniqueFieldsValues[relationLayerId].__uniqueFieldsValuesRelations[layerId] === "undefined")
      this.layersUniqueFieldsValues[relationLayerId].__uniqueFieldsValuesRelations[layerId] = {};
    if (typeof this.layersUniqueFieldsValues[layerId][property] !== "undefined") {
      this.layersUniqueFieldsValues[relationLayerId].__uniqueFieldsValuesRelations[layerId][property] = new Set(this.layersUniqueFieldsValues[layerId][property]);
      this.layersUniqueFieldsValues[relationLayerId].__uniqueFieldsValuesRelations[layerId][property].delete(feature.get(property));
    }
  });
};

proto.setLayerUniqueFieldValues = async function(layerId) {
  const uniqueFieldValuesPromises = [];
  const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
  layer.getEditingFields().forEach(field => {
    if (field.validate.unique) {
      if (typeof this.getLayerUniqueFieldValues({layerId, field}) === "undefined") {
        const promise = layer.getFilterData({unique: field.name});
        promise.then((values=[]) => {
          if (typeof this.layersUniqueFieldsValues[layerId] === "undefined")
            this.layersUniqueFieldsValues[layerId] = {};
          this.layersUniqueFieldsValues[layerId][field.name] = new Set(values);
        });
        uniqueFieldValuesPromises.push(promise);
      }
    }
  });
  await Promise.allSettled(uniqueFieldValuesPromises);
  return this.layersUniqueFieldsValues[layerId];
};

/**
 * save tamperary relation feature changes on father (root) layer feature
 * @param layerId
 */
proto.saveTemporaryRelationsUniqueFieldsValues = function(layerId) {
  if (typeof this.layersUniqueFieldsValues[layerId].__uniqueFieldsValuesRelations !== "undefined") {
    Object.keys(this.layersUniqueFieldsValues[layerId].__uniqueFieldsValuesRelations).forEach(relationLayerId =>{
      Object.entries(this.layersUniqueFieldsValues[layerId].__uniqueFieldsValuesRelations[relationLayerId]).forEach(([fieldName, uniqueValues]) => {
        this.layersUniqueFieldsValues[relationLayerId][fieldName] = uniqueValues;
      })
    });
    this.clearTemporaryRelationsUniqueFieldsValues(layerId);
  }
};

proto.clearTemporaryRelationsUniqueFieldsValues = function(layerId) {
  delete this.layersUniqueFieldsValues[layerId].__uniqueFieldsValuesRelations;
};

proto.getLayerUniqueFieldValues = function({layerId, field}){
  return this.layersUniqueFieldsValues[layerId] && this.layersUniqueFieldsValues[layerId][field.name];
};

proto.getChildLayerUniqueFieldValues = function({layerId, relationLayerId, field}) {
  if (typeof this.layersUniqueFieldsValues[relationLayerId].__uniqueFieldsValuesRelations !== "undefined") {
    if (typeof this.layersUniqueFieldsValues[relationLayerId].__uniqueFieldsValuesRelations[layerId] !== "undefined")
      if (typeof this.layersUniqueFieldsValues[relationLayerId].__uniqueFieldsValuesRelations[layerId][field.name] !== "undefined")
        return this.layersUniqueFieldsValues[relationLayerId].__uniqueFieldsValuesRelations[layerId][field.name]
  } 
  return this.getLayerUniqueFieldValues({
    layerId,
    field
  })
};

proto.changeLayerUniqueFieldValues = function({layerId, field, oldValue, newValue}){
  this.layersUniqueFieldsValues[layerId][field.name].delete(oldValue);
  this.layersUniqueFieldsValues[layerId][field.name].add(newValue);
};

proto.changeRelationLayerUniqueFieldValues = function({layerId, relationLayerId, field, oldValue, newValue}){
  if (typeof this.layersUniqueFieldsValues[relationLayerId].__uniqueFieldsValuesRelations === "undefined")
    this.layersUniqueFieldsValues[relationLayerId].__uniqueFieldsValuesRelations = {};
  if (typeof this.layersUniqueFieldsValues[relationLayerId].__uniqueFieldsValuesRelations[layerId] === "undefined")
    this.layersUniqueFieldsValues[relationLayerId].__uniqueFieldsValuesRelations[layerId] = {};
  this.layersUniqueFieldsValues[relationLayerId].__uniqueFieldsValuesRelations[layerId][field.name] = new Set(this.layersUniqueFieldsValues[layerId][field.name])
  this.layersUniqueFieldsValues[relationLayerId].__uniqueFieldsValuesRelations[layerId][field.name].delete(oldValue);
  this.layersUniqueFieldsValues[relationLayerId].__uniqueFieldsValuesRelations[layerId][field.name].add(newValue);
};

proto.addLayerUniqueFieldValue = function({layerId, field, value}) {
  this.layersUniqueFieldsValues[layerId][field.name].add(value);
};

proto.deleteLayerUniqueFieldValue = function({layerId, field, value}) {
  this.layersUniqueFieldsValues[layerId][field.name].delete(value);
};

proto.undoRedoLayerUniqueFieldValues = function({layerId, sessionItems=[], action}) {
  if (typeof this.layersUniqueFieldsValues[layerId] !== "undefined") {
    sessionItems.forEach(item => {
      Object.keys(this.layersUniqueFieldsValues[layerId]).forEach(name =>{
        if (Array.isArray(item)) {
          /**
           * case of update feature that contain new and ol values of feature
           */
          const [{feature:oldfeature}, {feature:newfeature}] = item;
          if (newfeature.get(name) != oldfeature.get(name)) {
            const oldValue = action === 'undo' ? newfeature.get(name) :  oldfeature.get(name);
            const newValue = action === 'undo' ? oldfeature.get(name) :  newfeature.get(name);
            this.changeLayerUniqueFieldValues({
              layerId,
              field: {
                name
              },
              oldValue,
              newValue
            })
          }
        } else {
          const {feature} = item;
          /**
           * two possible state 'add' or 'delete'
           *
           */
          const featureState = feature.getState();
          /**
           * in case of state add or delete
           */
          this[`${featureState === 'add' ? 'delete' : 'add'}LayerUniqueFieldValue`]({
            layerId,
            field: {
              name
            },
            value: feature.get(name)
          });
        }
      });
    })
  }
};

proto.undoRedoRelationUniqueFieldValues = function({relationSessionItems, action}){
  Object.entries(relationSessionItems).forEach(([layerId, {own:sessionItems, dependencies:relationSessionItems}])=>{
    this.undoRedoLayerUniqueFieldValues({
      layerId,
      sessionItems,
      action
    });
    this.undoRedoRelationUniqueFieldValues({
      relationSessionItems,
      action
    })
  })
};

/*
* end unique fields
* */
proto.getProjectLayerById = function(layerId){
  return CatalogLayersStoresRegistry.getLayerById(layerId);
};

proto.getProjectLayerFeatureById = async function({layerId, fid}) {
  let feature;
  const layer = this.getProjectLayerById(layerId);
  try {
    const response = await XHR.get({
      url: layer.getUrl('data'),
      params: {
        fids: fid
      }
    });
    const features = getFeaturesFromResponseVectorApi(response);
    if (features.length) feature = features[0];
  } catch(err) {}
  return feature;
};

proto.getProjectLayersWithSameGeometryOfLayer = function(layer, options={exclude:[]}){
 const {exclude=[]} = options;
 const geometryType = layer.getGeometryType();
 return CatalogLayersStoresRegistry.getLayers().filter(layer => {
   return (layer.isGeoLayer()
     && layer.getGeometryType && layer.getGeometryType()
     && exclude.indexOf(layer.getId()) === -1
   ) && (layer.getGeometryType() === geometryType
     || (isSameBaseGeometryType(layer.getGeometryType(), geometryType) &&  Geometry.isMultiGeometry(geometryType))
   )
 });
};

/**
 *  return (geometryType === featureGeometryType)
 *  || Geometry.isMultiGeometry(geometryType)
 *  || !Geometry.isMultiGeometry(featureGeometryType);
 */

proto.getExternalLayersWithSameGeometryOfLayer = function(layer){
  const geometryType = layer.getGeometryType();
  return this._mapService.getExternalLayers().filter(externalLayer => {
    const features = externalLayer.getSource().getFeatures();
    if (features && features.length) {
      return features[0].getGeometry() ?
        (geometryType === features[0].getGeometry().getType())
        ||
        isSameBaseGeometryType(geometryType, features[0].getGeometry().getType()) : false;
    } else return false;
  });
};

EditingService.EDITING_FIELDS_TYPE = ['unique'];

module.exports = new EditingService;
