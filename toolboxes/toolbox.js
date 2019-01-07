const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const G3WObject = g3wsdk.core.G3WObject;
const GUI = g3wsdk.gui.GUI;
const Layer = g3wsdk.core.layer.Layer;
const Session = g3wsdk.core.editing.Session;
const OlFeaturesStore = g3wsdk.core.layer.features.OlFeaturesStore;
const FeaturesStore = g3wsdk.core.layer.features.FeaturesStore;

function ToolBox(options={}) {
  base(this);
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
    featuresstore: this._layerType == Layer.LayerTypes.VECTOR ? new OlFeaturesStore(): new FeaturesStore()
  });
  this._dependencySession = null;
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
      father: false
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
    const EditingService = require('../services/editingservice');
    // passo id del toolbox e le opzioni per far partire la sessione
    EditingService.getLayersDependencyFeatures(this.state.id);// dove le opzioni possono essere il filtro;
    // vado a registrare l'evento getFeature
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
  // vado a settare il source all'editing layer
  this._setEditingLayerSource();
}

inherit(ToolBox, G3WObject);

const proto = ToolBox.prototype;

proto.setDependencySession = function(session) {
  this._dependencySession = session;
  this._tools.forEach((tool) => {
    tool.setDependencySession(session);
  });
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

// funzione che permette di settare il featurestore del session in particolare
// collezioni di features per quanto riguarda il vector layer e da vedere per il table layer (forse array) al table layer
proto._setEditingLayerSource = function() {
  // vado a prendere
  const featuresstore = this._session.getFeaturesStore();
  let source;
  // questo ritorna come promessa l'array di features del featuresstore
  // vado  a settare il source del layer
  if (this._layerType == Layer.LayerTypes.VECTOR) {
    source = new ol.source.Vector({features: featuresstore.getFeaturesCollection() });
  } else {
    source  = featuresstore;
  }
  //setto come source del layer l'array / collection feature del features sotre della sessione
  // il layer deve implementare anche un setSource
  this._editingLayer.setSource(source);
};

// funzione che fa in modo di attivare tutti i tasks associati
// al controllo. Questo verrà eventualmente chiamato o dalla pennina di start editing
// o quando schiacchio il bottone generale Avvia editing
// inoltre farà uno start e stop dell'editor
proto.start = function() {
  const EditingService = require('../services/editingservice');
  const EventName = 'start-editing';
  const d = $.Deferred();
  const id = this.getId();
  // vado a recuperare l'oggetto opzioni data per poter richiedere le feature al provider
  this._getFeaturesOption = EditingService.createEditingDataOptions(this._layerType);
  // se non è stata avviata da altri allora faccio avvio sessione
  if (this._session) {
    if (!this._session.isStarted()) {
      // setto il loding dei dati a true
      this.state.loading = true;
      this._session.start(this._getFeaturesOption)
        .then((promise) => {
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
              EditingService.runEventHandler({
                type: 'error-editing',
                id,
                error
              });
              this.stop();
              d.reject(error);
            })
        })
    } else {
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
  if (this._session && this._session.isStarted()) {
    //vado a verificare se  c'è un padre in editing
    const EditingService = require('../services/editingservice');
    const is_there_a_father_in_editing = EditingService.fatherInEditing(this.state.id);
    if (!is_there_a_father_in_editing) {
      this._session.stop()
        .then(() => {
          this.state.editing.on = false;
          this.state.enabled = false;
          this.state.loading = false;
          this._getFeaturesOption = {};
          // spengo il tool attivo
          this.stopActiveTool();
          // seci sono tool attivi vado a spengere
          this._setToolsEnabled(false);
          this.clearToolboxMessages();
          this.setSelected(false);
          this.emit(EventName);
          d.resolve(true)
        })
        .fail((err) => {
          // mostro un errore a video o tramite un messaggio nel pannello
          d.reject(err)
        });
    } else {
      // spengo il tool attivo
      this.stopActiveTool();
      // seci sono tool attivi vado a spengere
      this.state.editing.on = false;
      this._setToolsEnabled(false);
      this.clearToolboxMessages();
      this._unregisterGetFeaturesEvent();
      EditingService.stopSessionChildren(this.state.id);
    }
  } else {
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

// funzione che ha lo scopo di registrare gli eventi per catturare le feature
proto._registerGetFeaturesEvent = function(options) {
  // le sessioni dipendenti per poter eseguier l'editing
  switch(this._layerType) {
    case Layer.LayerTypes.VECTOR:
      const fnc = _.bind(function(options) {
        // get current map extent bbox
        const bbox = this._mapService.getMapBBOX();
        // get loadedExtent
        if (this._getFeaturesEvent.options.extent && ol.extent.containsExtent(this._getFeaturesEvent.options.extent, bbox)) {
          return;
        }
        if (!this._getFeaturesEvent.options.extent) {
          this._getFeaturesEvent.options.extent = bbox;
        } else {
          this._getFeaturesEvent.options.extent = ol.extent.extend(this._getFeaturesEvent.options.extent, bbox);
        }
        options.filter.bbox = bbox;
        this._session.getFeatures(options);
      }, this, options);
      this._getFeaturesEvent.event = 'moveend';
      this._getFeaturesEvent.fnc = fnc;
      this._mapService.getMap().on('moveend', fnc);
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
      this.state.activetool = tool;
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
  if (activeTool && activeTool != tool) {
    activeTool.removeAllListeners();
    activeTool.stop()
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
