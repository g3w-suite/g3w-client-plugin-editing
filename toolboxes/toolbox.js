const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const G3WObject = g3wsdk.core.G3WObject;
const GUI = g3wsdk.gui.GUI;
const t = g3wsdk.core.i18n.tPlugin;
const Layer = g3wsdk.core.layer.Layer;
const Session = g3wsdk.core.editing.Session;
const { debounce } = g3wsdk.core.utils;
const getScaleFromResolution = g3wsdk.ol.utils.getScaleFromResolution;
const OlFeaturesStore = g3wsdk.core.layer.features.OlFeaturesStore;
const FeaturesStore = g3wsdk.core.layer.features.FeaturesStore;

function ToolBox(options={}) {
  base(this);
  this._start = false;
  this._constraints = options.constraints || {};
  // editor del Layer che permette di interagire con il layer
  // save, etc ...
  this._editor = options.editor;
  // l'editing layer originale che contiene tutte le informazioni anche le relazioni
  this._layer = this._editor.getLayer();
  //layer ol della mappa
  this._editingLayer = options.layer;
  // recupero il tipo di toolbox
  this._layerType = options.type || 'vector';
  this._loadedExtent = null;
  this._tools = options.tools;
  // optioni per il recupero delle feature
  this._getFeaturesOption = {};
  // popolo gl'array degli state del tools appartenenti al toobox
  const toolsstate = [];
  this._tools.forEach((tool) => {
    toolsstate.push(tool.getState())
  });
  //sessione che permette di gestire tutti i movimenti da parte
  // dei tools del toolbox durante l'editing del layer
  //creo la sessione passandogli l'editor
  this._session = new Session({
    id: options.id, // contiene l'id del layer
    editor: this._editor,
    //in case of table or not ol layer i have to set provider to get data
    featuresstore: this._layerType === Layer.LayerTypes.VECTOR ? new OlFeaturesStore(): new FeaturesStore({
      provider: this._editingLayer.getProvider('data')
    }),
    add: this._layerType !== Layer.LayerTypes.TABLE // in case of table adding is not necessary
  });
  // opzione per recuperare le feature
  this._getFeaturesOption = {};
  // stato della history
  const historystate = this._session.getHistory().state;
  const sessionstate = this._session.state;
  // stato del toolbox;
  this.state = {
    id: options.id,
    // colore del layer (darà il colore alla maschera) e quindi
    // delle feature visualizzate sulla mappa
    color: options.color || 'blue',
    title: options.title || "Edit Layer",
    loading: false,
    enabled: false,
    message: null,
    toolmessages: {
      help: null
    },
    toolsoftool: [], // tools to show when a task request this
    tools: toolsstate,
    selected: false, //proprieà che mi server per switchare tra un toolbox e un altro
    activetool: null, // tiene conto del tool attivo corrente
    editing: {
      session: sessionstate, // STATE DELLA SESSIONE
      history: historystate,// assegno lo state della history
      on: false,
      dependencies: [], // array di id dei toolbox dipendenti, utili per accendere spendere editing e chiedere il commit
      relations: [],
      father: false,
      canEdit: true
    },
    layerstate: this._layer.state
  };
  //vado a settare la sessione ad ogni tool di quel toolbox
  // e lo stesso toolbox
  this._tools.forEach((tool) => {
    tool.setSession(this._session);
  });

  // in ascolto dell'onafter start della sessione così se avviata
  // vado ad associare le features del suo featuresstore al ol.layer.Vector
  this._session.onafter('stop', () => {
    const EditingService = require('../services/editingservice');
    //vado a fermare la sessione dei figli
    EditingService.stopSessionChildren(this.state.id);
    // vado a unregistrare gli eventi
    this._unregisterGetFeaturesEvent();
  });

  this._session.onafter('start', (options) => {
    this._getFeaturesOption = options;
    if (options.type === Layer.LayerTypes.VECTOR && GUI.getContentLength())
      GUI.once('closecontent', ()=> {
        setTimeout(()=> {
          this._mapService.getMap().dispatchEvent(this._getFeaturesEvent.event)
        })
      });
    this._registerGetFeaturesEvent(this._getFeaturesOption);
  });

  // mapservice mi servirà per fare richieste al server sulle features (bbox) quando agisco sull mappa
  this._mapService = GUI.getComponent('map').getService();
  //eventi per catturare le feature
  this._getFeaturesEvent = {
    event: null,
    fnc: null,
    options: {
      extent: null
    }
  };
  this._setEditingLayerSource();
}

inherit(ToolBox, G3WObject);

const proto = ToolBox.prototype;

proto.getState = function() {
  return this.state;
};

proto.getLayer = function() {
  return this._layer;
};

proto.getEditingLayer = function() {
  return this._editingLayer;
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

proto._setEditingLayerSource = function() {
  const featuresstore = this._session.getFeaturesStore();
  const source = (this._layerType === Layer.LayerTypes.VECTOR) ?
    new ol.source.Vector({features: featuresstore.getFeaturesCollection()}) :
    featuresstore;
  this._editingLayer.setSource(source);
};


proto.start = function() {
  const EditingService = require('../services/editingservice');
  const EventName = 'start-editing';
  const d = $.Deferred();
  const id = this.getId();
  // vado a recuperare l'oggetto opzioni data per poter richiedere le feature al provider
  if (this._layerType)
  this._getFeaturesOption = EditingService.createEditingDataOptions(this._layerType);
  const handlerAfterSessionGetFeatures = (promise) => {
    this.emit(EventName);
    EditingService.runEventHandler({
      type: EventName,
      id
    });
    promise
      .then((features) => {
        this.state.loading = false;
        this.setEditing(true);
        EditingService.runEventHandler({
          type: 'get-features-editing',
          id,
          options: {
            features
          }
        });
      })
      .fail((error) => {
        GUI.notify.error(error.message);
        EditingService.runEventHandler({
          type: 'error-editing',
          id,
          error
        });
        this.stop();
        d.reject(error);
      })
  };
  if (this._session) {
    if (!this._session.isStarted()) {
      this._start = true;
      this.state.loading = true;
      this._session.start(this._getFeaturesOption)
        .then(handlerAfterSessionGetFeatures)
    } else {
      if (!this._start) {
        this._session.getFeatures(this._getFeaturesOption)
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

// funzione che disabiliterà
proto.stop = function() {
  const EventName  = 'stop-editing';
  // le sessioni dipendenti per poter eseguier l'editing
  const d = $.Deferred();
  this.disableCanEditEvent && this.disableCanEditEvent();
  if (this._session && this._session.isStarted()) {
    //vado a verificare se  c'è un padre in editing
    const EditingService = require('../services/editingservice');
    const is_there_a_father_in_editing = EditingService.fatherInEditing(this.state.id);
    if (!is_there_a_father_in_editing) {
      this._session.stop()
        .then(() => {
          this._start = false;
          this.state.editing.on = false;
          this.state.enabled = false;
          this.state.loading = false;
          this._getFeaturesOption = {};
          // spengo il tool attivo
          this.stopActiveTool();
          // seci sono tool attivi vado a spengere
          this._setToolsEnabled(false);
          this.clearToolboxMessages();
          this._setEditingLayerSource();
          this.setSelected(false);
          this.emit(EventName);
          d.resolve(true)
        })
        .fail((err) => {
          // mostro un errore a video o tramite un messaggio nel pannello
          d.reject(err)
        }).always(()=> {
          this.setSelected(false);
        })
    } else {
      // spengo il tool attivo
      this.stopActiveTool();
      // seci sono tool attivi vado a spengere
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

//funzione salvataggio modifiche
proto.save = function () {
  this._session.commit();
};

// unregistra eventi che sono legati al getFeatures
proto._unregisterGetFeaturesEvent = function() {
  switch(this._layerType) {
    case 'vector':
      this._mapService.getMap().un(this._getFeaturesEvent.event, this._getFeaturesEvent.fnc);
      this._getFeaturesEvent.options.extent = null;
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
        this._editingLayer.setVisible(canEdit);
        if (canEdit && GUI.getContentLength() === 0) {
          const bbox = this._mapService.getMapBBOX();
          if (this._getFeaturesEvent.options.extent && ol.extent.containsExtent(this._getFeaturesEvent.options.extent, bbox)) return;
          this._getFeaturesEvent.options.extent = !this._getFeaturesEvent.options.extent ? bbox: ol.extent.extend(this._getFeaturesEvent.options.extent, bbox) ;
          options.filter.bbox = bbox;
          this.state.loading = true;
          this._session.getFeatures(options).then((promise)=> {
            promise.then(() => {
              this.state.loading = false;
            });
          })
        }
      };
      this._getFeaturesEvent.event = 'moveend';
      this._getFeaturesEvent.options.extent = options.filter.bbox;
      this._getFeaturesEvent.fnc = debounce(fnc, 300);
      this._mapService.getMap().on('moveend', this._getFeaturesEvent.fnc);
      break;
    default:
      return;
  }
};

proto._setToolsEnabled = function(bool) {
  this._tools.forEach((tool) => {
    tool.setEnabled(bool);
    if (!bool)
      tool.setActive(bool);
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

proto.setEditing = function(bool) {
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
  let Tool = null;
  this._tools.forEach((tool) => {
    if (toolId == tool.getId()) {
      Tool = tool;
      return false
    }
  });
  return Tool;
};

proto.enableTools = function(bool) {
  this._tools.forEach((tool) => {
    tool.setEnabled(bool);
  })
};

// funzione che attiva il tool
proto.setActiveTool = function(tool) {
  // prima stoppo l'eventuale active tool
  this.stopActiveTool(tool)
    .then(() => {
      this.clearToolsOfTool();
      // faccio partire lo start del tool
      this.state.activetool = tool;
      // registro l'evento sul workflow
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

      tool.start();
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

//PARTE DEDICATA ALLE RELAZIONI

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
