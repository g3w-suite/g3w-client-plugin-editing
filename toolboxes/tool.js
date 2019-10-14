const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const G3WObject = g3wsdk.core.G3WObject;

// Calsse che rappresenta di fatto
// il bottone all'interno dell'editor control per l'editing
function Tool(options={}) {
  base(this);
  this._session = options.session;
  this._editingService;
  this._dependencySession = null;
  // prendo il layer
  this._layer = options.layer;
  // gli viene passato l'operatore
  // l'oggeto che si occuperà materialmente di gestire l'editazione del layer
  // verosimilmente sarà un oggetto workflow
  this._op = new options.op(options);
  //stato dell'oggetto tool
  // reattivo
  this.state = {
    id: options.id,
    name: options.name,
    enabled: false,
    active: false,
    icon: options.icon,
    message: null,
    messages: this._op.getMessages(),
    delete: false
  };
}

inherit(Tool, G3WObject);

const proto = Tool.prototype;

proto.isEditAttributes = function() {
  return this.getId() === 'editattributes';
};

proto.getEditingService = function() {
  if (this._editingService)
    return this._editingService;
  this._editingService = require('../services/editingservice');
  return this._editingService;
};

proto.getFeature = function() {
  return this._options.inputs.features[0];
};

// funzione che al click del bottone lancio
proto.start = function() {
  const options = {};
  // come inpust al tool e di conseguenza al worflow
  // passo il layer e features
  options.inputs = {
    layer: this._layer,
    features: []
  };
  //passo al context la sessione
  options.context = {
    session: this._session,
    layer: this._session.getEditor().getLayer(),
    dependency: {
      session: this._dependencySession
    }
  };

  this._options = options;
  // funzione che mi permette di far ripartire
  // l'operatore/workflow quando è arrivato alla fine
  const startOp = (options) => {
    this._op.once('settoolsoftool', (tools) => {
      this.emit('settoolsoftool', tools);
    });
    this._op.once('active', (index) => {
      this.emit('active', index)
    });
    this._op.once('deactive', (index) => {
      this.emit('deactive', index)
    });
    this._op.start(options)
      .then((outputs) => {
        // vado a salvare la sessione
        this._session.save()
          .then(() => {
            const toolbox = this.getEditingService().getToolBoxById(this._session.getId());
            toolbox.setCommit();
            this.getEditingService().addChangeToHistory(this._session);
          });
      })
      .fail((error) =>  {
        // in caso di mancato successo faccio il rollback
        // della sessione da vedere se li
        this._session.rollback()
          .then((relationsChanges) => {
            this.getEditingService().rollbackRelations(relationsChanges);
          })
      })
      .always(() => {
        options.inputs.features = [];
        if (this._session.getEditor().getLayer().getType() !== 'table')
          startOp(options);
        else
          this.stop();
      })
  };
  // verifico che sia definito l'operatore
  if (this._op) {
    this.state.active = true;
    // lancio la funzione che mi permette di riavviarea
    // l'operatore (workflow)  ogni volt è andato a buon fine
    startOp(options);
  }
};

//fa lo stop del tool
proto.stop = function() {
  this.emit('stop', {
    session: this._session
  });
  const d = $.Deferred();
  //console.log('Stopping Tool ... ');
  if (this._op) {
    this._op.stop()
      .then(() => {
      })
      .fail((err) => {
        //in caso di errore faccio un rollback della sessione
        this._session.rollback();
      })
      .always(() => {
        this._options = null;
        this.state.active = false;
        this.emit('stop');
        d.resolve();
      })
  }
  return d.promise();
};

proto.getState = function() {
  return this.state;
};

proto.setState = function(state) {
  this.state = state;
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

proto.setActive = function(bool) {
  this.state.active = _.isBoolean(bool) ? bool : false;
};

proto.isActive = function() {
  return this.state.active;
};

proto.getIcon = function() {
  return this.state.icon;
};

proto.setIcon = function(icon) {
  this.state.icon = icon;
};

proto.setEnabled = function(bool) {
  this.state.enabled = _.isBoolean(bool) ? bool : false;
};

proto.isEnabled = function() {
  return this.state.enabled;
};

proto.delete = function() {
  this.state.delete = true;
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

proto.setDependencySession = function(session) {
  this._dependencySession = session;
};

proto.getDependencySession = function() {
  return this._dependencySession;
};

proto.clear = function() {
  this.state.enabled = false;
  this.state.active = false;
};

proto.getMessage = function() {
  const operator = this.getOperator();
  return operator.getRunningStep() ? this.state.messages : null;
};

proto.setMessage = function(message) {
  this.state.message = message;
};

proto.clearMessage = function() {
  this.state.message = null;
};

module.exports = Tool;
