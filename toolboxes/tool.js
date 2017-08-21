var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var G3WObject = g3wsdk.core.G3WObject;

// Calsse che rappresenta di fatto
// il bottone all'interno dell'editor control per l'editing
function Tool(options) {
  base(this);
  options = options || {};
  // contiene il toolbox che contiene il tool
  this._toolbox = options.toolbox || null;
  // ma mi servirà? la sessione non sarà gestita dal toolbox
  this._session = options.session;
  // prendo il layer
  this._layer = options.layer;
  // gli viene passato l'operatore
  // l'oggeto che si occuperà materialmente di gestire l'editazione del layer
  // verosimilmente sarà un oggetto workflow
  this._op = new options.op();
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

// funzione che al click del bottone lancio
proto.start = function() {
  var self = this;
  var options = {};
  // come inpust al tool e di conseguenza al worflow
  // passo il layer e features
  options.inputs = {
    layer: this._layer,
    features: []
  };
  //passo al context la sessione
  options.context = {
    session: this._session
  };
  // funzione che mi permette di far ripartire
  // l'operatore o workflow qaundo è arrivato alla fine
  function startOp(options) {
    self._op.start(options)
      .then(function(outputs) {
        // vado a salvare la sessione
        self._session.save()
          .then(function() {
            options.inputs.features = [];
            startOp(options);
          });
      })
      .fail(function() {
        // in caso di mancato successo faccio il rollback
        // della sessione da vedere se li
        self.state.started = false;
        self._session.rollback();
      });
  }
  // verifico che sia definito l'operatore
  if (this._op) {
    this.state.started = true;
    // lancio la funzione che mi permette di riavviarea
    // l'operatore (workflow)  ogni volt è andato a buon fine
    startOp(options);

  }
};

//fa lo stop del tool
proto.stop = function() {
  var self = this;
  console.log('Stopping Tool ... ');
  if (this._op) {
    this._op.stop()
      .then(function() {
        //TODO
      })
      .fail(function(err) {
        //in caso di errore faccio un rollback della sessione
        self._session.rollback();
      })
      .always(function() {
        self.state.started = false;
      })
  }
};


proto.getId = function() {
  return this.state.id;
};

proto.setId = function(id) {
  this.state.id = id;
};

proto.getName = function() {
  return this.state.name;
};

proto.isStarted = function() {
  return this.state.started;
};

proto.getIcon = function() {
  return this.state.icon;
};

proto.setIcon = function(icon) {
  this.state.icon = icon;
};

proto.getOperator = function() {
  return this._op;
};

//restituisce la sessione
proto.getSession = function() {
  return this._session;
};

//setta la sessione
proto.setSession = function(session) {
  this._session = session;
};

proto.setToolBox = function(toolbox) {
  this._toolbox = toolbox;
};

proto.getToolBox = function() {
  return this._toolbox;
};

proto.clear = function() {
  this.state.enabled = false;
  this.state.started = false;
};

module.exports = Tool;