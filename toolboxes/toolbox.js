const ApplicationState = g3wsdk.core.ApplicationState;
const {base, inherit, debounce} = g3wsdk.core.utils;
const G3WObject = g3wsdk.core.G3WObject;
const GUI = g3wsdk.gui.GUI;
const t = g3wsdk.core.i18n.tPlugin;
const Layer = g3wsdk.core.layer.Layer;
const Session = g3wsdk.core.editing.Session;
const getScaleFromResolution = g3wsdk.ol.utils.getScaleFromResolution;

function ToolBox(options={}) {
  base(this);
  this.editingService = require('../services/editingservice');
  this._mapService = GUI.getComponent('map').getService();
  this._start = false;
  this._constraints = options.constraints || {};
  this._layer = options.layer;
  this.uniqueFields = this.getUniqueFieldsType(this._layer.getEditingFields());
  this.uniqueFields && this.getFieldUniqueValuesFromServer();
  this._layerType = options.type || 'vector';
  this._loadedExtent = null;
  this._tools = options.tools;
  this._enabledtools;
  this._disabledtools;
  this._getFeaturesOption = {};
  const toolsstate = [];
  this._tools.forEach(tool => toolsstate.push(tool.getState()));
  this.constraintFeaturesFilter; // is used to contraint laoding featutes to a filter setted
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
  
  this._tools.forEach(tool => tool.setSession(this._session));

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
  })

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
  }).fail(err => console.log)
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

/**
 * Method to create getFeaures options
 * @param filter
 */
proto.setFeaturesOptions = function({filter}={}){
  if (filter) {
    // in case of nofeatures filter request check if nofeatures_filed is present otherwise i get first field
    if (filter.nofeatures) filter.nofeatures_field = filter.nofeatures_field || this._layer.getEditingFields()[0].name;
    this._getFeaturesOption = {
      filter,
      editing: true,
      registerEvents: false
    };
    // in case of constarint attribute set the filter as constraint
    filter.constraint && this.setConstraintFeaturesFilter(filter);
  }
  else {
    const filterType = this._layerType === Layer.LayerTypes.TABLE ? 'all': 'bbox';
    this._getFeaturesOption = this.editingService.createEditingDataOptions(filterType, {
      layerId: this.getId()
    });
  }
};

//added option object to start method to have a control by other plugin how
proto.start = function(options={}) {
  const { filter, toolboxheader=true, startstopediting=true, tools} = options;
  tools && this.setEnablesDisablesTools(tools);
  this.state.toolboxheader = toolboxheader;
  this.state.startstopediting = startstopediting;
  const EventName = 'start-editing';
  const d = $.Deferred();
  const id = this.getId();
  // set filterOptions
  this.setFeaturesOptions({
    filter: filter || this.constraintFeatureFilter
  });
  const handlerAfterSessionGetFeatures = promise => {
    this.emit(EventName);
    this.editingService.runEventHandler({
      type: EventName,
      id
    });
    promise
      .then(features => {
        this.stopLoading();
        this.setEditing(true);
        this.editingService.runEventHandler({
          type: 'get-features-editing',
          id,
          options: {
            features
          }
        });

        d.resolve({
          features
        })
      })
      .fail(error => {
        GUI.notify.error(error.message);
        this.editingService.runEventHandler({
          type: 'error-editing',
          id,
          error
        });
        this.stop();
        this.stopLoading();
        d.reject(error);
      })
  };
  if (this._session) {
    if (!this._session.isStarted()) {
      //added case of mobile
      if (ApplicationState.ismobile && this._mapService.isMapHidden() && this._layerType === Layer.LayerTypes.VECTOR) {
        this.setEditing(true);
        GUI.getComponent('map').getService().onceafter('setHidden', () =>{
          setTimeout(()=>{
            this._start = true;
            this.startLoading();
            this.setFeaturesOptions({
              filter
            });
            this._session.start(this._getFeaturesOption)
              .then(handlerAfterSessionGetFeatures).fail(()=>this.setEditing(false));
          }, 300);
        })
      } else {
        this._start = true;
        this.startLoading();
        this._session.start(this._getFeaturesOption).then(handlerAfterSessionGetFeatures)
      }
    } else {
      if (!this._start) {
        this.startLoading();
        this._session.getFeatures(this._getFeaturesOption).then(handlerAfterSessionGetFeatures);
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
  this.disableCanEditEvent && this.disableCanEditEvent();
  if (this._session && this._session.isStarted()) {
    const is_there_a_father_in_editing = this.editingService.fatherInEditing(this.state.id);
    if (ApplicationState.online && !is_there_a_father_in_editing) {
      this._session.stop()
        .then(() => {
          this._start = false;
          this.state.editing.on = false;
          this.state.enabled = false;
          this.stopLoading();
          this._getFeaturesOption = {};
          this.stopActiveTool();
          this._setToolsEnabled(false);
          this.clearToolboxMessages();
          this.setSelected(false);
          this.emit(EventName);
          d.resolve(true)
        })
        .fail(err => d.reject(err))
        .always(()=> this.setSelected(false))
    } else {
      this.stopActiveTool();
      // need to be sure to clear
      this._layer.getEditingLayer().getSource().clear();
      this.state.editing.on = false;
      this._setToolsEnabled(false);
      this.clearToolboxMessages();
      this._unregisterGetFeaturesEvent();
      this.editingService.stopSessionChildren(this.state.id);
      this.setSelected(false);
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
      break;
    default:
      return;
  }
};

proto.setConstraintFeaturesFilter = function(filter){
  this.constraintFeatureFilter = filter;
};

proto._setToolsEnabled = function(bool=true) {
  this._tools.forEach(tool => {
    tool.setEnabled(bool);
    !bool && tool.setActive(bool);
  })
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

proto.getLayer = function() {
  return this._layer;
};

/**
 * Funtion thta enable toolbox
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
 */

proto.setAddEnableTools = function(options={}){
  const tools = this._tools.filter(tool => tool.getType().find(type => type ==='add_feature')).map(tool => ({
    ...tool.state
  }));
  this.setEnablesDisablesTools({
    enabled: tools
  })
};

/**
 * method to set tools bases on update
 */

proto.setUpdateEnableTools = function(options={}){
  console.log(this._tools)
};

/**
 * method to set tools bases on delete
 */

proto.setDeleteEnableTools = function(options={}){
  console.log(this._tools)
};

/**
 * method to set tools bases on add
 */

proto.setUpdateEnableTools = function(options={}){
  console.log(this._tools)
};

/**
 * Method to set enable tools
 *
 * @param tools
 */
proto.setEnablesDisablesTools = function(tools){
  if (tools){
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
  }
};

// enable all tools
proto.enableTools = function(bool=false) {
  const tools = this._enabledtools || this._tools;
  const disabledtools = this._disabledtools || [];
  tools.forEach(tool => {
    const enableTool = bool && disabledtools.length ? disabledtools.indexOf(tool.getId()) === -1 : bool;
    tool.setEnabled(enableTool);
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

proto.setToolMessage = function(messages) {
  this.state.toolmessages.help = messages.help;
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
  this.setShow(true);
  if (this._enabledtools){
    this._enabledtools = undefined;
    this.enableTools();
    this._tools.forEach(tool => tool.resetDefault());
  }
  this.constraintFeatureFilter = null;
  this._disabledtools = null;
};

module.exports = ToolBox;
