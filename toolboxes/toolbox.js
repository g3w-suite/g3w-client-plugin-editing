var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var G3WObject = g3wsdk.core.G3WObject;
var GUI = g3wsdk.gui.GUI;
var Session = g3wsdk.core.editing.Session;

function ToolBox(options) {
  options = options || {};
  base(this);
  // editor del Layer che permette di interagire con il layer
  // save, etc ...
  this._editor = options.editor;
  // tasks associati
  this._tools = options.tools;
  //sessione che permette di gestire tutti i movimenti da parte
  // dei tools del toolbox durante l'editing del layer
  this._session = null;
  // mapservice
  this._mapService = GUI.getComponent('map').getService();
  // stato del controllo
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

// funzione che fa in modo di attivare tutti i tasks associati
// al controllo. Questo verrà eventualmente chiamato o dalla pennina di start editing
// o quando schiacchio il bottone generale Avvia editing
// inoltre farà uno start e stop dell'editor
proto.start = function() {
  var self = this;
  var bbox = this._mapService.getMapBBOX();
  this._mapService.viewer.map.on('moveend', function() {
    bbox = self._mapService.getMapBBOX()
  });
  //creo la sessione passandogli l'editor
  this._session = new Session({
    editor: this._editor
  });
  //vado a settare la sessione ad ogni tool di quel toolbox
  _.forEach(this._tools, function(tool) {
    tool.setSession(self._session);
  });
  var d = $.Deferred();
  this._session.start({
    bbox: bbox
  })
  .then(function() {
    self.state.editing.on = true;
    self.state.enabled = true;
  })
  .fail(function() {
    // mostro un errore a video o tramite un messaggio nel pannello
  });

  return d.promise();
};

// funzione che disabiliterà
proto.stop = function() {
  var self = this;
  var d = $.Deferred();
  var layerId = this._editor.getLayer().getId();
  if (this._session) {
    this._session.stop()
      .then(function() {
        self.state.editing.on = false;
        self.state.enabled = false;
        //vado a rimuovere tutte le feature dal layer di editing
        self._mapService.getLayerById(layerId).getSource().clear();
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
  this._editor.save();
};

module.exports = ToolBox;
