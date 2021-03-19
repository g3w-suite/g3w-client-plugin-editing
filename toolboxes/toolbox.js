const ApplicationState = g3wsdk.core.ApplicationState;
const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const G3WObject = g3wsdk.core.G3WObject;
const GUI = g3wsdk.gui.GUI;
const t = g3wsdk.core.i18n.tPlugin;
const Layer = g3wsdk.core.layer.Layer;
const Session = g3wsdk.core.editing.Session;
const { debounce } = g3wsdk.core.utils;
const getScaleFromResolution = g3wsdk.ol.utils.getScaleFromResolution;

function ToolBox(options={}) {
  base(this);
  this._mapService = GUI.getComponent('map').getService();
  this._start = false;
  this._constraints = options.constraints || {};
  this._layer = options.layer;
  this.uniqueFields = this.getUniqueFieldsType(this._layer.getEditingFields());
  this.uniqueFields && this.getFieldUniqueValuesFromServer();
  this._layerType = options.type || 'vector';
  this._loadedExtent = null;
  this._tools = options.tools;
  this._getFeaturesOption = {};
  const toolsstate = [];
  this._tools.forEach(tool => toolsstate.push(tool.getState()));
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
    loading: false,
    enabled: false,
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

  this._tools.forEach((tool) => {
    tool.setSession(this._session);
  });

  this._session.onafter('stop', () => {
    if (this.inEditing()) {
      const EditingService = require('../services/editingservice');
      ApplicationState.online && EditingService.stopSessionChildren(this.state.id);
      this.getFeaturesOption.registerEvents && this._unregisterGetFeaturesEvent();
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
        GUI.once('closecontent', ()=> {
          setTimeout(()=> {
            this._mapService.getMap().dispatchEvent(this._getFeaturesEvent.event)
          },)
        });
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
  relations.forEach((relation) => {
    this.addRelation(relation);
  })
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
  dependencies.forEach((dependency) => {
    this.addDependency(dependency);
  })
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
      values.forEach((value) => {
        this.uniqueFields[fieldName].input.options.values.push(value);
      })
    })
  }).fail(err => {
    console.log(err)
  })
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

//added option objet to start method to have a control by other plugin how
proto.start = function(options={}) {
  const { filter, tools } = options;
  const EditingService = require('../services/editingservice');
  const EventName = 'start-editing';
  const d = $.Deferred();
  const id = this.getId();
  if (filter) {
    this._getFeaturesOption = {
      filter,
      editing: true,
      listenEvents: false
    };
  } else {
    const filterType = this._layerType === Layer.LayerTypes.TABLE ? 'all': 'bbox';
    this._getFeaturesOption = EditingService.createEditingDataOptions(filterType, {
      layerId: this.getId()
    });
  }
  const handlerAfterSessionGetFeatures = promise => {
    this.emit(EventName);
    EditingService.runEventHandler({
      type: EventName,
      id
    });
    promise
      .then(features => {
        this.state.loading = false;
        this.setEditing(true, {
          tools
        });
        EditingService.runEventHandler({
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
        EditingService.runEventHandler({
          type: 'error-editing',
          id,
          error
        });
        this.stop();
        this.state.loading = false;
        d.reject(error);
      })
  };
  if (this._session) {
    if (!this._session.isStarted()) {
      //added case of mobile
      if (ApplicationState.ismobile && this._mapService.isMapHidden() && this._layerType === Layer.LayerTypes.VECTOR) {
        this.setEditing(true, {
          tools
        });
        GUI.getComponent('map').getService().onceafter('setHidden', () =>{
          setTimeout(()=>{
            this._start = true;
            this.state.loading = true;
            this._getFeaturesOption = EditingService.createEditingDataOptions(filterType, {
              layerId: this.getId()
            });
            this._session.start(this._getFeaturesOption)
              .then(handlerAfterSessionGetFeatures).fail(()=>this.setEditing(false));
          }, 300);
        })
      } else {
        this._start = true;
        this._session.start(this._getFeaturesOption)
          .then(handlerAfterSessionGetFeatures)
      }
    } else {
      if (!this._start) {
        this.state.loading = true;
        this._session.getFeatures(this._getFeaturesOption)
          .then(handlerAfterSessionGetFeatures);
        this._start = true;
      }
      this.setEditing(true, {
        tools
      });
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
    const EditingService = require('../services/editingservice');
    const is_there_a_father_in_editing = EditingService.fatherInEditing(this.state.id);
    if (ApplicationState.online && !is_there_a_father_in_editing) {
      this._session.stop()
        .then(() => {
          this._start = false;
          this.state.editing.on = false;
          this.state.enabled = false;
          this.state.loading = false;
          this._getFeaturesOption = {};
          this.stopActiveTool();
          this._setToolsEnabled(false);
          this.clearToolboxMessages();
          this.setSelected(false);
          this.emit(EventName);
          d.resolve(true)
        })
        .fail((err) => {
          d.reject(err)
        }).always(()=> {
          this.setSelected(false);
        })
    } else {
      this.stopActiveTool();
      this.state.editing.on = false;
      this._setToolsEnabled(false);
      this.clearToolboxMessages();
      this._unregisterGetFeaturesEvent();
      EditingService.stopSessionChildren(this.state.id);
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

proto.getColor = function() {
  return this.state.color;
};

proto.getLayer = function() {
  return this._layer;
};

proto.setEditing = function(bool=true, options={}) {
  const {tools} = options; // get tools fro options usefult we want to ebnable certai, tools ate start
  this.setEnable(bool);
  this.state.editing.on = bool;
  tools === undefined ? this.enableTools(bool) : Array.isArray(tools) && this.getTools().forEach(tool =>{
    tool.setEnabled(tools.indexOf(tool.getId()) !== -1)
  });
};

proto.inEditing = function() {
  return this.state.editing.on;
};

proto.isEnabled = function() {
  return this.state.enabled;
};

proto.setEnable = function(bool) {
  this.state.enabled = _.isBoolean(bool) ? bool : false;
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

proto.setSelected = function(bool) {
  this.state.selected = _.isBoolean(bool) ? bool : false;
  this.state.selected ? this._canEdit() : this._disableCanEdit();
};

proto.getTools = function() {
  return this._tools;
};

proto.getToolById = function(toolId) {
  return this._tools.find(tool => toolId === tool.getId());
};

// enable all tools
proto.enableTools = function(bool) {
  this._tools.forEach(tool => tool.setEnabled(bool))
};

proto.setActiveTool = function(tool) {
  this.stopActiveTool(tool)
    .then(() => {
      this.clearToolsOfTool();
      this.state.activetool = tool;
      tool.once('settoolsoftool', (tools) => {
        tools.forEach((tool) => {
          this.state.toolsoftool.push(tool);
        })
      });

      const _activedeactivetooloftools = (activetools, active) => {
        this.state.toolsoftool.forEach((tooloftool) => {
          if (activetools.indexOf(tooloftool.type) !== -1)
            tooloftool.options.active = active;
        });
      };

      tool.on('active', (activetools=[]) => {
        _activedeactivetooloftools(activetools, true);
      });

      tool.on('deactive', (activetools=[]) => {
        _activedeactivetooloftools(activetools, false);
      });
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
        requestAnimationFrame(() => {
          d.resolve();
        })
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


module.exports = ToolBox;
