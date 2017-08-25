var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var G3WObject = g3wsdk.core.G3WObject;
var GUI = g3wsdk.gui.GUI;
var Session = g3wsdk.core.editing.Session;
var OlFeaturesStore = g3wsdk.core.layer.features.OlFeaturesStore;

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
  // tasks associati
  this._tools = options.tools;
  // recupero il tipo di toolbox
  this._layerType = options.type || 'vector';
  // stato del toolbox;
  this.state = {
    id: options.id,
    // colore del layer (darà il colore alla maschera) e quindi
    // delle feature visualizzate sulla mappa
    color: this._layer.getColor() || 'blue',
    title: options.title || "Edit Layer",
    loading: false,
    enabled: false,
    message: null,
    toolmessage: null,
    selected: false, //proprieà che mi server per switchare tra un toolbox e un altro
    activetool: null,
    editing: {
      on: false,
      dirty: false
    }
  };
  //sessione che permette di gestire tutti i movimenti da parte
  // dei tools del toolbox durante l'editing del layer
  //creo la sessione passandogli l'editor
  this._session = new Session({
    id: options.id, // contiene l'id del layer
    editor: this._editor,
    featuresstore: this._layerType == 'vector' ? new OlFeaturesStore(): null
  });
  //vado a settare la sessione ad ogni tool di quel toolbox
  // e lo stesso toolbox
  _.forEach(this._tools, function(tool) {
    tool.setSession(self._session);
  });
  // in ascolto dell'onafter start della sessione così se avviata
  // vado ad associare le features del suo featuresstore al ol.layer.Vector
  this._session.onafter('start', function() {
    // le sessioni dipendenti per poter eseguier l'editing
    var EditingService = require('../editingservice');
    // passo id del toolbox e le opzioni per far partire la sessione
    EditingService.startEditingDependencies(self.state.id, {});// dove le opzioni possono essere il filtro;
  });
  // mapservice mi servirà per fare richieste al server sulle features (bbox) quando agisco sull mappa
  this._mapService = GUI.getComponent('map').getService();
  // vado a settare il source all'editing layer
  this._setEditingLayerSource();
}

inherit(ToolBox, G3WObject);

var proto = ToolBox.prototype;

// funzione che permette di settare il featurestore del session in particolare
// collezioni di features per quanto riguarda il vector layer e da vedere per il table layer (forse array) al table layer
proto._setEditingLayerSource = function() {
  var featuresstore = this._session.getFeaturesStore();
  // questo ritorna come promessa l'array di features del featuresstore
  // vado  a settare il source del layer
  var source = this._layerType == 'vector' ? new ol.source.Vector({features: featuresstore.getFeaturesCollection() }) : featuresstore;
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
  var bbox = this._mapService.getMapBBOX();
  this._mapService.viewer.map.on('moveend', function() {
    bbox = self._mapService.getMapBBOX();
  });
  // se non è stata avviata da altri allora faccio avvio sessione
  if (this._session && !this._session.isStarted()) {
    this._session.start({
      filter: bbox
    })
    .then(function(promise) {
      // setto il loding dei dati a true
      self.state.loading = true;
      promise
        .then(function (features) {
          self.state.enabled = true;
          self.state.editing.on = true;
          self.state.loading = false;
          d.resolve(features);
        })
        .fail(function(err) {
          self.state.enabled = false;
          self.state.editing.on = false;
          self.state.loading = false;
          self.stop();
          d.reject(err);
        })
    })
  }
  return d.promise();
};

// funzione che disabiliterà
proto.stop = function() {
  var self = this;
  var d = $.Deferred();
  if (this._session && this._session.isStarted()) {
    this._session.stop()
      .then(function() {
        self.state.editing.on = false;
        self.state.enabled = false;
        // seci sono tool attivi vado a spengere
        self.stopActiveTool();
        self.clearToolboxMessages();
        d.resolve(true)
      })
      .fail(function(err) {
        // mostro un errore a video o tramite un messaggio nel pannello
        d.reject(err)
      });
  } else {
    d.resolve(true)
  }
  return d.promise();
};

//funzione salvataggio modifiche
proto.save = function () {
  this._session.commit();
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
  return this.state.editing.dirty;
};

proto.setDirty = function(bool) {
  this.state.editing.dirty = _.isBoolean(bool) ? bool : false;
  return this.state.editing.dirty;
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

// funzione che attiva il tool
proto.setActiveTool = function(tool) {
  tool.start();
  this.state.activetool = tool;
  var message = this.getToolMessage();
  this.setToolMessage(message);
};

proto.getActiveTool = function() {
  return this.state.activetool;
};

proto.stopActiveTool = function() {
  var tool = this.getActiveTool();
  if (tool) {
    tool.stop();
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
