var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var G3WObject = g3wsdk.core.G3WObject;
var EditingService = require('../editingservice');

function ToolBox(options) {
  options = options || {};
  base(this);
  // editor del Layer
  this._editor = options.editor;
  // tasks associati
  this._tools = options.tools;
  // colore del layer (darà il colore alla maschera) e quindi
  // delle feature visualizzate sulla mappa
  this._color = options.color || 'blue';
  // stato del controllo
  this.state = {
    loading: false,
    enabled: false,
    editing: {
      on: false,
      dirty: false
    }
  }
}

inherit(ToolBox, G3WObject);

var proto = ToolBox.prototype;

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

// funzione che fa in modo di attivare tutti i tasks associati
// al controllo. Questo verrà eventualmente chiamato o dalla pennina di start editing
// o quando schiacchio il bottone generale Avvia editing
// inoltre farà uno start e stop dell'editor
proto.start = function() {
  
};

// funzione che disabiliterà
proto.stop = function() {
  
};

module.exports = ToolBox;
