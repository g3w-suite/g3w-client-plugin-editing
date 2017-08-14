var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var G3WObject = g3wsdk.core.G3WObject;
var GUI = g3wsdk.gui.GUI;
var Session = g3wsdk.core.editing.Session;
var OlFeaturesStore = g3wsdk.core.layer.features.OlFeaturesStore;

function ToolBox(options) {
  var self = this;
  options = options || {};
  base(this);
  // editor del Layer che permette di interagire con il layer
  // save, etc ...
  this._editor = options.editor;
  //layer ol
  this._layer = options.layer;
  // tasks associati
  this._tools = options.tools;
  // recupero il tipo di toolbox
  var type = options.type || 'vector';
  //sessione che permette di gestire tutti i movimenti da parte
  // dei tools del toolbox durante l'editing del layer
  //creo la sessione passandogli l'editor
  this._session = new Session({
    id: options.id, // contiene l'id del layer
    editor: this._editor,
    featuresstore: type == 'vector' ? new OlFeaturesStore(): null
  });
  //vado a settare la sessione ad ogni tool di quel toolbox
  // e lo stesso toolbox
  _.forEach(this._tools, function(tool) {
    tool.setSession(self._session);
    tool.setToolBox(self);
  });
  // in ascolto dell'onafter start della sessione così se avviata
  // vado ad associare le features del suo featuresstore al ol.layer.Vector
  this._session.onafter('start', function() {
    // questo ritorna come promessa l'array di features del featuresstore
    self._session.getFeaturesStore().getFeatures()
      .then(function(promise) {
        promise.then(function(features) {
          var source = type == 'vector' ? new ol.source.Vector({features: features }) : self._session.getFeaturesStore();
          //setto come source del layer l'array / collection feature del features sotre della sessione
          // il layer deve implementare anche un setSource
          self._layer.setSource(source);
        });
        self.state.editing.on = true;
      });
  });
  // mapservice
  this._mapService = GUI.getComponent('map').getService();
  // stato del toolbox
  this.state = {
    id: options.id,
    // colore del layer (darà il colore alla maschera) e quindi
    // delle feature visualizzate sulla mappa
    color: this._editor.getLayer().getColor() || 'blue',
    title: options.title || "Edit Layer",
    loading: false,
    enabled: false,
    selected: false, //proprieà che mi server per switchare tra un toolbox e un altro
    editing: {
      on: false,
      dirty: false
    }
  }
}

inherit(ToolBox, G3WObject);

var proto = ToolBox.prototype;

// funzione che fa in modo di attivare tutti i tasks associati
// al controllo. Questo verrà eventualmente chiamato o dalla pennina di start editing
// o quando schiacchio il bottone generale Avvia editing
// inoltre farà uno start e stop dell'editor
proto.start = function() {
  var self = this;
  var d = $.Deferred();
  // var bbox = this._mapService.getMapBBOX();
  // this._mapService.viewer.map.on('moveend', function() {
  //   bbox = self._mapService.getMapBBOX()
  // });
  // se non è stata avviata da altri allora faccio avvio sessione
  if (this._session && !this._session.isStarted()) {
    this._session.start({
      // qui ci va il filtro ad esempio: bbox: bbox
    })
      .then(function() {
        //una volta che è stata avviata la sessione faccio partire
        // le sessioni dipendenti per poter eseguier l'editing
        var EditingService = require('../editingservice');
        // passo id del toolbox e le opzioni per far partire la sessione
        EditingService.startEditingDependencies(self.state.id, {});// dove le opzioni possono essere il filtro;
        d.resolve();
      })
      .fail(function() {
        self.stop();
        d.reject();
      })
  }

  self.state.enabled = true;
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
        self.state.selected = false;
        // seci sono tool attivi vado a spengere
        _.forEach(self._tools, function(tool) {
          if (tool.isStarted()) {
            tool.stop();
            return false;
          }
        });
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

proto.getSession = function() {
  return this._session;
};


module.exports = ToolBox;
