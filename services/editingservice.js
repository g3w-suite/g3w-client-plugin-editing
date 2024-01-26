import { EditingWorkflow } from '../g3wsdk/workflow/workflow';
import {
  OpenFormStep,
  ConfirmStep
} from '../workflows';

Object
  .entries({
    EditingWorkflow,
    OpenFormStep,
    ConfirmStep,
  })
  .forEach(([k, v]) => console.assert(undefined !== v, `${k} is undefined`));

const { G3W_FID }                     = g3wsdk.constant;
const {
  ApplicationState,
  ApplicationService,
}                                     = g3wsdk.core;
const { DataRouterService }           = g3wsdk.core.data;
const { base, inherit, XHR, noop }    = g3wsdk.core.utils;
const { Geometry }                    = g3wsdk.core.geometry;
const {
  getFeaturesFromResponseVectorApi,
  isSameBaseGeometryType,
}                                     = g3wsdk.core.geoutils;
const { WorkflowsStack }              = g3wsdk.core.workflow;
const { PluginService }               = g3wsdk.core.plugin;
const { SessionsRegistry }            = g3wsdk.core.editing;
const { CatalogLayersStoresRegistry } = g3wsdk.core.catalog;
const { MapLayersStoreRegistry }      = g3wsdk.core.map;
const { Layer, LayersStore }          = g3wsdk.core.layer;
const { Feature }                     = g3wsdk.core.layer.features;
const { GUI }                         = g3wsdk.gui;
const { Server: serverErrorParser }   = g3wsdk.core.errors.parsers;
const t                               = g3wsdk.core.i18n.tPlugin;
const {
  getScaleFromResolution,
  getResolutionFromScale,
}                                     = g3wsdk.ol.utils;

const ToolBox                         = require('../toolboxes/toolbox');

const MAPCONTROL_TOGGLED_EVENT_NAME   = 'mapcontrol:toggled';
const OFFLINE_ITEMS                   = { CHANGES: 'EDITING_CHANGES' };

function EditingService() {

  base(this);

  /**
   * Store all sessions
   */
  this._sessions = {};

  /**
   * Constraints
   */
  this.constraints = {};

  /**
   * @FIXME add description
   */
  this._vectorUrl;

  /**
   * @FIXME add description
   */
  this._projectType;

  /**
   * Array of object setter(as key), key to unby (as value)
   */
  this._unByKeys = [];

  /**
   * Store setter keys event listerner
   */
  this.setterKeys = [];

  /**
   * Events
   */
  this._events = {
    layer: {
      start_editing: {
        before: {},
        after: {}
      }
    }
  };

  /**
   * Store unique fields values for each layer
   *
   * @type {{ mode: string, messages: undefined, modal: boolean, cb: { error: undefined, done: undefined } }}
   */
  this.layersUniqueFieldsValues = {};

  /**
   * Store configuration of how save/commit changes to server
   */
  this.saveConfig = {
    mode: "default",     // default, autosave
    modal: false,
    messages: undefined, // object to set custom message
    cb: {
      done: undefined,   // function executed  after commit change done
      error: undefined   // function executed after commit changes error
    }
  };

  /**
   * Application editing contraints (layer, filter, ..) to get features
   */
  this.applicationEditingConstraints = {
    toolboxes: {},
    showToolboxesExcluded: true
  };

  /**
   * State of editing
   */
  this.state = {
    open: false,              // check if panel is open or not
    toolboxes: [],
    toolboxselected: null,
    toolboxidactivetool: null,
    /** @since g3w-client-plugin-editing@v3.6.2 */
    showselectlayers: true,   // whether to show or not selected layers on editing panel
    message: null,
    relations: [],
  };

  /**
   * KEY LAYERID, VALUES ARRAY OF FEATURE FID CHANGES OR ADDED
   */
  this.loadLayersFeaturesToResultWhenCloseEditing = {};

  /**
   * @FIXME add description
   */
  this._layers_in_error = false;

  /**
   * Map Service
   */
  this._mapService = GUI.getService('map');

  // set map control toggle event
  this.mapControlToggleEventHandler = evt => {
    if (
      evt.target.isToggled() &&
      evt.target.isClickMap() &&
      this.state.toolboxselected &&
      this.state.toolboxselected.getActiveTool()
    ) {
      this.state.toolboxselected.stopActiveTool();
    }
  };

  this._mapService.on(MAPCONTROL_TOGGLED_EVENT_NAME, this.mapControlToggleEventHandler);

  /**
   * Plugin components
   */
  this._formComponents = {};

  /**
   * @FIXME add description
   */
  this._subscribers = {};

  /**
   * @FIXME add description
   */
  this.init = function(config = {}) {
    this._vectorUrl   = config.vectorurl;
    this._projectType = config.project_type;
    this._layersstore = new LayersStore({ id: 'editing', queryable: false });

    //add editing layer store to mapstoreregistry
    MapLayersStoreRegistry.addLayersStore(this._layersstore);

    this.config          = config;
    this._editableLayers = {};
    this._toolboxes      = [];
    this.state.toolboxes = [];

    let layers = this._getEditableLayersFromCatalog();

    const EditableLayersPromises = []; // NB: getLayerForEditing returns a promise with layer useful for editing
    for (const layer of layers) {
      EditableLayersPromises.push(layer.getLayerForEditing({ vectorurl: this._vectorUrl, project_type: this._projectType }));
    }

    Promise
      .allSettled(EditableLayersPromises)
      .then(editableLayers  => {
        editableLayers.forEach(promise => {
          if ('fulfilled' === promise.status) {
            const layerId = promise.value.getId();
            this._editableLayers[layerId] = promise.value;
            this._attachLayerWidgetsEvent(promise.value);
            this._sessions[layerId] = null;
          } else {
            this._layers_in_error = true;
          }
        });
      this._ready();
    });

  };

  /**
   * @FIXME add description
   *
   * @fires ready
   */
  this._ready = function() {

    // @since g3w-client-plugin-editing@v3.7.0
    this.setRelations1_1FieldsEditable();

    // set toolbox colors
    this.setLayersColor();

    // after add layers to layerstore
    this._layersstore.addLayers(this.getLayers());

    // create toolboxes
    for (const layer of this.getLayers()) {
      this.addToolBox(ToolBox.create(layer));
    }

    // create a dependencies tree
    this._createToolBoxDependencies();

    // set Api service
    this.setApi({
      /** ORIGINAL SOURCE: g3w-client-plugin-editing/api/index.js@v3.7.1 */
      api: {
        getSession:                       this.getSession,
        getFeature:                       this.getFeature,
        subscribe:                        this.subscribe,
        unsubscribe:                      this.unsubscribe,
        getToolBoxById:                   this.getToolBoxById,
        setSaveConfig:                    this.setSaveConfig,
        addNewFeature:                    this.addNewFeature,
        addFormComponents:                this.addFormComponents,
        commitChanges:                    this.commit,
        setApplicationEditingConstraints: this.setApplicationEditingConstraints,
        getMapService:                    this.getMapService,
        updateLayerFeature:               noop,
        deleteLayerFeature:               noop,
        addLayerFeature:                  this.addLayerFeature,
        showPanel:                        this.showPanel,
        hidePanel:                        this.hidePanel,
        resetDefault:                     this.resetAPIDefault,
        startEditing:                     this.startEditing,
        stopEditing:                      this.stopEditing,
      }
    }
  );

    this.registerResultEditingAction();

    this.emit('ready');
  };

}

inherit(EditingService, PluginService);

const proto = EditingService.prototype;

/**
 * [API Method]
 */
proto.getAppState = function() {
  return ApplicationState;
};

/**
 * [API Method]
 */
proto.getFormComponentsById = function(layerId) {
  return this._formComponents[layerId] || [];
};

/**
 * [API Method]
 */
proto.getFormComponents = function() {
  return this._formComponents;
};

/**
 * [API Method]
 */
proto.addFormComponents = function({
  layerId,
  components = [],
} = {}) {
  if (!this._formComponents[layerId]) {
    this._formComponents[layerId] = [];
  }
  for (let i=0; i < components.length; i++) {
    this._formComponents[layerId].push(components[i])
  }
};

/**
 * [API Method] Get session
 *
 * @param layerId
 *
 * @returns {*}
 */
proto.getSession = function({ layerId } = {}) {
  return this.getToolBoxById(layerId).getSession();
};

/**
 * [API Method]
 *
 * @param layerId
 *
 * @returns Feature in editing
 */
proto.getFeature = function({ layerId } = {}) {
  return this.getToolBoxById(layerId).getActiveTool().getFeature();
};

/**
 * [API Method] Subscribe handler function on event
 *
 * @param event
 * @param { Function } fnc
 *
 * @returns { Function } function
 */
proto.subscribe = function(event, fnc) {
  if (!this._subscribers[event]) this._subscribers[event] = [];
  if (!this._subscribers[event].find(subscribe => subscribe === fnc)) this._subscribers[event].push(fnc);
  return fnc;
};

/**
 * [API Method] Unsubscribe handler function on event
 *
 * @param event
 * @param fnc
 */
proto.unsubscribe = function(event, fnc) {
  this._subscribers[event] = this._subscribers[event].filter(subscribe => subscribe !== fnc);
};

/**
 * Check if layer has relation 1:1 (type ONE) and if fields
 *
 * belong to relation where child layer is editable
 *
 * @since g3w-client-plugin-editing@v3.7.0
 */
proto.setRelations1_1FieldsEditable = function() {
  this
    .getLayers()
    .forEach(editingLayer => {
      const fatherId = editingLayer.getId();                                                // father layer
      this
        .getRelation1_1ByLayerId(fatherId)
        .forEach(relation => {                                                              // loop `Relations` instances
          if (fatherId === relation.getFather()) {                                          // check if father layerId is a father of relation
            const isChildEditable = undefined !== this.getLayerById(relation.getChild());   // check if child layerId is editable (in editing)
            this
              .getRelation1_1EditingLayerFieldsReferredToChildRelation(relation)            // loop father layer fields (in editing)
              .forEach(field => { field.editable = (field.editable && isChildEditable); }); // current editable boolean value + child editable layer
          }
        })
    });
};

/**
 * Get Father layer fields related (in Relation) to Child Layer,
 *
 * ie. father fields having same `vectorjoin_id` attribute to `relation.id` value
 *
 * @param { Relation } relation
 *
 * @returns { Array } fields Array bind to child layer
 *
 * @since g3w-client-plugin-editing@v3.7.0
 */
proto.getRelation1_1EditingLayerFieldsReferredToChildRelation = function(relation) {
  return this
    .getLayerById(relation.getFather())
    .getEditingFields()
    .filter(field => field.vectorjoin_id && field.vectorjoin_id === relation.getId());
}

/**
 * Get Relation 1:1 from layerId
 *
 * @param layerId
 *
 * @returns Array of relations related to layerId that are Join 1:1 (Type ONE)
 *
 * @since g3w-client-plugin-editing@v3.7.0
 */
proto.getRelation1_1ByLayerId = function(layerId) {
  return CatalogLayersStoresRegistry
    .getLayerById(layerId)
    .getRelations()
    .getArray()
    .filter(relation => 'ONE' === relation.getType()); // 'ONE' == join 1:1
};

/**
 * Set Boolean value for show select layers to edit
 *
 * @param bool Default is true
 *
 * @since g3w-client-plugin-editing@v3.6.2
 */
proto.setShowSelectLayers = function(bool=true) {
  this.state.showselectlayers = bool;
};

/**
 * Register result editing action
 */
proto.registerResultEditingAction = function() {
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

/**
 * Unregister action from query result service setters
 */
proto.unregisterResultEditingAction = function() {
  const queryResultsService = GUI.getService('queryresults');
  this.setterKeys.forEach(({ setter, key }) => queryResultsService.un(setter, key));
};

/**
 * ORIGINAL SOURCE: g3w-client-plugin/toolboxes/toolboxesfactory.js@v3.7.1
 * 
 * Start to edit selected feature from results
 */
proto.editResultLayerFeature = function({
  layer,
  feature,
} = {}) {

  const fid = feature.attributes[G3W_FID];

  this.getToolBoxes().forEach(tb => tb.setShow(tb.getId() === layer.id));
  this.getPlugin().showEditingPanel();

  const toolBox   = this.getToolBoxById(layer.id);
  const { scale } = toolBox.getEditingConstraints(); // get scale constraint from setting layer
  const has_geom  = feature.geometry && undefined !== scale;
  // start toolbox (filtered by feature id)
  toolBox
    .start({ filter: { fids: fid } })
    .then(({ features = [] }) => {
      const _layer = toolBox.getLayer();
      const source = _layer.getEditingLayer().getSource();

      // get feature from Editing layer source (with styles)
      const feature = (
        (_layer.getType() === Layer.LayerTypes.VECTOR)
          ? source.getFeatures()
          : source.readFeatures()
        ).find(f => f.getId() == fid);

      // skip when not feature is get from server
      if (!feature) {
        return;
      }

      /**If feature has geometry, zoom to geometry */
      if (feature.getGeometry()) {
        this._mapService.zoomToGeometry(feature.getGeometry());
        // check map scale after zoom to feature
        // if currentScale is more that scale constraint set by layer editing
        // need to go to scale setting by layer editing constraint
        if (has_geom) {
          this._mapService.getMap().once('moveend', () => {
            const units        = this._mapService.getMapUnits();
            const map          = this._mapService.getMap();
            const currentScale = parseInt(getScaleFromResolution(map.getView().getResolution(), units));
            if (currentScale > scale) {
              map.getView().setResolution(getResolutionFromScale(scale, units));
            }
            //set select only here otherwise is show editing constraint
            toolBox.setSelected(true);
          });
        } else {
          toolBox.setSelected(true);
        }
      } else {
        //set select toolbox
        toolBox.setSelected(true);
      }

      const session = toolBox.getSession();

      this.setSelectedToolbox(toolBox);

      /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/editnopickmapfeatureattributesworkflow.js@v3.7.1 */
      // edit feature workFlow
      const work = new EditingWorkflow({
        type: 'editnopickmapfeatureattributes',
        runOnce: true,
        helpMessage: 'editing.tools.update_feature',
        steps: [ new OpenFormStep() ]
      });
      work
        .start({
          inputs: { layer: _layer, features: [feature] },
          context: { session }
        })
        .then(() => session
          .save()
          .then(() => this.saveChange()))
        .fail(() => session.rollback());

    })
    .fail(err => console.warn(err));
};

/**
 * @FIXME add description
 */
proto.disableMapControlsConflict = function(bool=true) {
  this._mapService.disableClickMapControls(bool);
};

/**
 * Used on commit if no toolbox is passed as parameter
 * 
 * @param toolbox
 */
proto.setSelectedToolbox = function(toolbox) {
  this.state.toolboxselected = toolbox;
};

/**
 * @FIXME add description
 */
proto.getToolboxSelected = function() {
  return this.state.toolboxselected;
};

/**
 * Create a new feature
 *
 * @param layerId
 * @param options.geometry.type
 * @param options.geometry.coordinates
 *
 * @returns { Feature }
 */
proto.addNewFeature = function(layerId, options = {}) {
  const feature = new Feature();

  if (options.geometry) {
    feature.setGeometry(new ol.geom[options.geometry.type](options.geometry.coordinates));
  }

  feature.setProperties(options.properties);
  feature.setTemporaryId();

  const toolbox      = this.getToolBoxById(layerId);
  const editingLayer = toolbox.getLayer().getEditingLayer();
  const session      = toolbox.getSession();

  editingLayer.getSource().addFeature(feature);
  session.pushAdd(layerId, feature, false);

  return feature;
};

/**
 * @returns { boolean }
 */
proto.getLayersInError = function() {
  return this._layers_in_error;
};

/**
 * @returns {*}
 */
proto.getMapService = function() {
  return this._mapService;
};

/**
 * @private
 */
proto._initOffLineItems = function() {
  for (const id in OFFLINE_ITEMS) {
    !this.getOfflineItem(OFFLINE_ITEMS[id]) && ApplicationService.setOfflineItem(OFFLINE_ITEMS[id]);
  }
};

/**
 * @param data
 * 
 * @returns {*}
 * 
 * @private
 */
proto._handleOfflineChangesBeforeSave = function(data) {
  const changes = ApplicationService.getOfflineItem(OFFLINE_ITEMS.CHANGES);
  const applyChanges = ({layerId, current, previous})=> {
    current[layerId].add = [...previous[layerId].add, ...current[layerId].add];
    current[layerId].delete = [...previous[layerId].delete, ...current[layerId].delete];
    previous[layerId].update.forEach(updateItem => {
      const {id} = updateItem;
      const find = current[layerId].update.find(updateItem => updateItem.id === id);
      if (!find) {
        current[layerId].update.unshift(updateItem);
      }
    });
    const lockids = previous[layerId].lockids|| [];
    lockids
      .forEach(lockidItem => {
        const {featureid} = lockidItem;
        const find = current[layerId].lockids.find(lockidItem => lockidItem.featureid === featureid);
        if (!find) {
          current[layerId].update.unshift(lockidItem);
        }
    })
  };

  for (const layerId in changes) {
    // check if previous changes are made in the same layer or in relationlayer of current
    const current = data[layerId] ? data :
      data[Object.keys(data)[0]].relations[layerId] ?
        data[Object.keys(data)[0]].relations : null;

    if (current) {
      applyChanges({
        layerId,
        current,
        previous: changes
      });
    } else {
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

/**
 * @param { Object } opts
 * @param opts.id
 * @param opts.data
 * 
 * @returns {*}
 */
proto.saveOfflineItem = function({
  id,
  data,
} = {}) {
  if (id === OFFLINE_ITEMS.CHANGES) data = this._handleOfflineChangesBeforeSave(data);
  return ApplicationService.setOfflineItem(id, data);
};

/**
 * @param id
 * @param data
 */
proto.setOfflineItem = function(id, data) {
  ApplicationService.setOfflineItem(id, data);
};

/**
 * @param id
 * @returns {*}
 */
proto.getOfflineItem = function(id) {
  return ApplicationService.getOfflineItem(id);
};

/**
 * Check if alread have off lines changes
 *
 * @param { Object }  opts
 * @param { boolean } [opts.modal=true]
 * @param { boolean } [opts.unlock=false]
 *
 * @returns { Promise<unknown> }
 */
proto.checkOfflineChanges = function({
  modal = true,
  unlock = false,
} = {}) {
  return new Promise((resolve, reject) => {
    const changes = ApplicationService.getOfflineItem(OFFLINE_ITEMS.CHANGES);
    // if find changes offline previously
    if (changes) {
      const promises = [];
      const layerIds = [];
      //FORCE TO WAIT OTHERWISE STILL OFF LINE
      setTimeout(() => {
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

        $.when
          .apply(this, promises)
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
 * Called by Editing Panel on creation time
 */
proto.registerOnLineOffLineEvent = function() {
  // in case of starting panel editing check if there arae some chenging pending
  // if true it have to commit chanhes on server and ulock all layers features temporary locked
  if (ApplicationState.online) {
    this.checkOfflineChanges({
      unlock: true
    });
  }
  const offlineKey =  ApplicationService.onafter('offline', () => {});
  const onlineKey = ApplicationService.onafter('online', () => {
    this.checkOfflineChanges({
      modal:false
    })
      .then(()=>{})
      .catch(error => GUI.notify.error(error))
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

/**
 * @FIXME add description
 */
proto.unregisterOnLineOffLineEvent = function() {
  this.unregisterSettersEvents(['online', 'offline'])
};

/**
 * @param { Array } setters
 */
proto.unregisterSettersEvents = function(setters=[]) {
  this._unByKeys.forEach(registered => {
    const {owner, setter, key} = registered;
    owner.un(setter, key);
  })
};

/**
 * @param event
 * @param options
 * 
 * @returns { Promise<unknown> }
 */
proto.fireEvent = function(event, options={}) {
  return new Promise(resolve => {
    if (this._subscribers[event]) {
      this._subscribers[event]
        .forEach(fnc => {
          const response = fnc(options);
          if (response && response.once) {
            this.unsubscribe(event, fnc);
          }
        });
      }
    resolve();
  });
};

/**
 * @FIXME add description
 */
proto.activeQueryInfo = function() {
  this._mapService.activeMapControl('query');
};

/**
 * Set editing layer color style and tyoolbox
 */
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

/**
 * @param layer
 * 
 * @returns {*}
 * 
 * @private
 */
proto._layerChildrenRelationInEditing = function(layer) {
  return layer.getChildren().filter(relation => this.getLayerById(relation));
};

/**
 * Undo method
 */
proto.undo = function() {
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

/**
 * undo relations
 */
proto.undoRelations = function(undoItems) {
  Object
    .entries(undoItems)
    .forEach(([toolboxId, items]) => { this.getToolBoxById(toolboxId).getSession().undo(items); });
};

/**
 * rollback relations
 */
proto.rollbackRelations = function(rollbackItems) {
  Object
    .entries(rollbackItems)
    .forEach(([toolboxId, items]) => { this.getToolBoxById(toolboxId).getSession().rollback(items); });
};

/**
 * @FIXME add description
 */
proto.redo = function() {
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

/**
 * redo relations
 */
proto.redoRelations = function(redoItems) {
  Object
    .entries(redoItems)
    .forEach(([toolboxId, items]) => { this.getToolBoxById(toolboxId).getSession().redo(items); });
};

/**
 * @param id
 * 
 * @returns {*}
 */
proto.getEditingLayer = function(id) {
  return this._editableLayers[id].getEditingLayer();
};

/**
 * @param toolbox
 */
proto.addToolBox = function(toolbox) {
  this._toolboxes.push(toolbox);
  // add session
  this._sessions[toolbox.getId()] = toolbox.getSession();
  this.state.toolboxes.push(toolbox.state);
};

//** Method to set state in editing 
proto.setOpenEditingPanel = function(bool) {
  this.state.open = bool;
  this._getEditableLayersFromCatalog().forEach(layer => layer.setInEditing(bool));
};

/**
 * Add event
 *
 * @param { Object } event
 * @param { string } event.type
 * @param event.id
 * @param event.fnc
 **/
proto.addEvent = function({
  type,
  id,
  fnc,
} = {}) {
  if (!this._events[type]) this._events[type] = {};
  if (!this._events[type][id]) this._events[type][id] = [];
  this._events[type][id].push(fnc);
};

/**
 * Add events
 *
 * @param { Object } event
 * @param { string[] } event.types
 * @param event.id
 * @param event.fnc
 */
proto.addEvents = function({
  types = [],
  id,
  fnc,
} = {}) {
  types.forEach(type => this.addEvent({
    type,
    id, 
    fnc
  }));
};

/**
 * @param { Object } handler
 * @param handler.type
 * @param handler.id
 * 
 * @returns { Promise<void> }
 */
proto.runEventHandler = async function({
  type,
  id,
} = {}) {
  await (this._events[type] && this._events[type][id] && Promise.allSettled(this._events[type][id].map(fnc => fnc())));
};

/**
 * @param { Object } save
 * @param save.mode     - default or autosave
 * @param save.cb       - object contain done/error two functions
 * @param save.modal    - Boolean true or false to show to ask
 * @param save.messages - object success or error
 */
proto.setSaveConfig = function({
  mode = 'default',
  cb={},
  modal=false,
  messages,
} = {}) {
  this.saveConfig.mode = mode;
  this.saveConfig.modal = modal;
  this.saveConfig.messages = messages;
  this.saveConfig.cb = {
    ...this.saveConfig.cb,
    ...cb
  }
};

/**
 * @returns save mode
 */
proto.getSaveConfig = function() {
  return this.saveConfig;
};

/**
 * Reset default values
 */
proto.resetDefault = function() {
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

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/api/index.js@v3.7.1
 * 
 * Reset default toolbox state modified by other plugin
 * 
 * @since g3w-client-plugin-editing@v3.7.2
 */
proto.resetAPIDefault = function({
  plugin=true,
  toolboxes=true,
} = {}) {
  if (toolboxes) {
    this.getToolBoxes().forEach(tb => { tb.resetDefault(); });
  }
  if (plugin) {
    this.resetDefault();
  }
}

/**
 * Get data from api when a field of a layer
 * is related to a wgis form widget (ex. relation reference, value map, etc..)
 * 
 * @param layer
 * 
 * @private
 */
proto._attachLayerWidgetsEvent = function(layer) {
  const fields = layer.getEditingFields();
  for (let i=0; i < fields.length; i++) {
    const field = fields[i];
    if (field.input) {
      if (field.input.type === 'select_autocomplete' && !field.input.options.filter_expression) {
        const options = field.input.options;
        let {
          key,
          values,
          value,
          usecompleter,
          layer_id,
          loading,
          relation_id,        // @since g3w-client-plugin-editing@v3.7.0
          relation_reference, // @since g3w-client-plugin-editing@v3.7.0
          filter_fields=[],   // @since g3w-client-plugin-editing@v3.7.2
        } = options;
        const self = this;
        if (!usecompleter) {
          this.addEvents({
            /**
             * @TODO need to avoid to call the same fnc to same event many times to avoid waste server request time
             */
            types: ['start-editing', 'show-relation-editing'],
            id: layer.getId(),
            fnc() {
              return new Promise((resolve, reject) => {
                // remove all values
                loading.state = 'loading';
                field.input.options.values = [];
                //check if field has a relation reference widget
                // and no filter fields set
                if (relation_reference && filter_fields.length === 0) {
                  //get data with fformatter
                  layer.getFilterData({
                    fformatter: field.name
                  })
                  .then(response => {
                    //check if response
                    if (response && response.data) {
                      //response data is an array ok key value objects
                      response.data.forEach(([value, key]) => {
                        field.input.options.values.push({
                          key,
                          value
                        })
                      })
                      loading.state = 'ready';
                      self.fireEvent('autocomplete', {
                        field,
                        data: [response.data]
                      });
                      //resolve
                      resolve(field.input.options.values);
                    }
                  })
                  .catch((error) => {
                    loading.state = 'error';
                    reject(error);
                  })
                }
                //check if layer id (field has widget value map)
                else if (layer_id) {
                  const relationLayer = CatalogLayersStoresRegistry.getLayerById(layer_id);
                  if (relationLayer) {
                    relationLayer.getDataTable({
                      ordering: key
                    })
                    .then(response => {
                      if (response && response.features) {
                        const features = response.features;
                        for (let i = 0; i < features.length; i++) {
                          field.input.options.values.push({
                            key: features[i].properties[key],
                            value: features[i].properties[value]
                          })
                        }
                        loading.state = 'ready';
                        // Plugin need to know about it
                        self.fireEvent('autocomplete', {
                          field,
                          features
                        })
                        resolve(field.input.options.values);
                      }
                    })
                    .fail(error => {
                      loading.state = 'error';
                      reject(error);
                    });
                  }
                }
                else {
                  // @TODO Check if is used otherwise need to deprecate it
                  const features = [];
                  loading.state = 'ready';
                  // Plugin need to know about it
                  self.fireEvent('autocomplete', {
                    field,
                    features
                  });
                  resolve(features);
                }
              })
            }
          })
        }
      }
    }
  }
};

/**
 * @private
 */
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
 *
 * @param layerId
 * @param fieldName
 *
 * @returns {*}
 */
proto.isFieldRequired = function(layerId, fieldName) {
  return this.getLayerById(layerId).isFieldRequired(fieldName);
};

/**
 * @param layer
 * 
 * @returns { Array }
 * 
 * @private
 */
proto._getToolBoxEditingDependencies = function(layer) {
  let relationLayers = [...layer.getChildren(), ...layer.getFathers()];
  return relationLayers.filter((layerName) => undefined !== this.getLayerById(layerName));
};

/**
 * @param layer
 * 
 * @returns { boolean }
 * 
 * @private
 */
proto._hasEditingDependencies = function(layer) {
  let toolboxesIds = this._getToolBoxEditingDependencies(layer);
  return toolboxesIds.length > 0;
};

/**
 * @param toolbox
 */
proto.handleToolboxDependencies = function(toolbox) {
  let dependecyToolBox;
  if (toolbox.isFather()) {
    this.getLayersDependencyFeatures(toolbox.getId());
  }
  toolbox.getDependencies()
    .forEach(toolboxId => {
      dependecyToolBox = this.getToolBoxById(toolboxId);
      dependecyToolBox.setEditing(false);
    })
};

/**
 * @returns {*}
 * 
 * @private
 */
proto._getEditableLayersFromCatalog = function() {
  return CatalogLayersStoresRegistry.getLayers({
    EDITABLE: true
  });
};

/**
 * @returns { Array }
 */
proto.getLayers = function() {
  return Object.values(this._editableLayers);
};

/**
 * @returns {*}
 */
proto.getCurrentWorkflow = function() {
  return WorkflowsStack.getCurrent();
};

/**
 * @returns {{feature: *, session: *, inputs: *, context: *, layer: *}}
 */
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

/**
 * @param { Object } opts
 * @param opts.layerId
 * @param opts.relation
 * @param opts.feature
 * 
 * @returns { BigUint64Array }
 */
proto.getRelationsAttributesByFeature = function({
  layerId,
  relation,
  feature,
} = {}) {

  const layer = this.getToolBoxById(layerId).getLayer();
  const relations = this.getRelationsByFeature({layerId, relation, feature});
  return relations
    .map(relation => ({
      fields: layer.getFieldsWithValues(relation, {
        relation: true
      }),
      id: relation.getId()
    }))

}

/**
 * @param { Object } opts
 * @param opts.layerId
 * @param opts.relation
 * 
 * @returns {*}
 * 
 * @private
 */
proto._getRelationLayerId = function({
  layerId,
  relation,
} = {}) {

  const child = relation.getChild ?
    relation.getChild() :
    relation.child;

  const father = relation.getFatherField ?
    relation.getFatherField() :
    relation.fatherField;

  return (child === layerId) ? father: child;
};

/**
 * @param { Object } opts
 * @param opts.layerId
 * @param opts.relation
 * @param opts.feature
 */
proto.getRelationsByFeature = function({
  layerId,
  relation,
  feature,
} = {}) {
  const { ownField, relationField } = this._getRelationFieldsFromRelation({ layerId, relation });
  // get features of relation child layers
  // Loop relation fields
  const values = relationField.map(field => feature.get(field));
  return this
    ._getFeaturesByLayerId(layerId)
    .filter(feature => ownField.every((field, i) => feature.get(field) == values[i]));
};

/**
 * @param { boolean } bool
 */
proto.registerLeavePage = function(bool) {
  ApplicationService.registerLeavePage({
    bool
  });
};

/**
 * @returns { boolean }
 */
proto.loadPlugin = function() {
  return this._load = !!this._getEditableLayersFromCatalog().length;
};

/**
 * @param { string } layerId
 * 
 * @returns {*}
 */
proto.getLayerById = function(layerId) {
  return this._editableLayers[layerId];
};

/**
 * @param layer
 */
proto.beforeEditingStart = function({ layer } = {}) {
  this._checkLayerWidgets(layer);
};

/**
 * @param layer
 */
proto.afterEditingStart = function({ layer }= {}) {
  //TODO
};

/**
 * @param { string } toolboxId
 * 
 * @returns {*}
 */
proto.getToolBoxById = function(toolboxId) {
  return this._toolboxes.find(tb => tb.getId() === toolboxId);
};

/**
 * Get layer session by id (layer id is the same of session)
 *
 * @param id
 *
 * @returns {*}
 *
 * @since g3w-client-plugin-editing@v3.7.0
 */
proto.getSessionById = function(id) {
  return this._sessions[id];
};

/**
 * Method to apply filter editing contsraint to toolbox editing
 * Apply filter editing contsraint to toolbox editing
 *
 * @param constraints
 */
proto.setApplicationEditingConstraints = function(constraints={showToolboxesExcluded: true, toolboxes:{}}) {
  this.applicationEditingConstraints = {
    ...this.applicationEditingConstraints,
    ...constraints
  };
  
  const {toolboxes, showToolboxesExcluded} = constraints;
  const toolboxIds = Object.keys(toolboxes);
  if (false === showToolboxesExcluded) {
    this.state.toolboxes.forEach(toolbox => toolbox.show =  toolboxIds.indexOf(toolbox.id) !== -1);
  }
  toolboxIds.forEach(toolboxId => this
    .getToolBoxById(toolboxId)
    .setEditingConstraints(toolboxes[toolboxId]))
}

/**
 * Get application editing contraints if applied
 */
proto.getApplicationEditingConstraints = function() {
  return this.applicationEditingConstraints;
};

/**
 * @param { string } toolboxId
 * 
 * @returns {*}
 */
proto.getApplicationEditingConstraintById = function(toolboxId) {
  return this.applicationEditingConstraints.toolboxes[toolboxId];
};

/**
 * @returns { Array }
 */
proto.getToolBoxes = function() {
  return this._toolboxes;
};

/**
 * @returns {*|{}}
 */
proto.getEditableLayers = function() {
  return this._editableLayers;
};

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/api/index.js@v3.7.1
 * 
 * @returns { string[] }
 * 
 * @since g3w-client-plugin-editing@v3.7.2
 */
proto.getEditableLayersId = function() {
  return Object.keys(this.getEditableLayers());
};

/**
 * @returns {*}
 * 
 * @private
 */
proto._cancelOrSave = function() {
  return resolve();
};

/**
 * Stop editing
 * 
 * @returns { Promise<unknown> }
 */
proto.stop = function() {
  return new Promise((resolve, reject) => {
    const commitpromises = [];
    this._toolboxes
      .forEach(toolbox => {
        // check if temp changes are waiting to save on server
        if (toolbox.getSession().getHistory().state.commit) {
          // ask to commit before exit
          commitpromises.push(this.commit({toolbox, modal:true}));
        }
      });
    $.when.apply(this, commitpromises)
      .always(() => {
        this._toolboxes
          .forEach(toolbox => toolbox.stop());
        this.clearState();
        //this.activeQueryInfo();
        this._mapService.refreshMap();
        resolve();
    });
  });
};

/**
 * remove Editing LayersStore
 */
proto.clear = function() {
  MapLayersStoreRegistry.removeLayersStore(this._layersstore);
  SessionsRegistry.clear();
  //turn off events
  this._mapService.off(MAPCONTROL_TOGGLED_EVENT_NAME, this.mapControlToggleEventHandler);
  this.unregisterResultEditingAction();
};

/**
 * @FIXME add description
 */
proto.clearState = function() {
  this.state.toolboxselected = null;
  this.state.toolboxidactivetool =  null;
  this.state.message =  null;
};

/**
 * Get Relation in editing
 *
 * @param { Object } opts
 * @param opts.layerId
 * @param opts.relations
 * @param opts.feature
 *
 * @returns { Array }
 */
proto.getRelationsInEditing = function({
  layerId,
  relations = [],
  feature,
} = {}) {
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

/**
 * @param { Object } opts
 * @param opts.layerId
 * @param opts.relations
 * 
 * @returns { Array }
 * 
 * @private
 */
proto._filterRelationsInEditing = function({
  layerId,
  relations = [],
}) {
  return relations.filter(relation => this.getToolBoxById(this._getRelationId({ layerId, relation })));
};

/**
 * @param { string } layerId
 */
proto.stopToolboxesChildren = function(layerId) {
  const layer = this.getLayerById(layerId);
  const relations = this._filterRelationsInEditing({
    relations: layer.getRelations() ? layer.getRelations().getArray() : [],
    layerId
  });
  relations
    .filter(relation => relation.getFather() === layerId)
    .forEach(relation => {
      const relationId = this._getRelationId({ layerId, relation });
      if (this.getToolBoxById(relationId).inEditing()) {
        this.getToolBoxById(relationId).stop();
      }
    })
};

/**
 * @param { string } layerId
 */
proto.stopSessionChildren = function(layerId) {
  const layer = this.getLayerById(layerId);
  const relations = this._filterRelationsInEditing({
    relations: layer.getRelations() ? layer.getRelations().getArray() : [],
    layerId
  });
  relations
    .filter(relation => relation.getFather() === layerId)
    .forEach(relation => {
      const relationId = this._getRelationId({ layerId, relation });
      // In case of no editing is started (click on pencil of relation layer) need to stop (unlock) features
      if (!this.getToolBoxById(relationId).inEditing()) {
        this._sessions[relationId].stop();
      }
    })
};

/**
 * Check if father relation is editing and has commit feature
 * 
 * @param { string } layerId
 * 
 * @returns father in editing
 */
proto.fathersInEditing = function(layerId) {
  return this.getLayerById(layerId)
    .getFathers()
    .filter(id => {
      const toolbox = this.getToolBoxById(id);
      if (toolbox && toolbox.inEditing() && toolbox.isDirty()) {
        //get temporary relations object
        const {relations={}} = toolbox.getSession().getCommitItems();
        //check if layerId has some changes
        return Object
          .keys(relations)
          .find(relationLayerId => layerId === relationLayerId);
      }
    });
};

/**
 * Based on layerId and relation,
 * extract field of relation.
 * ownField are array of fields related to relation and belong to layerId
 * relationField area array of fields related to relation thar belong to other layer in relation with layerId
 * @param { Object } opts
 * @param opts.layerId
 * @param opts.relation
 *
 * @returns {{ ownField: [], relationField: [] }} `ownField` and `relationField` are Arrays since g3w-client-plugin-editing@v3.7.0
 *
 * @private
 */
proto._getRelationFieldsFromRelation = function({
  layerId,
  relation,
} = {}) {
  /** {String} @type */
  const childId = relation.getChild ?
    relation.getChild() :
    relation.child;

  /** {Boolean} @type check if is child*/
  const isChild = childId !== layerId;
  /** { Array } @type array of fields */
  const _fatherField = relation.getFatherField ?
    relation.getFatherField() :
    relation.fatherField;

  /** { Array } @type array of fields */
  const _childField = relation.getChildField ?
    relation.getChildField() :
    relation.childField;

  return {
    ownField: isChild ? _fatherField : _childField,
    relationField: isChild ? _childField : _fatherField
  }
};

/**
 * @param { 'all' | 'bbox' | 'field' | 'fid' | '1:1' } filterType
 * @param { Object } options
 * @param options.feature
 * @param options.relation
 * @param options.field
 * @param options.layerId
 * @param options.operator
 */
proto.createEditingDataOptions = function(filterType = 'all', options = {}) {
  let filter;

  switch (filterType) {

    case 'all':
      filter = undefined;
      break;

    case 'bbox':
      filter = {
        bbox: this._mapService.getMapBBOX(),
      };
      break;

    case 'field':
      filter = {
        field: {
          field: options.field,
          type: 'editing'
        }
      };
      break;

    case 'fid':
      if ('not' !== options.operator) {        // get relations of current feature
        filter = {
          fid: {
            fid:       options.feature.getId(),
            layer:     { id: options.layerId },
            type:      'editing',
            relation:  options.relation.state,
            formatter: 0,                      // 0 = retrieve stored value
          }
        };
      }
      break;

    // relation 1:1
    case '1:1':
      filter = {
        field: options.relation.getChildField()[0] + '|eq|' + options.feature.get(options.relation.getFatherField()[0]),
        type: 'editing',
      }
      break;

  }

  return {
    registerEvents: true, // usefult to get register vent on toolbox example mapmoveend
    editing: true,
    filter
  };

};

/**
 * @param { string } layerId
 * 
 * @returns {*}
 * 
 * @private
 */
proto._getFeaturesByLayerId = function(layerId) {
  return this.getLayerById(layerId).readEditingFeatures();
};

/**
 * @param { Object } opts
 * @param { string } opts.layerId
 * @param opts.relation
 * @param opts.feature
 * @param { string } [opts.operator='eq']
 * 
 * @returns { Promise<unknown> }
 */
proto.getLayersDependencyFeaturesFromSource = function({
  layerId,
  relation,
  feature,
  operator = 'eq',
} = {}) {
  return new Promise(resolve => {
    // skip when ..
    if ('eq' !== operator) {
      return resolve(false);
    }

    const { ownField, relationField } = this._getRelationFieldsFromRelation({ layerId, relation });
    const features                    = this._getFeaturesByLayerId(layerId);
    const featureValues               = relationField.map(field => feature.get(field));

    resolve(ownField.every((field, i) => features.find(f => f.get(field) == featureValues[i])))
  })
};

/**
 * Based on layer id and relation, return the layer id
 * of the other layer that is in relation with layerId
 * @param { Object } opts
 * @param opts.layerId
 * @param opts.relation
 * 
 * @returns {*|{configurable: boolean}|{configurable}|boolean|(function(): *)}
 * 
 * @private
 */
proto._getRelationId = function({
  layerId,
  relation,
} = {}) {
  const fatherId = relation.getFather ? relation.getFather() : relation.father;
  const childId  = relation.getChild  ? relation.getChild()  : relation.child;

  return fatherId === layerId ? childId: fatherId;
};

/**
 * @param { string } layerId
 * @param opts
 * 
 * @returns { Promise<Awaited<unknown>[]> }
 */
proto.getLayersDependencyFeatures = function(layerId, opts = {}) {
  const promises = [];
  const layer = this.getLayerById(layerId);
  const relations = opts.relations ?
    opts.relations :
    layer.getChildren().length && layer.getRelations() ?
      this._filterRelationsInEditing({
        relations: layer.getRelations()
          .getArray()
          .filter(relation => relation.getFather() === layerId),
        layerId
      }) :
      [];
  const online = ApplicationState.online;
  relations.forEach(relation => {
    if (relation.setLoading) {
      relation.setLoading(true);
    } else {
      relation.loading = true;
    }
    const id = this._getRelationId({ layerId, relation });
    //Promise
    const promise = new Promise(resolve => {
      opts.relation = relation;
      opts.layerId = layerId;
      //In case of relation 1:1
      opts.filterType = 'ONE' === relation.getType() ? '1:1' :  opts.filterType;
      const filterType =  opts.filterType || 'fid';
      const options = this.createEditingDataOptions(filterType, opts);
      const session = this._sessions[id];
      const toolbox = this.getToolBoxById(id);
      //check if si online and it has session
      if (online && session) {
        //show bar loading
        toolbox.startLoading();
        //check is session is already start
        if (session.isStarted()) {
          //try to get feature from source
          //without server reques
          this.getLayersDependencyFeaturesFromSource({
            layerId: id,
            relation,
            feature: opts.feature,
            operator: opts.operator
          })
            .then(find => {
              //if found
              if (find) {
                resolve(id);
                toolbox.stopLoading();
              } else {
                //request features from server
                session.getFeatures(options)
                  .always(promise => {
                    promise.always(() => {
                      toolbox.stopLoading();
                      resolve(id);
                    });
                  });
              }
            })
        } else {
          //start session and get features
          session.start(options)
            .always(promise => {
              promise.always(() => {
                toolbox.stopLoading();
                resolve(id);
              })
            });
        }
      } else {
        //try to get feature from source
        this.getLayersDependencyFeaturesFromSource({
          layerId: id,
          relation,
          feature: opts.feature,
          operator: opts.operator
        }).then(() => resolve(id))
      }
    });
    promises.push(promise);
  });
  // at the end se loading false
  Promise.all(promises)
    .finally(() => relations.forEach(relation => {
      if (relation.setLoading) {
        relation.setLoading(false);
      } else {
        relation.loading = false;
      }
    }));

  return Promise.all(promises);
};

/**
 * @param { string } layerId
 * 
 * @returns { Promise<unknown> }
 */
proto.commitDirtyToolBoxes = function(layerId) {
  return new Promise((resolve, reject) => {
    const toolbox = this.getToolBoxById(layerId);
    if (toolbox.isDirty() && toolbox.hasDependencies()) {
      this.commit({toolbox})
        .then(() => {
          resolve(toolbox);
        })
        .fail(() => {
          toolbox.revert()
            .then(() => {
              toolbox.getDependencies()
                .forEach((layerId) => {
                  if (this.getLayerById(layerId).getChildren().indexOf(layerId) !== -1) {
                    this.getToolBoxById(layerId).revert();
                  }
                })
            })
          reject(toolbox);
        })
    } else
      resolve(toolbox);
  });
};

/**
 * @param commitItems
 * 
 * @returns { string }
 * 
 * @private
 */
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

/**
 * @param { Object } opts 
 * @param opts.layer
 * @param opts.commitItems
 * @param opts.close
 * @param opts.commitPromise
 * 
 * @returns { Promise<unknown> }
 */
proto.showCommitModalWindow = function({
  layer,
  commitItems,
  close,
  commitPromise,
}) {
  // messages set to commit
  const messages = {
    success: {
      message: "plugins.editing.messages.saved",
      autoclose: true
    },
    error: {}
  };

  return new Promise((resolve, reject) =>{

    /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/commitfeaturesworkflow.js@v3.7.1 */
    const workflow = new EditingWorkflow({
      type: 'commitfeatures',
      steps: [ new ConfirmStep({ type: 'commit' }) ]
    })

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
 * Function called very single change saved temporary
 */
proto.saveChange = async function() {
  switch (this.saveConfig.mode) {
    case 'autosave':
      return this.commit({
        modal: false // set to not show modal ask window
      });
  }
};

/**
 * @param { Object } opts
 * @param { string } opts.layerId
 * @param { Array }  opts.fids
 */
proto.addLayersFeaturesToShowOnResult = function({
  layerId,
  fids = [],
}) {
  if (undefined === this.loadLayersFeaturesToResultWhenCloseEditing[layerId]) {
    this.loadLayersFeaturesToResultWhenCloseEditing[layerId] = new Set();
  }
  fids.forEach(fid => this.loadLayersFeaturesToResultWhenCloseEditing[layerId].add(fid))
};

/**
 * Called on close editingpanel panel
 */
proto.onCloseEditingPanel = async function() {
  await this.showChangesToResult();
  this.getToolBoxes().forEach(toolbox => toolbox.resetDefault());
};

/**
 * Show feature that are updated or created with editing on result content
 * 
 * @returns { Promise<void> }
 */
proto.showChangesToResult = async function() {
  const layerIdChanges = Object.keys(this.loadLayersFeaturesToResultWhenCloseEditing);
  if (layerIdChanges.length) {
    const inputs = {
      layers: [],
      fids: [],
      formatter: 1
    };
    layerIdChanges
      .forEach(layerId => {
        const fids = [...this.loadLayersFeaturesToResultWhenCloseEditing[layerId]];
        if (fids.length) {
          const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
          inputs.layers.push(layer);
          inputs.fids.push(fids);
        }
      });

    const promise = inputs.layers.length ?
      DataRouterService.getData('search:layersfids', {
        inputs,
        outputs: {
          title: 'plugins.editing.editing_changes',
          show: {loading: false}
        }
      }) :
      Promise.resolve();
    try {
      await promise;
    } catch(err) {}
  }
  this.loadLayersFeaturesToResultWhenCloseEditing = {};
};

/**
 * Commit and save changes on server persistently
 *
 * @param { Object } commit
 * @param commit.toolbox
 * @param commit.commitItems
 * @param commit.messages
 * @param commit.done
 * @param { boolean } commit.modal
 * @param { boolean } commit.close
 *
 * @returns {*}
 */
proto.commit = function({
  toolbox,
  commitItems,
  modal = true,
  close = false,
} = {}) {
  const d             = $.Deferred();
  const commitPromise = d.promise();
  const {
    cb = {},
    messages = {
      success:{},
      error:{}
    },
  }                   = this.saveConfig;
  toolbox             = toolbox || this.state.toolboxselected;
  let session         = toolbox.getSession();
  let layer           = toolbox.getLayer();
  const layerType     = layer.getType();
  const items         = commitItems;
  commitItems         = commitItems || session.getCommitItems();
  const {
    add = [],
    delete: cancel = [],
    update = [],
    relations = {},
  } = commitItems;

  //check if there are some changes to commit
  if (
    [
      ...add,
      ...cancel,
      ...update,
      ...Object.keys(relations)
    ].length === 0
  ) {
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
      //check if application is online
      if (ApplicationState.online) {
        session.commit({items: items || commitItems})
          .then((commitItems, response) => {
            //@TODO need to double check why ApplicationState.online is repeated
            if (ApplicationState.online) {
              //if result is true
              if (response.result) {
                const {autoclose=true, message="plugins.editing.messages.saved"} = messages.success;
                if (messages && messages.success) {
                  GUI.showUserMessage({
                    type: 'success',
                    message,
                    duration: 3000,
                    autoclose
                  });
                }

                //In case of vector layer need to refresh map commit changes
                if (layerType === Layer.LayerTypes.VECTOR) {
                  this._mapService.refreshMap({force: true});
                }

                if (cb.done && cb.done instanceof Function) {
                  cb.done(toolbox);
                }

                //add items when close editing to results to show changes
                this.addLayersFeaturesToShowOnResult({
                  layerId: toolbox.getId(),
                  fids: [
                    ...response.response.new.map(({id}) => id),
                    ...commitItems.update.map(update => update.id)
                  ]
                });
                //@since 3.7.2
                //it is useful when click on save all disk icon in editing forma for relation purpose
                this.emit('commit', response.response);

              } else { //result is false. An error occurs
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

                if (cb.error && cb.error instanceof Function) {
                  cb.error(toolbox, message || errorMessage);
                }
              }

              d.resolve(toolbox);
            }
          })
          .fail((error={}) => {
            //parse error server
            const parser = new serverErrorParser({
              error: error.errors ? error.errors : error
            });
            //set type string
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

            if (cb.error && cb.error instanceof Function) {
              cb.error(toolbox, message || errorMessage);
            }
          });
      //case offline
    } else {
      this.saveOfflineItem({
        data: {
          [session.getId()]: commitItems
        },
        id: OFFLINE_ITEMS.CHANGES
      })
        .then(() =>{
          GUI.showUserMessage({
            type: 'success',
            message: "plugins.editing.messages.saved_local",
            autoclose: true
          });
          session.clearHistory();
          d.resolve(toolbox);
        })
        .catch(error => {
          GUI.showUserMessage({
            type: 'alert',
            message: error,
            textMessage: true,
          });

          d.reject(toolbox);
        })
      }
    })
    .catch(() => {
      d.reject(toolbox)
  });

  return commitPromise;
};

/**
 * Clear all unique values fields related to layer (after closing editing panel).
 */
proto.clearAllLayersUniqueFieldsValues = function() {
  this.layersUniqueFieldsValues = {};
};

/**
 * Clear single layer unique field values (when stopping toolbox editing).
 * 
 * @param { string } layerId
 */
proto.clearLayerUniqueFieldsValues = function(layerId) {
  this.layersUniqueFieldsValues[layerId] = {};
};

/**
 * Remove unique values from unique fields of a layer (when deleting a feature)
 * 
 * @param { Object } opts
 * @param { string } opts.layerId
 * @param opts.feature
 */
proto.removeLayerUniqueFieldValuesFromFeature = function({
  layerId,
  feature,
}) {
  const fields = this.layersUniqueFieldsValues[layerId];
  if (fields) {
    Object
      .keys(feature.getProperties())
      .filter(field => undefined !== fields[field])
      .forEach(field => fields[field].delete(feature.get(field)));
  }
};

/**
 * @param { Object } opts
 * @param { string } opts.layerId
 * @param { string } opts.relationLayerId
 * @param opts.feature
 */
proto.removeRelationLayerUniqueFieldValuesFromFeature = function({
  layerId,
  relationLayerId,
  feature,
}) {

  const layer  = this.layersUniqueFieldsValues[relationLayerId];
  const fields = this.layersUniqueFieldsValues[layerId];

  /** @FIXME add description */
  if (undefined === layer) {
    return;
  }

  /** @FIXME add description */
  if (undefined === layer.__uniqueFieldsValuesRelations) {
    layer.__uniqueFieldsValuesRelations = {};
  }

  Object
    .keys(feature.getProperties())
    .forEach(property => {
      /** @FIXME add description */
      if (undefined === layer.__uniqueFieldsValuesRelations[layerId]) {
        layer.__uniqueFieldsValuesRelations[layerId] = {};
      }
      /** @FIXME add description */
      if (undefined !== fields[property]) {
        const values = new Set(fields[property]);
        values.delete(feature.get(property));
        layer.__uniqueFieldsValuesRelations[layerId][property] = values;
      }
    });
};

/**
 * @param { string } layerId
 * 
 * @returns { Promise<*> }
 */
proto.setLayerUniqueFieldValues = async function(layerId) {
  const promises = [];
  const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
  layer
    .getEditingFields()
    .forEach(field => {
      // skip when ..
      if (!(field.validate.unique && undefined === this.getLayerUniqueFieldValues({ layerId, field }))) {
        return;
      }
      promises.push(
        layer
          .getFilterData({ unique: field.name })
          .then((values = []) => {
            if (undefined === this.layersUniqueFieldsValues[layerId]) {
              this.layersUniqueFieldsValues[layerId] = {};
            }
            this.layersUniqueFieldsValues[layerId][field.name] = new Set(values);
          })
      );
    });
  await Promise.allSettled(promises);

  return this.layersUniqueFieldsValues[layerId];
};

/**
 * Save temporary relation feature changes on father (root) layer feature
 *
 * @param { string } layerId
 */
proto.saveTemporaryRelationsUniqueFieldsValues = function(layerId) {
  const relations = (
    this.layersUniqueFieldsValues[layerId] &&
    this.layersUniqueFieldsValues[layerId].__uniqueFieldsValuesRelations
  );

  // skip when no relation unique fields values are stored
  if (undefined === relations) {
    return;
  }

  Object
    .keys(relations)
    .forEach(relationLayerId => {
      Object
        .entries(relations[relationLayerId])
        .forEach(([fieldName, uniqueValues]) => {
          this.layersUniqueFieldsValues[relationLayerId][fieldName] = uniqueValues;
        })
    });

  this.clearTemporaryRelationsUniqueFieldsValues(layerId);
};

/**
 * @param { string } layerId
 */
proto.clearTemporaryRelationsUniqueFieldsValues = function(layerId) {
  if (this.layersUniqueFieldsValues[layerId]) {
    delete this.layersUniqueFieldsValues[layerId].__uniqueFieldsValuesRelations;
  }
};

/**
 * Get layer unique field value
 * @param { Object } opts
 * @param { string } opts.layerId layer id
 * @param opts.field filed name
 * 
 * @returns {*}
 */
proto.getLayerUniqueFieldValues = function({
  layerId,
  field,
}) {

  return this.layersUniqueFieldsValues[layerId] ?
    this.layersUniqueFieldsValues[layerId][field.name] :
    [];
};

/**
 * @param { Object } opts
 * @param { string } opts.layerId
 * @param { string } opts.relationLayerId
 * @param opts.field
 * 
 * @returns {*}
 */
proto.getChildLayerUniqueFieldValues = function({
  layerId,
  relationLayerId,
  field,
}) {
  const relations  = (
    this.layersUniqueFieldsValues[relationLayerId] &&
    this.layersUniqueFieldsValues[relationLayerId].__uniqueFieldsValuesRelations
  );
  const has_values = (
    undefined !== relations &&
    undefined !== relations[layerId] &&
    undefined !== relations[layerId][field.name]
  );
  return has_values ? relations[layerId][field.name] : this.getLayerUniqueFieldValues({ layerId, field });
};

/**
 * @param { Object } opts
 * @param { string } opts.layerId
 * @param opts.field
 * @param opts.oldValue
 * @param opts.newValue
 */
proto.changeLayerUniqueFieldValues = function({
  layerId,
  field,
  oldValue,
  newValue,
}) {
  if (
    undefined === this.layersUniqueFieldsValues[layerId] ||
    undefined === this.layersUniqueFieldsValues[layerId][field.name]
  ) {
    return;
  }
  const values = this.layersUniqueFieldsValues[layerId][field.name];
  values.delete(oldValue);
  values.add(newValue);
};

/**
 * @param { Object } opts
 * @param { string } opts.layerId
 * @param { string } opts.relationLayerId
 * @param opts.field
 * @param opts.oldValue
 * @param opts.newValue
 */
proto.changeRelationLayerUniqueFieldValues = function({
  layerId,
  relationLayerId,
  field,
  oldValue,
  newValue,
}) {
  const layer = this.layersUniqueFieldsValues[relationLayerId];

  if (undefined === layer) {
    return;
  }

  if (undefined === layer.__uniqueFieldsValuesRelations) {
    layer.__uniqueFieldsValuesRelations = {};
  }

  if (undefined === layer.__uniqueFieldsValuesRelations[layerId]) {
    layer.__uniqueFieldsValuesRelations[layerId] = {};
  }

  const values = new Set(this.layersUniqueFieldsValues[layerId][field.name]);

  values.delete(oldValue);
  values.add(newValue);

  layer.__uniqueFieldsValuesRelations[layerId][field.name] = values;
};

/**
 * @param { Object } opts
 * @param { string } opts.layerId
 * @param opts.field
 * @param opts.value
 */
proto.addLayerUniqueFieldValue = function({
  layerId,
  field,
  value,
}) {
  this.layersUniqueFieldsValues[layerId][field.name].add(value);
};

/**
 * @param { Object } opts
 * @param { string } opts.layerId
 * @param opts.field
 * @param opts.value
 */
proto.deleteLayerUniqueFieldValue = function({
  layerId,
  field,
  value,
}) {
  this.layersUniqueFieldsValues[layerId][field.name].delete(value);
};

/**
 * @param { Object } opts
 * @param { string } opts.layerId
 * @param { Array }  opts.sessionItems
 * @param opts.action
 */
proto.undoRedoLayerUniqueFieldValues = function({
  layerId,
  sessionItems = [],
  action,
}) {

  // if not set
  if (undefined === this.layersUniqueFieldsValues[layerId]) {
    return;
  }

  sessionItems.forEach(item => {

    Object
      .keys(this.layersUniqueFieldsValues[layerId])
      .forEach(name => {
        const is_array = Array.isArray(item);
        let oldVal, newVal;
        if (is_array) { // 0 = old feature, 1 = new feature
          const has_change = item[1].feature.get(name) != item[0].feature.get(name);
          // update feature that contains "new" and "old" values of feature
          oldVal = has_change ? (action === 'undo' ? item[1].feature.get(name) :  item[0].feature.get(name)) : undefined;
          newVal = has_change ? (action === 'undo' ? item[0].feature.get(name) :  item[1].feature.get(name)) : undefined;
        } else {
          oldVal = 'add' === item.feature.getState()    ? item.feature.get(name) : undefined;
          newVal = 'delete' === item.feature.getState() ? item.feature.get(name) : undefined;
        }
        if (undefined !== oldVal) {
          this.deleteLayerUniqueFieldValue({ layerId, field: { name }, value: oldVal });
        }
        if (undefined !== newVal) {
          this.addLayerUniqueFieldValue({ layerId, field: { name }, value: newVal });
        }
      });
  });
};

/**
 * @param { Object } opts
 * @param opts.relationSessionItems
 * @param opts.action
 */
proto.undoRedoRelationUniqueFieldValues = function({
 relationSessionItems,
 action,
}) {
  Object
    .entries(relationSessionItems)
    .forEach(([layerId, {own:sessionItems, dependencies:relationSessionItems}]) => {
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

/**
 * end unique fields
 */
proto.getProjectLayerById = function(layerId) {
  return CatalogLayersStoresRegistry.getLayerById(layerId);
};

/**
 * @param { Object } opts
 * @param { string } opts.layerId
 * @param opts.fid
 * 
 * @returns {Promise<*>}
 */
proto.getProjectLayerFeatureById = async function({
  layerId,
  fid,
}) {
  let feature;

  try {
    const response = await XHR.get({
      url: this.getProjectLayerById(layerId).getUrl('data'),
      params: {fids: fid},
    });
    const features = getFeaturesFromResponseVectorApi(response);
    if (features.length > 0) {
      feature = features[0];
    }
  } catch(e) {
    console.warn(e);
  }

  return feature;
};

/**
 * @param layer
 * @param { Object } options
 * @param { Array }  options.exclude
 * 
 * @returns {*}
 */
proto.getProjectLayersWithSameGeometryOfLayer = function(layer, options = { exclude: [] }) {
 const { exclude = [] } = options;
 const geometryType = layer.getGeometryType();
 return CatalogLayersStoresRegistry
  .getLayers()
  .filter(layer => {
    return (
      layer.isGeoLayer() &&
      layer.getGeometryType &&
      layer.getGeometryType() &&
      -1 === exclude.indexOf(layer.getId())
    ) && (
      layer.getGeometryType() === geometryType ||
      (
        isSameBaseGeometryType(layer.getGeometryType(), geometryType) &&
        Geometry.isMultiGeometry(geometryType)
      )
    )
  });
};

/**
 *  return (geometryType === featureGeometryType)
 *  || Geometry.isMultiGeometry(geometryType)
 *  || !Geometry.isMultiGeometry(featureGeometryType);
 */
proto.getExternalLayersWithSameGeometryOfLayer = function(layer) {
  const geometryType = layer.getGeometryType();
  return this._mapService
    .getExternalLayers()
    .filter(externalLayer => {
      const features = externalLayer.getSource().getFeatures();
      // skip when ..
      if (!(features && features.length > 0) || (features && features[0] && !features[0].getGeometry())) {
        return false;
      }
      const type = features[0].getGeometry().getType();
      return geometryType === type || isSameBaseGeometryType(geometryType, type);
    });
};

/**
 * Finalize "formatter" value for any kind of field
 * 
 * @param { string }   opts.layerId
 * @param {ol.Feature} opts.feature
 * @param { string }   opts.property
 * 
 * @returns (field.key) or (field.value)
 * 
 * @since g3w-client-plugin-editing@v3.7.0
 */
proto.getFeatureTableFieldValue = function({
  layerId,
  feature,
  property
} = {}) {

  // get editable fields
  const { fields } = this.getLayerById(layerId).config.editing;

  // get field value (raw)
  let value        = feature.get(property);

  // get key-value fields implicated into: https://github.com/g3w-suite/g3w-client-plugin-editing/pull/64
  const values = (null !== value) && (fields
    .filter(field => ['select_autocomplete', 'select'].includes(field.input.type)) || [] )
    .reduce((kv, field) => { kv[field.name] = field.input.options.values; return kv; }, {});

  // get last key-value feature add to
  const kv_field = values && values[property] && values[property].find(kv => value == kv.value);

  // return key for key-values fields (raw field value otherwise)
  return kv_field ? kv_field.key : value;
}

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/api/index.js@v3.7.1
 * 
 * Show editing panel
 * 
 * @param options
 * @param options.toolboxes
 *
 * @since g3w-client-plugin-editing@v3.7.2
 */
proto.showPanel = function(options = {}) {
  if (options.toolboxes && Array.isArray(options.toolboxes)) {
    this.getToolBoxes().forEach(tb => tb.setShow(-1 !== options.toolboxes.indexOf(tb.getId())));
  }
  this.getPlugin().showEditingPanel(options);
};

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/api/index.js@v3.7.1
 * 
 * Hide Editing Panel
 * 
 * @param options
 *
 * @since g3w-client-plugin-editing@v3.7.2
 */
proto.hidePanel = function(options = {}) {
  this.getPlugin().hideEditingPanel(options);
};

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/api/index.js@v3.7.1
 * 
 * Start editing API
 * 
 * @param layerId
 * @param { Object } options
 * @param { boolean } [options.selected=true]
 * @param { boolean } [options.disablemapcontrols=false]
 * @param { boolean } [options.showselectlayers=true]
 * @param options.title
 * 
 * @returns { Promise<unknown> }
 * 
 * @since g3w-client-plugin-editing@v3.7.2
 */
proto.startEditing = function(layerId, options = {}, data = false) {
  options.selected           = undefined === options.selected           ? true : options.selected;
  options.showselectlayers   = undefined === options.showselectlayers   ? true : options.showselectlayers;
  options.disablemapcontrols = undefined === options.disablemapcontrols ? false : options.showselectlayers;
  return new Promise((resolve, reject) => {
    // get toolbox related to layer id
    const toolbox = this.getToolBoxById(layerId);
    // set show select layers input visibility
    this.setShowSelectLayers(options.showselectlayers);
    // skip when ..
    if (!toolbox) {
      return reject();
    }
    // set selected
    toolbox.setSelected(options.selected);
    // set seletcted toolbox
    if (options.selected) {
      this.setSelectedToolbox(toolbox);
    }
    if (options.title) {
      toolbox.setTitle(options.title);
    }
    // start editing toolbox (options contain also filter type)
    toolbox
      .start(options)
      .then(data => {
        // disablemapcontrols in conflict
        if (options.disablemapcontrols) {
          this.disableMapControlsConflict(true);
        }
        // opts contain information about start editing has features loaded
        resolve(data ? { toolbox, data } : toolbox);
      })
      .fail(reject);
  });
};

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/api/index.js@v3.7.1
 * 
 * Stop editing on layerId
 * 
 * @param layerId
 * @param options
 * 
 * @returns { Promise<unknown> }
 * 
 * @since g3w-client-plugin-editing@v3.7.2
 */
proto.stopEditing = function(layerId, options = {}) {
  return new Promise((resolve, reject) => {
    this.getToolBoxById(layerId)
      .stop(options)
      .then(resolve)
      .fail(reject)
  })
};

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/api/index.js@v3.7.1
 * 
 * Add Feature
 * 
 * @param { Object } opts
 * @param opts.layerId
 * @param opts.feature
 * 
 * @since g3w-client-plugin-editing@v3.7.2
 */
proto.addLayerFeature = function({
 layerId,
 feature,
} = {}) {
 // skip when mandatory params are missing
 if (undefined === feature || undefined === layerId) {
   return Promise.reject();
 }
 return new Promise((resolve, reject) => {
   const layer = this.getLayerById(layerId);
   // get session
   const session = this.getSessionById(layerId);
   // exclude an eventually attribute pk (primary key) not editable (mean autoincrement)
   const attributes = layer
     .getEditingFields()
     .filter(attr => !(attr.pk && !attr.editable));
   // start session (get no features but set layer in editing)
   session.start({
     filter: {
       nofeatures: true,                    // no feature
       nofeatures_field: attributes[0].name // get first field in editing form
     },
     editing: true,
   })

   /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/easyaddfeatureworkflow.js@v3.7.1 */
   // create workflow
   const workflow = new EditingWorkflow({
    type: 'addfeature',
    steps: [
      new OpenFormStep({
        push: true,
        showgoback: false,
        saveAll: false,
      })
    ],
  });

   const stop = cb => {
     workflow.stop();
     session.stop();
     return cb();
   };

   try {
     //check if feature has property of layer
     attributes.forEach(a => {
       if (undefined === feature.get(a.name)) {
         feature.set(a.name, null);
       }
     })

     //set feature as g3w feature
     feature = new Feature({ feature, properties: attributes.map(a => a.name) });
     //set new
     feature.setTemporaryId();

     // add to session and source as new feature
     session.pushAdd(layerId, feature, false);
     layer.getEditingLayer().getSource().addFeature(feature);

     //start workflow
     workflow.start({
       inputs:  { layer, features: [feature] },
       context: { session },
     })
     .then(() => {
       session.save();
       this
         .commit({ modal: false, toolbox: this.getToolBoxById(layerId) })
         .then(() => stop(resolve))
         .fail(() => stop(reject))
     })
     .fail(() => stop(reject));

   } catch(e) {
     console.warn(e);
     reject();
   }
 })
};

EditingService.EDITING_FIELDS_TYPE = ['unique'];

module.exports = new EditingService;