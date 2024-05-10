import { createEditingDataOptions }         from '../utils/createEditingDataOptions';
import { setLayerUniqueFieldValues }        from '../utils/setLayerUniqueFieldValues';
import { getRelationsInEditing }            from '../utils/getRelationsInEditing';
import { getRelationId }                    from '../utils/getRelationId';
import { setAndUnsetSelectedFeaturesStyle } from '../utils/setAndUnsetSelectedFeaturesStyle';
import { EditingWorkflow }                  from '../g3wsdk/workflow/workflow';

import {
  OpenFormStep,
  ConfirmStep,
  CopyFeaturesFromOtherLayerStep,
  SelectElementsStep,
  PickFeatureStep,
  ChooseFeatureStep,
  AddFeatureStep,
  AddPartToMultigeometriesStep,
  GetVertexStep,
  MoveElementsStep,
  DeletePartFromMultigeometriesStep,
  MergeFeaturesStep,
  SplitFeatureStep,
  MoveFeatureStep,
  ModifyGeometryVertexStep,
  DeleteFeatureStep,
  AddTableFeatureStep,
  OpenTableStep,
}                          from '../workflows';

const Tool                 = require('../toolboxes/tool');

Object
  .entries({
    EditingWorkflow,
    OpenFormStep,
    ConfirmStep,
    CopyFeaturesFromOtherLayerStep,
    SelectElementsStep,
    PickFeatureStep,
    ChooseFeatureStep,
    AddPartToMultigeometriesStep,
    GetVertexStep,
    MoveElementsStep,
    DeletePartFromMultigeometriesStep,
    MergeFeaturesStep,
    SplitFeatureStep,
    MoveFeatureStep,
    ModifyGeometryVertexStep,
    Tool,
    AddTableFeatureStep,
    OpenTableStep,
    AddFeatureStep,
  })
  .forEach(([k, v]) => console.assert(undefined !== v, `${k} is undefined`));

const {
  ApplicationState,
  G3WObject
}                                = g3wsdk.core;
const {
  base,
  inherit,
  debounce,
  toRawType
}                                = g3wsdk.core.utils;
const { GUI }                    = g3wsdk.gui;
const { tPlugin }                = g3wsdk.core.i18n;
const { Layer }                  = g3wsdk.core.layer;
const { Session }                = g3wsdk.core.editing;
const { getScaleFromResolution } = g3wsdk.ol.utils;
const { Geometry }               = g3wsdk.core.geometry;
const { isSameBaseGeometryType } = g3wsdk.core.geoutils;




/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
 * 
 * @param { string } layerId
 *
 */
function _stopSessionChildren(layerId) {
  const service = g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing');
  const layer = service.getLayerById(layerId);
  const relations = getRelationsInEditing({
    relations: layer.getRelations() ? layer.getRelations().getArray() : [],
    layerId
  });
  relations
    .filter(relation => relation.getFather() === layerId)
    .forEach(relation => {
      const relationId = getRelationId({ layerId, relation });
      // In case of no editing is started (click on pencil of relation layer) need to stop (unlock) features
      if (!service.getToolBoxById(relationId).inEditing()) {
        service.state.sessions[relationId].stop();
      }
    })
}

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
 * 
 * Check if father relation is editing and has commit feature
 *
 * @param { string } layerId
 *
 * @returns father in editing
 */
function _fathersInEditing(layerId) {
  const service = g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing');
  return service.getLayerById(layerId)
    .getFathers()
    .filter(id => {
      const toolbox = service.getToolBoxById(id);
      if (toolbox && toolbox.inEditing() && toolbox.isDirty()) {
        //get temporary relations object
        const {relations={}} = toolbox.getSession().getCommitItems();
        //check if layerId has some changes
        return Object
          .keys(relations)
          .find(relationLayerId => layerId === relationLayerId);
      }
    });
}

function ToolBox(options={}) {
  base(this);

  this._start             = false;
  this._constraints       = options.constraints || {};
  this._layer             = options.layer;
  this.uniqueFields       = this.getUniqueFieldsType(this._layer.getEditingFields());
  this._layerType         = options.type || Layer.LayerTypes.VECTOR;
  this._loadedExtent      = null;
  this._tools             = options.tools;
  this._getFeaturesOption = {};
  // is used to constraint loading features to a filter set
  this.constraints        = { filter: null, show: null, tools: []};
  this._session           = new Session({ id: options.id, editor: this._layer.getEditor()});
  this._getFeaturesOption = {};
  this._enabledtools;
  this._disabledtools;

  // get informed when save on server
  if (this.uniqueFields) {
    this.getFieldUniqueValuesFromServer();
    this._session.onafter('saveChangesOnServer', () => {
      this._resetUniqueValues();
    });
  }

  this.state = {
    id               : options.id,
    changingtools    : false, // used to show or not tools during change phase
    show             : true, // used to show or not the toolbox if we need to filtered
    color            : options.color || 'blue',
    title            : options.title || "Edit Layer",
    customTitle      : false,
    loading          : false,
    enabled          : false,
    toolboxheader    : true,
    startstopediting : true,
    message          : null,
    toolmessages     : { help: null },
    toolsoftool      : [],
    tools            : this._tools.map(tool => tool.getState()),
    selected         : false,
    activetool       : null,
    editing          : {
      session      : this._session.state,
      history      : this._session.getHistory().state,
      on           : false,
      dependencies : [],
      relations    : [],
      father       : false,
      canEdit      : true
    },
    layerstate       : this._layer.state
  };

  /**
   *  save original value of state in case of custom changes
   * 
   */
  this.originalState = {
    title: this.state.title,
    toolsoftool: [...this.state.toolsoftool]
  };

  /**
   * Store key events setters
   * 
   * @since g3w-client-plugin-editing@v3.7.0
   */
  this._unregisterStartSettersEventsKey = [];

  this._tools
    .forEach(tool => tool.setSession(this._session));

  this._session.onafter('stop', () => {
    if (this.inEditing()) {
      if (ApplicationState.online) {
        _stopSessionChildren(this.state.id);
      }
      if (this._getFeaturesOption.registerEvents) {
        this._unregisterGetFeaturesEvent();
      }
    }
  });

  this._session.onafter('start', options => {
    if (options.registerEvents) {
      this._getFeaturesEvent = {
        event: null,
        fnc: null
      };
      this._getFeaturesOption = options;
      this._registerGetFeaturesEvent(this._getFeaturesOption);
      if (Layer.LayerTypes.VECTOR === options.type && GUI.getContentLength()) {
        GUI.once('closecontent', () => {
          setTimeout(() => {
            GUI.getService('map').getMap().dispatchEvent(this._getFeaturesEvent.event)
          })
        });
      }
    }
  });
}

inherit(ToolBox, G3WObject);

const proto = ToolBox.prototype;

/**
 *
 * @return {*|{toolboxheader: boolean, layerstate, color: string, toolsoftool: *[], show: boolean, customTitle: boolean, startstopediting: boolean, title: string, loading: boolean, message: null, tools: *[], enabled: boolean, editing: {session, father: boolean, canEdit: boolean, history, relations: *[], on: boolean, dependencies: *[]}, toolmessages: {help: null}, changingtools: boolean, id, activetool: null, selected: boolean}}
 */
proto.getState = function() {
  return this.state;
};

/**
 *
 * @param bool
 */
proto.setShow = function(bool=true){
  this.state.show = bool;
};

/**
 *
 * @return {*}
 */
proto.getLayer = function() {
  return this._layer;
};

/**
 *
 * @param bool
 */
proto.setFather = function(bool) {
  this.state.editing.father = bool;
};

/**
 *
 * @return {boolean}
 */
proto.isFather = function() {
  return this.state.editing.father;
};

/**
 *
 * @param relations
 */
proto.addRelations = function(relations = []) {
  relations.forEach(relation => this.addRelation(relation));
};

/**
 *
 * @return {*}
 */
proto.revert = function() {
  return this._session.revert();
};

/**
 *
 * @param relation
 */
proto.addRelation = function(relation) {
  this.state.editing.relations.push(relation);
};

/**
 *
 * @return {[]}
 */
proto.getDependencies = function() {
  return this.state.editing.dependencies;
};

/**
 *
 * @return {boolean}
 */
proto.hasDependencies = function() {
  return this.state.editing.dependencies.length > 0;
};

/**
 *
 * @param dependencies
 */
proto.addDependencies = function(dependencies) {
  dependencies.forEach(dependency => this.addDependency(dependency));
};

/**
 *
 * @param dependency
 */
proto.addDependency = function(dependency) {
  this.state.editing.dependencies.push(dependency);
};

/**
 *
 * @param reset
 */
proto.getFieldUniqueValuesFromServer = function({
  reset=false
}={}) {
  this._layer.getWidgetData({
    type: 'unique',
    fields: Object.values(this.uniqueFields).map(field => field.name).join()
  })
  .then((response) => {
    Object
      .entries(response.data)
      .forEach(([fieldName, values]) => {
        if (reset) {
          this.uniqueFields[fieldName].input.options.values.splice(0);
        }
        values.forEach(value => this.uniqueFields[fieldName].input.options.values.push(value));
      })
  })
  .fail(console.warn)
};

/**
 *
 * @param fields
 * @return {{}|null}
 */
proto.getUniqueFieldsType = function(fields) {
  const uniqueFields = {};
  let find = false;
  fields
    .forEach(field => {
      if (field.input && 'unique' === field.input.type) {
        uniqueFields[field.name] = field;
        find = true;
      }
    });
  return find && uniqueFields || null;
};

/**
 *
 * @private
 */
proto._resetUniqueValues = function() {
  this.getFieldUniqueValuesFromServer({
    reset: true
  })
};

/*
check if vectorLayer
 */
proto.isVectorLayer = function() {
  return Layer.LayerTypes.VECTOR === this._layerType;
};

/**
 * Method to create getFeatures options
 * @param filter
 */
proto.setFeaturesOptions = function({
  filter } = {}
) {
  if (filter) {
    // in case of no features filter request check if no features_filed is present otherwise it get first field
    if (filter.nofeatures) {
      filter.nofeatures_field = filter.nofeatures_field || this._layer.getEditingFields()[0].name;
    }
    this._getFeaturesOption = {
      filter,
      editing: true,
      registerEvents: false
    };
    // in case of constraint attribute set the filter as constraint
    if (filter.constraint) {
      this.setConstraintFeaturesFilter(filter);
    }
  } else {
    this._getFeaturesOption = createEditingDataOptions(Layer.LayerTypes.TABLE === this._layerType ? 'all': 'bbox', { layerId: this.getId() });
  }
};

/**
 *
 * @param constraints
 */
proto.setEditingConstraints = function(constraints={}) {
  Object
    .keys(constraints)
    .forEach(constraint => this.constraints[constraint] = constraints[constraint]);
};

/**
 * Clear single layer unique field values (when stopping toolbox editing).
 */
proto.clearLayerUniqueFieldsValues = function() {
  g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').state.uniqueFieldsValues[this.getId()] = {};
};

//added option object to start method to have a control by other plugin how
proto.start = function(options={}) {
  const d                     = $.Deferred();
  const id                    = this.getId();
  const applicationConstraint = g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').state.constraints.toolboxes[id];
  const EventName             = 'start-editing';

  let {
    toolboxheader    = true,
    startstopediting = true,
    showtools        = true,
    changingtools    = false,
    tools,
    filter,
  }                           = options;

  this.state.changingtools    = changingtools;
  if (tools) {
    this.setEnablesDisablesTools(tools);
  }
  this.state.toolboxheader    = toolboxheader;
  this.state.startstopediting = startstopediting;

  filter = applicationConstraint && applicationConstraint.filter || this.constraints.filter || filter;
  // set filterOptions
  this.setFeaturesOptions({ filter });

  //register lock features to show message
  const lockSetter = 'featuresLockedByOtherUser';
  const unKeyLock = this._layer.getFeaturesStore().onceafter(
    lockSetter, //setters name
    () => {                      //handler
      GUI.showUserMessage({
        type: 'warning',
        subtitle: this._layer.getName().toUpperCase(),
        message: 'plugins.editing.messages.featureslockbyotheruser'
      })
    }
  )
  //add featuresLockedByOtherUser setter
  this._unregisterStartSettersEventsKey.push(
    () => this._layer.getFeaturesStore().un(lockSetter, unKeyLock)
  );

  const handlerAfterSessionGetFeatures = promise => {
    this.emit(EventName);
    setLayerUniqueFieldValues(this.getId())
      .then(async () => {
        await g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').runEventHandler({
          type: EventName,
          id
        });
        promise
          .then(async features => {
            this.stopLoading();
            this.setEditing(true);
            await g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').runEventHandler({
              type: 'get-features-editing',
              id,
              options: {
                features
              }
            });

            d.resolve({features})
          })
          .fail(async error => {
            GUI.notify.error(error.message);
            await g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').runEventHandler({
              type: 'error-editing',
              id,
              error
            });
            this.stop();
            this.stopLoading();
            d.reject(error);
          })
      });
  }

  if (this._session) {
    if (!this._session.isStarted()) {
      //added case of mobile
      if (
        ApplicationState.ismobile
        && GUI.getService('map').isMapHidden()
        && Layer.LayerTypes.VECTOR === this._layerType
      ) {
        this.setEditing(true);
        GUI
          .getService('map')
          .onceafter('setHidden', () =>{
            setTimeout(() => {
              this._start = true;
              this.startLoading();
              this.setFeaturesOptions({ filter });
              this._session
                .start(this._getFeaturesOption)
                .then(handlerAfterSessionGetFeatures)
                .fail(()=>this.setEditing(false));
            }, 300);
        })
      } else {
        this._start = true;
        this.startLoading();
        this._session
          .start(this._getFeaturesOption)
          .then(handlerAfterSessionGetFeatures)
      }
    } else {
      if (!this._start) {
        this.startLoading();
        this._session
          .getFeatures(this._getFeaturesOption)
          .then(handlerAfterSessionGetFeatures);
        this._start = true;
      }
      this.setEditing(true);
    }
  }
  return d.promise();
};

/**
 *
 */
proto.startLoading = function() {
  this.state.loading = true;
};

/**
 *
 */
proto.stopLoading = function() {
  this.state.loading = false;
};

/**
 *
 * @return {*}
 */
proto.getFeaturesOption = function() {
  return this._getFeaturesOption;
};

/**
 *
 * @return {*}
 */
proto.stop = function() {
  const EventName  = 'stop-editing';
  const d          = $.Deferred();
  if (this.disableCanEditEvent) {
    this.disableCanEditEvent();
  }
  this._unregisterStartSettersEventsKey.forEach(fnc => fnc());

  this._unregisterStartSettersEventsKey = [];

  if (this._session && this._session.isStarted()) {
    if (ApplicationState.online) {
      if (_fathersInEditing(this.state.id).length > 0) {
        this.stopActiveTool();
        this.state.editing.on = false;
        this.enableTools(false);
        this.clearToolboxMessages();
        this._unregisterGetFeaturesEvent();
        _stopSessionChildren(this.state.id);
        this.setSelected(false);
        this.clearLayerUniqueFieldsValues();
      } else {
        this._session.stop()
          .then(promise => {
            promise.then(() => {
              this._start           = false;
              this.state.editing.on = false;
              this.state.enabled    = false;

              this.stopLoading();
              this._getFeaturesOption = {};
              this.stopActiveTool();
              this.enableTools(false);
              this.clearToolboxMessages();
              this.setSelected(false);
              this.emit(EventName);
              this.clearLayerUniqueFieldsValues();
              d.resolve(true)
            })
          })
          .fail(err => d.reject(err))
          .always(() => this.setSelected(false))
      }
    }
  } else {
    this.setSelected(false);
    d.resolve(true)
  }
  return d.promise();
};

/**
 *
 */
proto.save = function () {
  this._session.commit();
};

/**
 *
 * @private
 */
proto._unregisterGetFeaturesEvent = function() {
  switch(this._layerType) {
    case Layer.LayerTypes.VECTOR:
      GUI.getService('map').getMap().un(this._getFeaturesEvent.event, this._getFeaturesEvent.fnc);
      break;
    default:
      return;
  }
};

/**
 *
 * @param options
 * @private
 */
proto._registerGetFeaturesEvent = function(options={}) {
  switch(this._layerType) {
    case Layer.LayerTypes.VECTOR:
      // only in case filter bbox
      if (options.filter.bbox) {
        const fnc = () => {
          const canEdit = this.state.editing.canEdit;
          this._layer.getEditingLayer().setVisible(canEdit);
          //added ApplicationState.online
          if (ApplicationState.online && canEdit && GUI.getContentLength() === 0) {
            options.filter.bbox = GUI.getService('map').getMapBBOX();
            this.state.loading = true;
            this._session
              .getFeatures(options)
              .then(promise => {
                promise.then(() => this.state.loading = false);
              })
          }
        };
        this._getFeaturesEvent.event = 'moveend';
        this._getFeaturesEvent.fnc   = debounce(fnc, 300);
        GUI.getService('map').getMap().on('moveend', this._getFeaturesEvent.fnc);
      }
      break;
    default:
      return;
  }
};

/**
 *
 * @param filter
 */
proto.setConstraintFeaturesFilter = function(filter){
  this.constraintFeatureFilter = filter;
};

/**
 *
 * @return {*|{}}
 */
proto.getEditingConstraints = function() {
  return this._constraints;
};

/**
 *
 * @param type
 * @return {*}
 */
proto.getEditingConstraint = function(type) {
  return this.getEditingConstraints()[type];
};

/**
 *
 * @return {boolean}
 */
proto.canEdit = function() {
  return this.state.editing.canEdit;
};

/**
 *
 * @private
 */
proto._canEdit = function() {
  if (this._constraints.scale) {
    const scale = this._constraints.scale;
    const message = `${tPlugin('editing.messages.constraints.enable_editing')}${scale}`.toUpperCase();
    this.state.editing.canEdit = getScaleFromResolution(GUI.getService('map').getMap().getView().getResolution()) <= scale;
    GUI.setModal(!this.state.editing.canEdit, message);
    const fnc = (event) => {
      this.state.editing.canEdit = getScaleFromResolution(event.target.getResolution()) <= scale;
      GUI.setModal(!this.state.editing.canEdit, message);
    };
    GUI.getService('map').getMap().getView().on('change:resolution', fnc);
    this.disableCanEditEvent = () => {
      GUI.setModal(false);
      GUI.getService('map').getMap().getView().un('change:resolution', fnc);
    }
  }
};

/**
 *
 * @private
 */
proto._disableCanEdit = function() {
  this.state.editing.canEdit = true;
  this.disableCanEditEvent && this.disableCanEditEvent()
};

/**
 *
 * @param message
 */
proto.setMessage = function(message) {
  this.state.message = message;
};

/**
 *
 * @return {null}
 */
proto.getMessage = function() {
  return this.state.message;
};

/**
 *
 */
proto.clearMessage = function() {
  this.setMessage(null);
};

/**
 *
 */
proto.clearToolboxMessages = function() {
  this.clearToolMessage();
  this.clearMessage();
};

/**
 *
 * @return {*}
 */
proto.getId = function() {
  return this.state.id;
};

/**
 *
 * @param id
 */
proto.setId = function(id) {
  this.state.id = id;
};

/**
 *
 * @return {string}
 */
proto.getTitle = function() {
  return this.state.title;
};

/**
 *
 * @param title
 */
proto.setTitle = function(title) {
  this.state.customTitle = true;
  this.state.title = title;
};

/**
 *
 * @return {string}
 */
proto.getColor = function() {
  return this.state.color;
};

/**
 * Function that enable toolbox
 * @param bool
 */
proto.setEditing = function(bool=true) {
  this.setEnable(bool);
  this.state.editing.on = bool;
  this.enableTools(bool);
};

/**
 *
 * @return {boolean}
 */
proto.inEditing = function() {
  return this.state.editing.on;
};

/**
 *
 * @return {boolean}
 */
proto.isEnabled = function() {
  return this.state.enabled;
};

/**
 *
 * @param bool
 * @return {boolean}
 */
proto.setEnable = function(bool=false) {
  this.state.enabled = bool;
  return this.state.enabled;
};

/**
 *
 * @return {boolean}
 */
proto.isLoading = function() {
  return this.state.loading;
};

/**
 *
 * @return {*}
 */
proto.isDirty = function() {
  return this.state.editing.history.commit;
};

/**
 *
 * @return {boolean}
 */
proto.isSelected = function() {
  return this.state.selected;
};

/**
 *
 * @param bool
 */
proto.setSelected = function(bool=false) {
  this.state.selected = bool;
  this.state.selected ? this._canEdit() : this._disableCanEdit();
};

/**
 *
 * @return {*}
 */
proto.getTools = function() {
  return this._tools;
};

/**
 *
 * Return tool by id
 * @param toolId
 * @returns {*|number|bigint|T|T}
 */
proto.getToolById = function(toolId) {
  return this._tools.find(tool => toolId === tool.getId());
};

/**
 *
 * @param toolId
 */
proto.setEnableTool = function(toolId) {
  this._tools.find(tool => tool.getId() === toolId).setEnabled(true)
};

/**
 * method to set tools bases on add
 * editing_constraints : true // follow the tools related toi editing conttraints configuration
 */
proto.setAddEnableTools = function({
  tools={},
  options= {editing_constraints: true }
} = {}) {
  const { editing_constraints = false } = options;
  const ADDONEFEATUREONLYTOOLSID        = [
    'addfeature',
    'editattributes',
    'movefeature',
    'movevertex'
  ];
  const add_tools = this._tools
    .filter(tool => {
      return editing_constraints ?
        tool.getType().find(type => type ==='add_feature') :
        ADDONEFEATUREONLYTOOLSID.indexOf(tool.getId()) !== -1;
    })
    .map(tool => {
      const id = tool.getId();
      return {id, options: tools[id]}
  });

  this.setEnablesDisablesTools({
    enabled: add_tools
  });

  this.enableTools(true);
};

/**
 * method to set tools bases on update
 */
proto.setUpdateEnableTools = function({
  tools={},
  excludetools=[],
  options = { editing_constraints: true }
}) {
  const { editing_constraints = false } = options;
  const UPDATEONEFEATUREONLYTOOLSID     = [
    'editattributes',
    'movefeature',
    'movevertex'
  ];
  const update_tools = this._tools
    .filter(tool => {
      // exclude
      if (-1 !== excludetools.indexOf(tool.getId()) ) {
        return false;
      }
      return editing_constraints
        ? tool.getType().find(type => type ==='change_feature' || type ==='change_attr_feature')
        : -1 !== UPDATEONEFEATUREONLYTOOLSID.indexOf(tool.getId()) ;
    })
    .map(tool => {
      const id = tool.getId();
      return { id, options: tools[id]}
    });

  this.setEnablesDisablesTools({ enabled: update_tools });
  this.enableTools(true);
};

/**
 * method to set tools bases on delete
 */

proto.setDeleteEnableTools = function(options={}){
  //TODO
};

/**
 * Method to set enable tools
 *
 * @param tools
 */
proto.setEnablesDisablesTools = function(tools) {
  if (tools) {
    this.state.changingtools = true;
    // Check if tools is an array
    const {
      enabled  : enableTools = [],
      disabled : disableTools = []
    } = tools;

    const toolsId = enableTools.length ? [] : this._tools.map(tool => tool.getId());

    enableTools
      .forEach(({id, options={}}) => {
        //check if id of tool passed as argument is right
        const tool =this.getToolById(id);
        if (tool) {
          const {active=false} = options;
          tool.setOptions(options);
          if (tool.isVisible()) {
            toolsId.push(id);
          }
          if (active) {
            this.setActiveTool(tool);
          }
          if (this._enabledtools === undefined) {
            this._enabledtools = [];
          }
          this._enabledtools.push(tool);
       }
      });
    //disabled and visible
    disableTools
      .forEach(({id, options}) =>{
        const tool = this.getToolById(id);
        if (tool){
          if (this._disabledtools === undefined) {
            this._disabledtools = [];
          }
          this._disabledtools.push(id);
          //add it toi visible tools
          toolsId.push(id);
        }
      });
    //set not visible all remain
    this._tools.forEach(tool => !toolsId.includes(tool.getId()) && tool.setVisible(false));
    this.state.changingtools = false;
  }
};

// enable all tools
proto.enableTools = function(bool = false) {
  const tools = this._enabledtools || this._tools;
  const disabledtools = this._disabledtools || [];
  tools
    .forEach(tool => {
      const { conditions:{enabled=bool} } = tool;
      const enableTool = (bool && disabledtools.length)
        ? disabledtools.indexOf(tool.getId()) === -1
        : toRawType(enabled) === 'Boolean'
          ? enabled
          : enabled({ bool, tool });
    tool.setEnabled(enableTool);
    if (!bool) {
      tool.setActive(bool);
    }
  })
};

/**
 *
 * @param tool
 */
proto.setActiveTool = function(tool) {
  this.stopActiveTool(tool)
    .then(() => {
      this.clearToolsOfTool();
      this.state.activetool = tool;
      tool.once('settoolsoftool', tools => tools.forEach(tool => this.state.toolsoftool.push(tool)));
      const _activedeactivetooloftools = (activetools, active) => {
        this.state.toolsoftool.forEach(tooloftool => {
          if (activetools.indexOf(tooloftool.type) !== -1) {
            tooloftool.options.active = active;
          }
        });
      };

      tool.on('active', (activetools=[]) => _activedeactivetooloftools(activetools, true));
      tool.on('deactive', (activetools=[]) => _activedeactivetooloftools(activetools, false));
      tool.start(GUI.getService('map').isMapHidden());

      this.setToolMessage(this.getToolMessage());

    });
};

/**
 *
 */
proto.clearToolsOfTool = function() {
  this.state.toolsoftool.splice(0);
};

/**
 *
 * @return {null}
 */
proto.getActiveTool = function() {
  return this.state.activetool;
};

/**
 *
 */
proto.restartActiveTool = function() {
  const activeTool = this.getActiveTool();
  this.stopActiveTool();
  this.setActiveTool(activeTool);
};

/**
 *
 * @param tool
 * @return {*}
 */
proto.stopActiveTool = function(tool) {
  const d          = $.Deferred();
  const activeTool = this.getActiveTool();
  if (activeTool && tool !== activeTool ) {
    activeTool.removeAllListeners();
    activeTool
      .stop(true)
      .then(() => {
        this.clearToolsOfTool();
        this.clearToolMessage();
        this.state.activetool = null;
        setTimeout(d.resolve);
      })
      .fail(console.warn)
  } else {
    if (tool) {
      tool.removeAllListeners();
    }
    d.resolve()
  }
  return d.promise();
};

/**
 *
 */
proto.clearToolMessage = function() {
  this.state.toolmessages.help = null;
};

/**
 *
 * @return {*}
 */
proto.getToolMessage = function() {
  return this.getActiveTool().getMessage();
};

/**
 *
 * @param messages
 */
proto.setToolMessage = function(messages = {}) {
  this.state.toolmessages.help = messages && messages.help || null;
};

/**
 *
 * @return {*}
 */
proto.getSession = function() {
  return this._session;
};

/**
 *
 * @return {*}
 */
proto.getEditor = function() {
  return this._editor;
};

/**
 *
 * @param editor
 */
proto.setEditor = function(editor) {
  this._editor = editor;
};

/**
 *
 * @return {*}
 */
proto.hasChildren = function() {
  return this._layer.hasChildren();
};

/**
 *
 * @return {*}
 */
proto.hasFathers = function() {
  return this._layer.hasFathers();
};

/**
 *
 * @return {*}
 */
proto.hasRelations = function() {
  return this._layer.hasRelations();
};

/**
 * Method to reset default values
 */
proto.resetDefault = function() {
  this.state.title            = this.originalState.title;
  this.state.toolboxheader    = true;
  this.state.startstopediting = true;
  this.constraints = {
    filter: null,
    show: null,
    tools: []
  };

  if (this._enabledtools) {
    this._enabledtools = undefined;
    this.enableTools();
    this._tools.forEach(tool => tool.resetDefault());
  }
  this._disabledtools = null;
  this.setShow(true);
};

/**
 * ORIGINAL SOURCE: g3w-client-plugin/toolboxes/toolsfactory.js@v3.7.1
 */
ToolBox.create = function(layer) {

  /** @type { 'create' | 'update_attributes' | 'update_geometry' | delete' | undefined } undefined means all possible tools base on type */
  const capabilities    = layer.getEditingCapabilities();
  const type            = layer.getType();
  const is_vector       = (undefined === type || Layer.LayerTypes.VECTOR === type);
  const geometryType    = is_vector && layer.getGeometryType();
  const is_point        = is_vector && Geometry.isPointGeometryType(geometryType);
  const is_line         = is_vector && Geometry.isLineGeometryType(geometryType);
  const is_poly         = is_vector && Geometry.isPolygonGeometryType(geometryType);
  const is_table        = Layer.LayerTypes.TABLE === type;
  const isMultiGeometry = geometryType && Geometry.isMultiGeometry(geometryType);
  const iconGeometry    = is_vector && (is_point ? 'Point' : is_line ? 'Line' : 'Polygon');

  return new ToolBox({
    id :          layer.getId(),
    color :       layer.getColor(),
    type,
    layer,
    lngTitle :    'editing.toolbox.title',
    title :       ` ${layer.getTitle()}`,
    constraints : layer.getEditingConstrains(),
    tools :       [
      //Add Feature
      (is_vector) && {
        id: 'addfeature',
        type: ['add_feature'],
        name: 'editing.tools.add_feature',
        icon: `add${iconGeometry}.png`,
        layer,
        row: 1,
        /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/addfeatureworkflow.js@v3.7.1 */
        op(options = {}) {
          const w = new EditingWorkflow({
            ...options,
            type: 'addfeature',
            steps: [
              new AddFeatureStep(options),
              new OpenFormStep(options),
            ],
          });
          w.addToolsOfTools({ step: w.getStep(0), tools: ['snap', 'measure'] });
          return w;
        },
      },
      //Edit Attributes Feature
      (is_vector) && {
        id: 'editattributes',
        type: ['change_attr_feature'],
        name: 'editing.tools.update_feature',
        icon: 'editAttributes.png',
        layer,
        row: 1,
        /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/editfeatureattributesworkflow.js@v3.7.1 */
        op(options = {}) {
          const w = new EditingWorkflow({
            ...options,
            helpMessage: 'editing.tools.update_feature',
            type: 'editfeatureattributes',
            steps: [
              new PickFeatureStep(),
              new ChooseFeatureStep(),
              new OpenFormStep(),
            ],
          });
          return w;
        },
      },
      //Delete Feature
      (is_vector) && {
        id: 'deletefeature',
        type: ['delete_feature'],
        name: 'editing.tools.delete_feature',
        icon: `delete${iconGeometry}.png`,
        layer,
        row: 1,
        /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/deletefeatureworkflow.js@v3.7.1 */
        op(options = {}) {
          return new EditingWorkflow({
            ...options,
            type: 'deletefeature',
            steps: [
              new PickFeatureStep(),
              new ChooseFeatureStep(),
              new DeleteFeatureStep(),
              new ConfirmStep({
                dialog(inputs) {
                  let d                   = $.Deferred();
                  const editingLayer      = inputs.layer.getEditingLayer();
                  const feature           = inputs.features[0];
                  const layerId           = inputs.layer.getId();
                  GUI
                    .dialog
                    .confirm(
                      `<h4>${tPlugin('editing.messages.delete_feature')}</h4>`
                      + `<div style="font-size:1.2em;">`
                      + (inputs.layer.getChildren().length && getRelationsInEditing({ layerId, relations: inputs.layer.getRelations().getArray() }).length
                          ? tPlugin('editing.messages.delete_feature_relations')
                          : ''
                        )
                      + `</div>`,
                      result => {
                        if (!result) {
                          d.reject(inputs);
                          return;
                        }
                        editingLayer.getSource().removeFeature(feature);
                        // Remove unique values from unique fields of a layer (when deleting a feature)
                        const fields = g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').state.uniqueFieldsValues[layerId];
                        if (fields) {
                          Object
                            .keys(feature.getProperties())
                            .filter(field => undefined !== fields[field])
                            .forEach(field => fields[field].delete(feature.get(field)));
                        }
                        d.resolve(inputs);
                      }
                    );
                  const promise = d.promise();
                  if (inputs.features) {
                    setAndUnsetSelectedFeaturesStyle({ promise, inputs, style: this.selectStyle });
                  }
                  return promise;
                }
              }),
            ],
          });
        },
      },
      //Edit vertex Feature
      (is_line || is_poly) && {
        id: 'movevertex',
        type: ['change_feature'],
        name: "editing.tools.update_vertex",
        icon: "moveVertex.png",
        layer,
        row: 1,
        /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/modifygeometryvertexworkflow.js@v3.7.1 */
        op(options = {}) {
          const w = new EditingWorkflow({
            ...options,
            type: 'modifygeometryvertex',
            helpMessage: 'editing.tools.update_vertex',
            steps: [
              new PickFeatureStep(options),
              new ChooseFeatureStep(),
              new ModifyGeometryVertexStep(),
            ],
          })
          w.addToolsOfTools({ step: w.getStep(2), tools: ['snap', 'measure'] });
          return w;
        },
      },
      //Edit Attributes to Multi features
      (is_vector) && {
        id: 'editmultiattributes',
        type: ['change_attr_feature'],
        name: "editing.tools.update_multi_features",
        icon: "multiEditAttributes.png",
        layer,
        row: 2,
        once: true,
        /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/editmultifeatureattributesworkflow.js@v3.7.1 */
        op(options = {}) {
          return new EditingWorkflow({
            ...options,
            type: 'editmultiattributes',
            helpMessage: 'editing.tools.update_multi_features',
            registerEscKeyEvent: true,
            steps: [
              new SelectElementsStep({
                type: 'multiple',
                steps: {
                  select: {
                    description: `editing.workflow.steps.${ApplicationState.ismobile ? 'selectDrawBoxAtLeast2Feature' : 'selectMultiPointSHIFTAtLeast2Feature'}`,
                    buttonnext: {
                      disabled: true,
                      condition:({ features=[] }) => features.length < 2,
                      done: () => {}
                    },
                    directive: 't-plugin',
                    dynamic: 0,
                    done: false
                  }
                }
              }),
              new OpenFormStep({ multi: true }),
            ],
          });
        },
      },
      //Move Feature
      (is_vector) && {
        id: 'movefeature',
        type: ['change_feature'],
        name: 'editing.tools.move_feature',
        icon: `move${iconGeometry}.png`,
        layer,
        row: 2,
        /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/movefeatureworkflow.js@v3.7.1 */
        op(options = {}) {
          return new EditingWorkflow({
            ...options,
            type: 'movefeature',
            helpMessage: 'editing.tools.move_feature',
            steps: [
              new PickFeatureStep(),
              new ChooseFeatureStep(),
              new MoveFeatureStep(),
            ],
          });
        },
      },
      //Copy Feature from another layer
      (is_vector) && {
        id: 'copyfeaturesfromotherlayer',
        type: ['add_feature'],
        name: "editing.tools.pastefeaturesfromotherlayers",
        icon: "pasteFeaturesFromOtherLayers.png",
        layer,
        once: true,
        conditions: {
          enabled: (function() {
            const map          = GUI.getService('map');
            const layerId      = layer.getId();
            const geometryType = layer.getGeometryType();
            const selection    = map.defaultsLayers.selectionLayer.getSource();
            const data = {
              bool: false,
              tool: undefined
            };
            // check selected feature layers
            const selected = () => {
              const enabled = data.bool && selection
                .getFeatures()
                .filter(f => {
                  const type = f.getGeometry() && f.getGeometry().getType();
                  return (f.__layerId !== layerId) && isSameBaseGeometryType(geometryType, type) && ((geometryType === type) || Geometry.isMultiGeometry(geometryType) || !Geometry.isMultiGeometry(type));
                }).length > 0;
              data.tool.setEnabled(enabled);
              return enabled;
            };
            return ({ bool, tool = {} }) => {
              data.tool = tool;
              data.bool = bool;
              selection[bool ? 'on' : 'un']('addfeature', selected);
              selection[bool ? 'on' : 'un']('removefeature', selected);
              return selected();
            }
          }())
        },
        row: 2,
        /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/copyfeaturesfromotherlayerworkflow.js@v3.7.1 */
        op(options = {}) {
          const openFormStep = new OpenFormStep({ ...options, help: 'editing.steps.help.copy' });
          return new EditingWorkflow({
            ...options,
            type: 'copyfeaturesfromotherlayer',
            steps: [
              new CopyFeaturesFromOtherLayerStep({
                ...options,
                help: 'editing.steps.help.copy',
                openFormTask: openFormStep.getTask(),
              }),
              openFormStep,
            ],
            registerEscKeyEvent: true
          });
        },
      },
      //Copy Feature from layer
      (is_vector) && {
        id: 'copyfeatures',
        type: ['add_feature'],
        name: "editing.tools.copy",
        icon: `copy${iconGeometry}.png`,
        layer,
        once: true,
        row: 2,
        /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/copyfeaturesworkflow.js@v3.7.1 */
        op(options = {}) {
          return new EditingWorkflow({
            ...options,
            type: 'copyfeatures',
            steps: [
              new SelectElementsStep({
                ...options,
                help: 'editing.steps.help.copy',
                type: ApplicationState.ismobile ? 'single' :  'multiple',
                steps: {
                  select: {
                    description: `editing.workflow.steps.${ApplicationState.ismobile ? 'selectPoint' : 'selectPointSHIFT'}`,
                    directive: 't-plugin',
                    done: false
                  }
                },
              }, true),
              options.layer.getGeometryType().indexOf('Point') >= 0 ? undefined : new GetVertexStep({
                ...options,
                help: 'editing.steps.help.copy',
                steps: {
                  from: {
                    description: 'editing.workflow.steps.selectStartVertex',
                    directive: 't-plugin',
                    done: false
                  }
                }
              }, true),
              new MoveElementsStep({
                ...options,
                help: 'editing.steps.help.copy',
                steps: {
                  to: {
                    description: 'editing.workflow.steps.selectToPaste',
                    directive: 't-plugin',
                    done: false
                  }
                }
              }, true),
            ].filter(Boolean),
            registerEscKeyEvent: true,
          });
        },
      },
      //Add part to MultiGeometry Feature
      (is_vector) && {
        id: 'addPart',
        type: ['add_feature', 'change_feature'],
        name: "editing.tools.addpart",
        icon: "addPart.png",
        layer,
        once: true,
        row: 3,
        visible: isMultiGeometry,
        /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/addparttomultigeometriesworkflow.js@v3.7.1 */
        op(options = {}) {
          const w = new EditingWorkflow({
            ...options,
            type: 'addparttomultigeometries',
            helpMessage: 'editing.tools.addpart',
            steps: [
              new PickFeatureStep({
                steps: {
                  select: {
                    description: 'editing.workflow.steps.select',
                    directive: 't-plugin',
                    done: false
                  }
                },
              }),
              new ChooseFeatureStep({ help: 'editing.steps.help.select_element' }),
              new AddFeatureStep({
                ...options,
                help: 'editing.steps.help.select_element',
                add: false,
                steps: {
                  addfeature: {
                    description: 'editing.workflow.steps.draw_part',
                    directive: 't-plugin',
                    done: false
                  }
                },
                onRun: ({inputs, context}) => {
                  w.emit('settoolsoftool', [{
                    type: 'snap',
                    options: {
                      layerId: inputs.layer.getId(),
                      source: inputs.layer.getEditingLayer().getSource(),
                      active: true
                    }
                  }]);
                  w.emit('active', ['snap']);
                },
                onStop: () => {
                  w.emit('deactive', ['snap']);
                }
              }),
              new AddPartToMultigeometriesStep({
                ...options,
                help: 'editing.steps.help.select_element',
              }),
            ],
            registerEscKeyEvent: true
          });
          w.addToolsOfTools({ step: w.getStep(2), tools: ['snap', 'measure'] });
          return w;
        },
      },
      //Remove part from MultiGeometry Feature
      (is_vector) && {
        id: 'deletePart',
        type: ['change_feature'],
        name: "editing.tools.deletepart",
        icon: "deletePart.png",
        layer,
        row: 3,
        visible: isMultiGeometry,
        /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/deletepartfrommultigeometriesworkflow.js@v3.7.1 */
        op(options = {}) {
          return new EditingWorkflow({
            ...options,
            type: 'deletepartfrommultigeometries',
            steps: [
              new PickFeatureStep(),
              new ChooseFeatureStep(),
              new DeletePartFromMultigeometriesStep(options),
            ],
            helpMessage: 'editing.tools.deletepart',
          });
        },
      },
      // Split Feature
      (is_line || is_poly) && {
        id: 'splitfeature',
        type:  ['change_feature'],
        name: "editing.tools.split",
        icon: "splitFeatures.png",
        layer,
        row: 3,
        once: true,
        /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/splitfeatureworkflow.js@v3.7.1 */
        op(options = {}) {
          return new EditingWorkflow({
            ...options,
            type: 'splitfeature',
            steps: [
              new SelectElementsStep({
                ...options,
                help: 'editing.steps.help.split',
                type: ApplicationState.ismobile ? 'single' :  'multiple',
                steps: {
                  select: {
                    description: `editing.workflow.steps.${ApplicationState.ismobile ? 'selectPoint' : 'selectPointSHIFT'}`,
                    directive: 't-plugin',
                    done: false,
                  }
                },
              }, true),
              new SplitFeatureStep({
                ...options,
                help: 'editing.steps.help.split',
                steps: {
                  draw_line: {
                    description: 'editing.workflow.steps.draw_split_line',
                    directive: 't-plugin',
                    done: false,
                  }
                },
              }, true),
            ],
            registerEscKeyEvent: true,
          });
        },
      },
      //Merge features in one
      (is_line || is_poly) && {
        id: 'mergefeatures',
        type: ['change_feature'],
        name: "editing.tools.merge",
        icon: "mergeFeatures.png",
        layer,
        row: 3,
        once: true,
        /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/mergefeaturesworkflow.js@v3.7.1 */
        op(options = {}) {
          return new EditingWorkflow({
            ...options,
            type: 'mergefeatures',
            steps: [
              new SelectElementsStep({
                ...options,
                type: 'bbox',
                help: 'editing.steps.help.merge',
                steps: {
                  select: {
                    description: `editing.workflow.steps.${ApplicationState.ismobile ? 'selectDrawBox' : 'selectSHIFT'}`,
                    directive: 't-plugin',
                    done: false,
                  }
                },
              }, true),
              new MergeFeaturesStep({
                ...options,
                help: 'editing.steps.help.merge',
                steps: {
                  choose: {
                    description: 'editing.workflow.steps.merge',
                    directive: 't-plugin',
                    done: false,
                  }
                },
              }, true),
            ],
            registerEscKeyEvent: true
          });
        },
      },
      //Copy Features from external layer
      (is_line || is_poly) && {
        id: 'copyfeaturefromexternallayer',
        type: ['add_feature'],
        name: "editing.tools.copyfeaturefromexternallayer",
        icon: "copyPolygonFromFeature.png",
        layer,
        row: 3,
        once: true,
        visible: tool => {
          const map  = GUI.getService('map');
          const type = tool.getLayer().getGeometryType();
          const has_same_geom = layer => {
            // check if tool is visible and the layer is a Vector
            const features = 'VECTOR' === layer.getType() && layer.getSource().getFeatures();
            return features && features.length ? isSameBaseGeometryType(features[0].getGeometry().getType(), type) : true;
          };
          map.onbefore('loadExternalLayer',  layer => !tool.isVisible() && tool.setVisible(has_same_geom(layer)));
          map.onafter('unloadExternalLayer', layer => {
            const features = tool.isVisible() && 'VECTOR' === layer.getType() && layer.getSource().getFeatures();
            if (features && features.length && isSameBaseGeometryType(features[0].getGeometry().getType(), type)) {
              tool.setVisible(map.getExternalLayers().find(l => undefined !== has_same_geom(l)));
            }
          });
          return false;
        },
        /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/addfeaturefrommapvectorlayersworkflow.js@v3.7.1 */
        op(options = {}) {
          return new EditingWorkflow({
            ...options,
            type: 'addfeaturefrommapvectorlayers',
            steps: [
              new SelectElementsStep({
                ...options,
                type: 'external',
                help: 'editing.steps.help.copy'
              }, false),
              new OpenFormStep({
                ...options,
                help: 'editing.steps.help.copy'
              }),
            ],
            registerEscKeyEvent: true
          });
        },
      },
      //Table layer (alphanumerical - No geometry)
      //Add Feature
      is_table && {
        id: 'addfeature',
        type: ['add_feature'],
        name: "editing.tools.add_feature",
        icon: "addTableRow.png",
        layer,
        /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/addtablefeatureworkflow.js@v3.7.1 */
        op(options = {}) {
          return new EditingWorkflow({
            ...options,
            type: 'addtablefeature',
            steps: [
              new AddTableFeatureStep(),
              new OpenFormStep(),
            ],
          });
        },
      },
      //Edit Table
      is_table && {
        id: 'edittable',
        type: ['delete_feature', 'change_attr_feature'],
        name: "editing.tools.update_feature",
        icon: "editAttributes.png",
        layer,
        once: true,
        /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/edittableworkflow.js@v3.7.1 */
        op(options = {}) {
          return new EditingWorkflow({
            type: 'edittable',
            ...options,
            backbuttonlabel: 'plugins.editing.form.buttons.save_and_back_table',
            steps: [ new OpenTableStep() ],
          });
        },
      },

    ].filter(tool => {
      // skip when ..
      if (!tool || (capabilities && !tool.type.filter(type => capabilities.includes(type)).length > 0)) {
        return false;
      }
      // in case of capabilities show all tools on a single row
      if (capabilities) {
        tool.row = 1;
      }
      return true;
    }).map(tool => new Tool(tool)),
  });
};

module.exports = ToolBox;
