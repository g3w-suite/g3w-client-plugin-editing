var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var G3WObject = g3wsdk.core.G3WObject;
var GUI = g3wsdk.gui.GUI;
var Layer = g3wsdk.core.layer.Layer;
var Session = g3wsdk.core.editing.Session;
var OlFeaturesStore = g3wsdk.core.layer.features.OlFeaturesStore;
var FeaturesStore = g3wsdk.core.layer.features.FeaturesStore;

function ToolBox(options) {
  var self = this;
  base(this);
  options = options || {};
  // editor del Layer che permette di interagire con il layer
  // save, etc ...
  this._editor = options.editor;
  // l'editing layer originale che contiene tutte le informazioni anche le relazioni
  this._layer = this._editor.getLayer();
  //layer ol della mappa
  this._editingLayer = options.layer;
  // recupero il tipo di toolbox
  this._layerType = options.type || 'vector';
  this._tools = options.tools;
  // popolo gl'array degli state del tools appartenenti al toobox
  var toolsstate = [];
  _.forEach(this._tools, function(tool) {
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
  // opzione per recuperare le feature
  this._getFeaturesOption = {};
  // stato della history
  var historystate = this._session.getHistory().state;
  var sessionstate = this._session.state;
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
    toolmessage: null,
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
  _.forEach(this._tools, function(tool) {
    tool.setSession(self._session);
  });

  // in ascolto dell'onafter start della sessione così se avviata
  // vado ad associare le features del suo featuresstore al ol.layer.Vector
  this._session.onafter('stop', function() {
    var EditingService = require('../editingservice');
    EditingService.stopSessionChildren(self.state.id);
  });
  
  this._session.onafter('start', function() {
    var EditingService = require('../editingservice');
    // passo id del toolbox e le opzioni per far partire la sessione
    EditingService.getLayersDependencyFeatures(self.state.id, self._getFeaturesOption);// dove le opzioni possono essere il filtro;
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
  this._loadedExtent = null;
  // vado a settare il source all'editing layer
  this._setEditingLayerSource();
}

inherit(ToolBox, G3WObject);

var proto = ToolBox.prototype;

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
  var self = this;
  _.forEach(relations, function(relation) {
    self.addRelation(relation);
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
  _.forEach(dependencies, function(dependency) {
    self.addDependency(dependency);
  })
};

proto.addDependency = function(dependency) {
  this.state.editing.dependencies.push(dependency);
};

// funzione che permette di settare il featurestore del session in particolare
// collezioni di features per quanto riguarda il vector layer e da vedere per il table layer (forse array) al table layer
proto._setEditingLayerSource = function() {
  // vado a prendere
  var featuresstore = this._session.getFeaturesStore();
  var source;
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
  var self = this;
  var d = $.Deferred();
  // caso vettoriale
  if (this._layerType == Layer.LayerTypes.VECTOR) {
    var bbox = this._loadedExtent = this._mapService.getMapBBOX();
    this._getFeaturesOption = {
      editing: true,
      type: this._layerType,
      filter: {
        bbox: bbox
      }
    };
  } else {
    this._getFeaturesOption = {
      type: this._layerType,
      editing: true
    };
  }
  // se non è stata avviata da altri allora faccio avvio sessione
  if (this._session) {
    if (!this._session.isStarted()) {
      // setto il loding dei dati a true
      self.state.loading = true;
      this._session.start(this._getFeaturesOption)
        .then(function(promise) {
          promise
            .then(function (features) {
              self.state.loading = false;
              self.setEditing(true);
              // vado a registrare l'evento getFeatiure
              self._registerGetFeaturesEvent(self._getFeaturesOption);
              d.resolve(features);
            })
            .fail(function(err) {
              self.stop();
              d.reject(err);
            })
        })
    } else {
      self.setEditing(true);
      self.state.loading = false;
      self._registerGetFeaturesEvent(this._getFeaturesOption);
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
  var self = this;
  // le sessioni dipendenti per poter eseguier l'editing
  var d = $.Deferred();
  if (this._session && this._session.isStarted()) {
    //vado a verificare se  c'è un padre in editing
    var EditingService = require('../editingservice');
    var is_there_a_father_in_editing = EditingService.fatherInEditing(self.state.id);
    if (!is_there_a_father_in_editing) {
      this._session.stop()
        .then(function() {
          self.state.editing.on = false;
          self.state.enabled = false;
          self.state.loading = false;
          self._getFeaturesOption = {};
          // spengo il tool attivo
          self.stopActiveTool();
          // seci sono tool attivi vado a spengere
          self._setToolsEnabled(false);
          self.clearToolboxMessages();
          self._unregisterGetFeaturesEvent();
          d.resolve(true)
        })
        .fail(function(err) {
          // mostro un errore a video o tramite un messaggio nel pannello
          d.reject(err)
        });
    } else {
      // spengo il tool attivo
      self.stopActiveTool();
      // seci sono tool attivi vado a spengere
      self.state.editing.on = false;
      self._setToolsEnabled(false);
      self.clearToolboxMessages();
      self._unregisterGetFeaturesEvent();
      EditingService.stopSessionChildren(self.state.id);
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
    case 'Layer.LayerTypes.VECTOR':
      var fnc = _.bind(function (options) {
        var bbox = this._mapService.getMapBBOX();
        var extent = this._getFeaturesEvent.options.extent;
        if (extent && ol.extent.containsExtent(extent, bbox)) {
          return;
        }
        this._getFeaturesEvent.options.extent = extent ? ol.extent.extend(extent, bbox) : extent = bbox;
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
  _.forEach(this._tools, function(tool) {
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
  var Tool = null;
  _.forEach(this._tools, function(tool) {
    if (toolId == tool.getId()) {
      Tool = tool;
      return false
    }
  });
  return Tool;
};

proto.enableTools = function(bool) {
  _.forEach(this._tools, function(tool) {
    tool.setEnabled(bool);
  })
};

// funzione che attiva il tool
proto.setActiveTool = function(tool) {
  // prima stoppo l'eventuale active tool
  this.stopActiveTool(tool);
  // faccio partire lo start del tool
  this.state.activetool = tool;
  tool.start();
  var message = this.getToolMessage();
  this.setToolMessage(message);
};

proto.getActiveTool = function() {
  return this.state.activetool;
};

proto.stopActiveTool = function(tool) {
  var activeTool = this.getActiveTool();
  if (activeTool && activeTool != tool) {
    activeTool.stop();
    this.clearToolMessage();
    this.state.activetool = null;
  }
};

proto.clearToolMessage = function() {
  this.state.toolmessage = null;
};

proto.getToolMessage = function() {
  var tool = this.getActiveTool();
  return tool.getMessage();
};

proto.setToolMessage = function(message) {
  this.state.toolmessage = message;
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
