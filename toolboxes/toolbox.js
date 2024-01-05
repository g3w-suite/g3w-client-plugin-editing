import {
  EditingWorkflow,
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
  AddFeatureStep,
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
    AddFeatureStep,
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
const { tPlugin:t }              = g3wsdk.core.i18n;
const { Layer }                  = g3wsdk.core.layer;
const { Session }                = g3wsdk.core.editing;
const { getScaleFromResolution } = g3wsdk.ol.utils;
const { Geometry }               = g3wsdk.core.geometry;
const { isSameBaseGeometryType } = g3wsdk.core.geoutils;

function ToolBox(options={}) {
  base(this);
  this.editingService = require('../services/editingservice');
  this._mapService = GUI.getService('map');
  this._start = false;
  this._constraints = options.constraints || {};
  this._layer = options.layer;
  this.uniqueFields = this.getUniqueFieldsType(this._layer.getEditingFields());
  this.uniqueFields && this.getFieldUniqueValuesFromServer();
  this._layerType = options.type || Layer.LayerTypes.VECTOR;
  this._loadedExtent = null;
  this._tools = options.tools;
  this._enabledtools;
  this._disabledtools;
  this._getFeaturesOption = {};
  const toolsstate = [];
  this._tools.forEach(tool => toolsstate.push(tool.getState()));
  this.constraints = {
    filter: null,
    show: null,
    tools: []
  }; // is used to constraint loading features to a filter set
  this._session = new Session({
    id: options.id,
    editor: this._layer.getEditor()
  });

  // get informed when save on server
  this.uniqueFields && this._session.onafter('saveChangesOnServer', ()=>{
    this._resetUniqueValues();
  });

  this._getFeaturesOption = {};
  const historystate = this._session.getHistory().state;
  const sessionstate = this._session.state;
 
  this.state = {
    id: options.id,
    changingtools: false, // used to show or not tools during change phase
    show: true, // used to show or not the toolbox if we nee to filtered
    color: options.color || 'blue',
    title: options.title || "Edit Layer",
    customTitle: false,
    loading: false,
    enabled: false,
    toolboxheader: true,
    startstopediting: true,
    message: null,
    toolmessages: {
      help: null
    },
    toolsoftool: [],
    tools: toolsstate,
    selected: false,
    activetool: null,
    editing: {
      session: sessionstate,
      history: historystate,
      on: false,
      dependencies: [],
      relations: [],
      father: false,
      canEdit: true
    },
    layerstate: this._layer.state
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
      ApplicationState.online && this.editingService.stopSessionChildren(this.state.id);
      this._getFeaturesOption.registerEvents && this._unregisterGetFeaturesEvent();
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
      if (options.type === Layer.LayerTypes.VECTOR && GUI.getContentLength())
        GUI.once('closecontent', ()=> setTimeout(()=> this._mapService.getMap().dispatchEvent(this._getFeaturesEvent.event)));
    }
  });
}

inherit(ToolBox, G3WObject);

const proto = ToolBox.prototype;

proto.getState = function() {
  return this.state;
};

proto.setShow = function(bool=true){
  this.state.show = bool;
};

proto.getLayer = function() {
  return this._layer;
};

proto.setFather = function(bool) {
  this.state.editing.father = bool;
};

proto.isFather = function() {
  return this.state.editing.father;
};

proto.addRelations = function(relations) {
  relations.forEach(relation => this.addRelation(relation));
};

proto.revert = function() {
  return this._session.revert();
};

proto.addRelation = function(relation) {
  this.state.editing.relations.push(relation);
};

proto.getDependencies = function() {
  return this.state.editing.dependencies;
};

proto.hasDependencies = function() {
  return !!this.state.editing.dependencies.length;
};

proto.addDependencies = function(dependencies) {
  dependencies.forEach(dependency => this.addDependency(dependency));
};

proto.addDependency = function(dependency) {
  this.state.editing.dependencies.push(dependency);
};

proto.getFieldUniqueValuesFromServer = function({reset=false}={}) {
  const fieldsName = Object.values(this.uniqueFields).map(field => field.name);
  this._layer.getWidgetData({
    type: 'unique',
    fields: fieldsName.join()
  }).then( response => {
    const data = response.data;
    Object.entries(data).forEach(([fieldName, values]) => {
      reset && this.uniqueFields[fieldName].input.options.values.splice(0);
      values.forEach(value => this.uniqueFields[fieldName].input.options.values.push(value));
    })
  }).fail(console.log)
};

proto.getUniqueFieldsType = function(fields) {
  const uniqueFields = {};
  let find = false;
  fields.forEach(field => {
    if (field.input && field.input.type === 'unique') {
      uniqueFields[field.name] = field;
      find = true;
    }
  });
  return find && uniqueFields || null;
};

proto._resetUniqueValues = function(){
  this.getFieldUniqueValuesFromServer({
    reset: true
  })
};

/*
check if vectorLayer
 */
proto.isVectorLayer = function(){
  return this._layerType ===  Layer.LayerTypes.VECTOR;
};

/**
 * Method to create getFeatures options
 * @param filter
 */
proto.setFeaturesOptions = function({filter}={}){
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
    // in case of constarint attribute set the filter as constraint
    filter.constraint && this.setConstraintFeaturesFilter(filter);
  } else {
    const filterType = this._layerType === Layer.LayerTypes.TABLE ? 'all': 'bbox';
    this._getFeaturesOption = this.editingService.createEditingDataOptions(filterType, {
      layerId: this.getId()
    });
  }
};

proto.setEditingConstraints = function(constraints={}){
  Object.keys(constraints).forEach(constraint => this.constraints[constraint] = constraints[constraint]);
};


proto.setLayerUniqueFieldValues = async function() {
  await this.editingService.setLayerUniqueFieldValues(this.getId());
};

proto.clearLayerUniqueFieldsValues = function(){
  this.editingService.clearLayerUniqueFieldsValues(this.getId())
};

//added option object to start method to have a control by other plugin how
proto.start = function(options={}) {
  let {filter, toolboxheader=true, startstopediting=true, showtools=true, tools, changingtools=false} = options;
  this.state.changingtools = changingtools;
  tools && this.setEnablesDisablesTools(tools);
  this.state.toolboxheader = toolboxheader;
  this.state.startstopediting = startstopediting;
  const EventName = 'start-editing';
  const d = $.Deferred();
  const id = this.getId();
  const applicationConstraint = this.editingService.getApplicationEditingConstraintById(this.getId());
  filter = applicationConstraint && applicationConstraint.filter || this.constraints.filter || filter;
  // set filterOptions
  this.setFeaturesOptions({
    filter
  });

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
    this.setLayerUniqueFieldValues()
      .then(async () => {
        await this.editingService.runEventHandler({
          type: EventName,
          id
        });
        promise
          .then(async features => {
            this.stopLoading();
            this.setEditing(true);
            await this.editingService.runEventHandler({
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
            await this.editingService.runEventHandler({
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
      if (ApplicationState.ismobile && this._mapService.isMapHidden() && this._layerType === Layer.LayerTypes.VECTOR) {
        this.setEditing(true);
        GUI.getService('map').onceafter('setHidden', () =>{
          setTimeout(()=>{
            this._start = true;
            this.startLoading();
            this.setFeaturesOptions({
              filter
            });
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

proto.startLoading = function() {
  this.state.loading = true;
};

proto.stopLoading = function() {
  this.state.loading = false;
};

proto.getFeaturesOption = function() {
  return this._getFeaturesOption;
};

proto.stop = function() {
  const EventName  = 'stop-editing';
  const d = $.Deferred();
  if (this.disableCanEditEvent) {
    this.disableCanEditEvent();
  }
  this._unregisterStartSettersEventsKey.forEach(fnc => fnc());

  this._unregisterStartSettersEventsKey = [];

  if (this._session && this._session.isStarted()) {
    if (ApplicationState.online) {
      if (this.editingService.fathersInEditing(this.state.id).length > 0) {
        this.stopActiveTool();
        this.state.editing.on = false;
        this.enableTools(false);
        this.clearToolboxMessages();
        this._unregisterGetFeaturesEvent();
        this.editingService.stopSessionChildren(this.state.id);
        this.setSelected(false);
        this.clearLayerUniqueFieldsValues();
      } else {
        this._session.stop()
          .then(promise => {
            promise.then(() => {
              this._start = false;
              this.state.editing.on = false;
              this.state.enabled = false;
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

proto.save = function () {
  this._session.commit();
};

proto._unregisterGetFeaturesEvent = function() {
  switch(this._layerType) {
    case Layer.LayerTypes.VECTOR:
      this._mapService.getMap().un(this._getFeaturesEvent.event, this._getFeaturesEvent.fnc);
      break;
    default:
      return;
  }
};

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
            const bbox = this._mapService.getMapBBOX();
            options.filter.bbox = bbox;
            this.state.loading = true;
            this._session.getFeatures(options).then(promise=> {
              promise.then(() => {
                this.state.loading = false;
              });
            })
          }
        };
        this._getFeaturesEvent.event = 'moveend';
        this._getFeaturesEvent.fnc = debounce(fnc, 300);
        const map = this._mapService.getMap();
        map.on('moveend', this._getFeaturesEvent.fnc);
      }
      break;
    default:
      return;
  }
};

proto.setConstraintFeaturesFilter = function(filter){
  this.constraintFeatureFilter = filter;
};

proto.getEditingConstraints = function() {
  return this._constraints;
};

proto.getEditingConstraint = function(type) {
  return this.getEditingConstraints()[type];
};

proto.canEdit = function() {
  return this.state.editing.canEdit;
};

proto._canEdit = function() {
  if (this._constraints.scale) {
    const scale = this._constraints.scale;
    const message = `${t('editing.messages.constraints.enable_editing')}${scale}`.toUpperCase();
    this.state.editing.canEdit = getScaleFromResolution(this._mapService.getMap().getView().getResolution()) <= scale;
    GUI.setModal(!this.state.editing.canEdit, message);
    const fnc = (event) => {
      this.state.editing.canEdit = getScaleFromResolution(event.target.getResolution()) <= scale;
      GUI.setModal(!this.state.editing.canEdit, message);
    };
    this._mapService.getMap().getView().on('change:resolution', fnc);
    this.disableCanEditEvent = () => {
      GUI.setModal(false);
      this._mapService.getMap().getView().un('change:resolution', fnc);
    }
  }
};

proto._disableCanEdit = function() {
  this.state.editing.canEdit = true;
  this.disableCanEditEvent && this.disableCanEditEvent()
};

proto.setMessage = function(message) {
  this.state.message = message;
};

proto.getMessage = function() {
  return this.state.message;
};

proto.clearMessage = function() {
  this.setMessage(null);
};

proto.clearToolboxMessages = function() {
  this.clearToolMessage();
  this.clearMessage();
};

proto.getId = function() {
  return this.state.id;
};

proto.setId = function(id) {
  this.state.id = id;
};

proto.getTitle = function() {
  return this.state.title;
};

proto.setTitle = function(title){
  this.state.customTitle = true;
  this.state.title = title;
};

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

proto.inEditing = function() {
  return this.state.editing.on;
};

proto.isEnabled = function() {
  return this.state.enabled;
};

proto.setEnable = function(bool=false) {
  this.state.enabled = bool;
  return this.state.enabled;
};

proto.isLoading = function() {
  return this.state.loading;
};

proto.isDirty = function() {
  return this.state.editing.history.commit;
};

proto.isSelected = function() {
  return this.state.selected;
};

proto.setSelected = function(bool=false) {
  this.state.selected = bool;
  this.state.selected ? this._canEdit() : this._disableCanEdit();
};

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
 * @param tool
 */
proto.setEnableTool = function(toolId){
  const tool = this._tools.find(tool => tool.getId() === toolId);
  tool.setEnabled(true)
};

/**
 * method to set tools bases on add
 * editing_constraints : true // follow the tools related toi editing conttraints configuration
 */

proto.setAddEnableTools = function({tools={}, options={editing_constraints: true}}={}){
  const {editing_constraints=false} = options;
  const ADDONEFEATUREONLYTOOLSID = ['addfeature', 'editattributes', 'movefeature', 'movevertex'];
  const add_tools = this._tools.filter(tool => {
    return editing_constraints ?
      tool.getType().find(type => type ==='add_feature') :
      ADDONEFEATUREONLYTOOLSID.indexOf(tool.getId()) !== -1;
  }).map(tool => {
      const id = tool.getId();
      return {
        id,
        options: tools[id]
      }
  });

  this.setEnablesDisablesTools({
    enabled: add_tools
  });

  this.enableTools(true);
};

/**
 * method to set tools bases on update
 */
proto.setUpdateEnableTools = function({tools={}, excludetools=[], options={editing_constraints: true}}){
  const {editing_constraints=false} = options;
  const UPDATEONEFEATUREONLYTOOLSID = ['editattributes', 'movefeature', 'movevertex'];
  const update_tools = this._tools.filter(tool => {
    // exclude
    if (excludetools.indexOf(tool.getId()) !== -1) return false;
    return editing_constraints ?
      tool.getType().find(type => type ==='change_feature' || type ==='change_attr_feature') :
      UPDATEONEFEATUREONLYTOOLSID.indexOf(tool.getId()) !== -1;
  }).map(tool => {
    const id = tool.getId();
    return {
      id,
      options: tools[id]
    }
  });

  this.setEnablesDisablesTools({
    enabled: update_tools
  });
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
proto.setEnablesDisablesTools = function(tools){
  if (tools){
    this.state.changingtools = true;
    // Check if tools is an array
    const {enabled:enableTools=[], disabled:disableTools=[]} = tools;
    const toolsId = enableTools.length ? [] : this._tools.map(tool => tool.getId());
    enableTools.forEach(({id, options={}}) => {
      //check if id of tool passed as argument is right
      const tool =this.getToolById(id);
      if (tool) {
        const {active=false} = options;
        tool.setOptions(options);
        tool.isVisible() && toolsId.push(id);
        active && this.setActiveTool(tool);
        if (this._enabledtools === undefined) this._enabledtools = [];
        this._enabledtools.push(tool);
      }
    });
    //disabled and visible
    disableTools.forEach(({id, options}) =>{
      const tool = this.getToolById(id);
      if (tool){
        if (this._disabledtools === undefined) this._disabledtools = [];
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
proto.enableTools = function(bool=false) {
  const tools = this._enabledtools || this._tools;
  const disabledtools = this._disabledtools || [];
  tools.forEach(tool => {
    const { conditions:{enabled=bool} } = tool;
    const enableTool = bool && disabledtools.length ? disabledtools.indexOf(tool.getId()) === -1 : toRawType(enabled) === 'Boolean' ? enabled : enabled({
      bool,
      tool
    });
    tool.setEnabled(enableTool);
    !bool && tool.setActive(bool);
  })
};

proto.setActiveTool = function(tool) {
  this.stopActiveTool(tool)
    .then(() => {
      this.clearToolsOfTool();
      this.state.activetool = tool;
      tool.once('settoolsoftool', tools => tools.forEach(tool => this.state.toolsoftool.push(tool)));
      const _activedeactivetooloftools = (activetools, active) => {
        this.state.toolsoftool.forEach(tooloftool => {
          if (activetools.indexOf(tooloftool.type) !== -1) tooloftool.options.active = active;
        });
      };

      tool.on('active', (activetools=[]) => _activedeactivetooloftools(activetools, true));
      tool.on('deactive', (activetools=[]) => _activedeactivetooloftools(activetools, false));

      const hideSidebar = this._mapService.isMapHidden();
      tool.start(hideSidebar);
      const message = this.getToolMessage();
      this.setToolMessage(message);
    });
};

proto.clearToolsOfTool = function() {
  this.state.toolsoftool.splice(0);
};

proto.getActiveTool = function() {
  return this.state.activetool;
};

proto.restartActiveTool = function() {
  const activeTool = this.getActiveTool();
  this.stopActiveTool();
  this.setActiveTool(activeTool);
};

proto.stopActiveTool = function(tool) {
  const d = $.Deferred();
  const activeTool = this.getActiveTool();
  if (activeTool && activeTool !== tool) {
    activeTool.removeAllListeners();
    activeTool.stop(true)
      .then(() => {
        this.clearToolsOfTool();
        this.clearToolMessage();
        this.state.activetool = null;
        setTimeout(d.resolve);
      })
  } else {
    tool ? tool.removeAllListeners(): null;
    d.resolve()
  }
  return d.promise();
};

proto.clearToolMessage = function() {
  this.state.toolmessages.help = null;
};

proto.getToolMessage = function() {
  const tool = this.getActiveTool();
  return tool.getMessage();
};

proto.setToolMessage = function(messages={}) {
  this.state.toolmessages.help = messages && messages.help || null;
};

proto.getSession = function() {
  return this._session;
};

proto.getEditor = function() {
  return this._editor;
};

proto.setEditor = function(editor) {
  this._editor = editor;
};

proto.hasChildren = function() {
  return this._layer.hasChildren();
};

proto.hasFathers = function() {
  return this._layer.hasFathers();
};

proto.hasRelations = function() {
  return this._layer.hasRelations();
};

/**
 * Method to reset default values
 */
proto.resetDefault = function(){
  this.state.title = this.originalState.title;
  this.state.toolboxheader = true;
  this.state.startstopediting = true;
  this.constraints = {
    filter: null,
    show: null,
    tools: []
  };

  if (this._enabledtools){
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
  const is_poly         = is_vector && (Geometry.isPolygonGeometryType(geometryType) || Geometry.isLineGeometryType(geometryType));
  const is_table        = Layer.LayerTypes.TABLE === type;
  const isMultiGeometry = geometryType && Geometry.isMultiGeometry(geometryType);

  return new ToolBox({
    id:          layer.getId(),
    color:       layer.getColor(),
    type,
    layer,
    lngTitle:    'editing.toolbox.title',
    title:       ` ${layer.getName()}`,
    constraints: layer.getEditingConstrains(),
    tools:       [

      (is_point || is_poly) && {
        id: 'addfeature',
        type: ['add_feature'],
        name: 'editing.tools.add_feature',
        icon: `add${type}.png`,
        layer,
        row: 1,
        /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/addfeatureworkflow.js@v3.7.1 */
        op(options = {}) {
          const w = new EditingWorkflow({
            ...options,
            steps: [
              new AddFeatureStep(options),
              new OpenFormStep(options),
            ],
          });
          w.addToolsOfTools({ step: options.steps[0], tools: ['snap', 'measure'] });
          return w;
        },
      },

      (is_point || is_poly) && {
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
            steps: [
              new PickFeatureStep(),
              new ChooseFeatureStep(),
              new OpenFormStep(),
            ],
          });
          w.YOU_SHOULD_REALLY_GIVE_ME_A_NAME_1 = true;
          return w;
        },
      },

      (is_point || is_poly) && {
        id: 'deletefeature',
        type: ['delete_feature'],
        name: 'editing.tools.delete_feature',
        icon: 'deletePoint.png',
        layer,
        row: 1,
        /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/deletefeatureworkflow.js@v3.7.1 */
        op(options = {}) {
          const w = EditingWorkflow({
            ...options,
            steps: [
              new PickFeatureStep(),
              new ChooseFeatureStep(),
              new DeleteFeatureStep(),
              new ConfirmStep({ type: 'delete' }),
            ],
          });
          w.YOU_SHOULD_REALLY_GIVE_ME_A_NAME_1 = true;
          return w;
        },
      },

      is_poly && {
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
            helpMessage: 'editing.tools.update_vertex',
            steps: [
              new PickFeatureStep(options),
              new ChooseFeatureStep(),
              new ModifyGeometryVertexStep(),
            ],
          })
          w.addToolsOfTools({ step: options.steps[2], tools: ['snap', 'measure'] });
          return w;
        },
      },

      (is_point || is_poly) && {
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
            steps: [
              new SelectElementsStep({
                type: 'multiple',
                steps: {
                  select: {
                    description: 'editing.workflow.steps.' + ApplicationState.ismobile ? 'selectDrawBoxAtLeast2Feature' : 'selectMultiPointSHIFTAtLeast2Feature',
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
            helpMessage: 'editing.tools.update_multi_features',
            registerEscKeyEvent: true,
          });
        },
      },

      (is_point || is_poly) && {
        id: 'movefeature',
        type: ['change_feature'],
        name: 'editing.tools.move_feature',
        icon: `move${type}.png`,
        layer,
        row: 2,
        /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/movefeatureworkflow.js@v3.7.1 */
        op(options = {}) {
          return new EditingWorkflow({
            ...options,
            helpMessage: 'editing.tools.move_feature',
            steps: [
              new PickFeatureStep(),
              new ChooseFeatureStep(),
              new MoveFeatureStep(),
            ],
          });
        },
      },

      (is_point || is_poly) && {
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

      (is_point || is_poly) && {
        id: 'copyfeatures',
        type: ['add_feature'],
        name: "editing.tools.copy",
        icon: `copy${type}.png`,
        layer,
        once: true,
        row: 2,
        /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/copyfeaturesworkflow.js@v3.7.1 */
        op(options = {}) {
          return new EditingWorkflow({
            ...options,
            steps: [
              new SelectElementsStep({
                ...options,
                help: 'editing.steps.help.copy',
                type: ApplicationState.ismobile ? 'single' :  'multiple',
                steps: {
                  select: {
                    description: 'editing.workflow.steps.' + ApplicationState.ismobile ? 'selectPoint' : 'selectPointSHIFT',
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

      (is_point || is_poly) && isMultiGeometry && {
        id: 'addPart',
        type: ['add_feature', 'change_feature'],
        name: "editing.tools.addpart",
        icon: "addPart.png",
        layer,
        once: true,
        row: 3,
        /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/addparttomultigeometriesworkflow.js@v3.7.1 */
        op(options = {}) {
          const w = new EditingWorkflow({
            ...options,
            steps: [
              new PickFeatureStep({
                help: 'editing.steps.help.select_element',
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
            helpMessage: 'editing.tools.addpart',
            registerEscKeyEvent: true
          });
          return w;
        },
      },

      (is_point || is_poly) && isMultiGeometry && {
        id: 'deletePart',
        type: ['change_feature'],
        name: "editing.tools.deletepart",
        icon: "deletePart.png",
        layer,
        row: 3,
        /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/deletepartfrommultigeometriesworkflow.js@v3.7.1 */
        op(options = {}) {
          return new EditingWorkflow({
            ...options,
            steps: [
              new PickFeatureStep(),
              new ChooseFeatureStep(),
              new DeletePartFromMultigeometriesStep(options),
            ],
            helpMessage: 'editing.tools.deletepart',
          });
        },
      },

      is_poly && {
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
            steps: [
              new SelectElementsStep({
                ...options,
                help: 'editing.steps.help.split',
                type: ApplicationState.ismobile ? 'single' :  'multiple',
                steps: {
                  select: {
                    description: 'editing.workflow.steps.' + ApplicationState.ismobile ? 'selectPoint' : 'selectPointSHIFT',
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

      is_poly && {
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
            steps: [
              new SelectElementsStep({
                ...options,
                type: 'bbox',
                help: 'editing.steps.help.merge',
                steps: {
                  select: {
                    description: 'editing.workflow.steps.' + ApplicationState.ismobile ? 'selectDrawBox' : 'selectSHIFT',
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

      is_poly && {
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
            steps: [
              new AddTableFeatureStep(),
              new OpenFormStep(),
            ],
          });
        },
      },

      is_table && {
        id: 'edittable',
        type: ['delete_feature', 'change_attr_feature'],
        name: "editing.tools.update_feature",
        icon: "editAttributes.png",
        layer,
        once: true,
        /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/edittableworkflow.js@v3.7.1 */
        op(options = {}) {
          const w = new EditingWorkflow({
            ...options,
            backbuttonlabel: 'plugins.editing.form.buttons.save_and_back_table',
            steps: [ new OpenTableStep() ],
          });
          w.YOU_SHOULD_REALLY_GIVE_ME_A_NAME_2 = true;
          return w;
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
