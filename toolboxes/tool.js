var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var resolve = g3wsdk.core.utils.resolve;
var G3WObject = g3wsdk.core.G3WObject;

// Calsse che rappresenta di fatto
// il bottone all'interno dell'editor control per l'editing
function Tool(options){
  base(this);
  options = options || {};
  // gli veine passato l'editor
  this._editor = options.editor;
  // gli viene passata la sessione
  //ma serve????
  this._session = options.session;
  // gli viene passato l'operatore
  // l'oggeto che si occuperà materialmente di gestire l'editazione del layer
  // verosimilmente sarà un oggetto workflow
  this._op = options.op;
  //stato dell'oggetto tool
  // reattivo
  this.state = {
    id: options.id,
    name: options.name,
    enabled: false,
    started: false,
    icon: options.icon
  };
}

inherit(Tool, G3WObject);

var proto = Tool.prototype;

proto.getId = function() {
  return this.state.id;
};

proto.getName = function() {
  return this.state.name;
};

// funzione che al click del bottone lancio 
proto.start = function() {
  var self = this;
  // verifico che sia definito l'operatore
  if (this._op) {
    // a questo punto l'editor è attivo in quanto
    // ho attivatao (start) il controllo che contiene il tool stesso
    // recupero il layer così lo passo come input all'operatore(workflow)
    // che lo userà come inputs per lavorare sulle sue features
    var layer = self._editor.getLayer();
    //workflow start
    //proto.start = function(inputs, context, flow)
    return self._op.start(layer, {
      session: self._session
    });
    self.state.started = true;
  }
};

proto.stop = function() {
  if (this._op) {
    return this._op.stop();
  }
};

module.exports = Tool;