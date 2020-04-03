const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const G3WObject = g3wsdk.core.G3WObject;

function Tool(options = {}) {
  base(this);
  this._options = null;
  this._session = options.session;
  this._layer = options.layer;
  this._op = new options.op();
  this.state = {
    id: options.id,
    name: options.name,
    enabled: false,
    active: false,
    icon: options.icon,
    message: null,
    messages: this._op.getMessages()
  };
}

inherit(Tool, G3WObject);

const proto = Tool.prototype;

proto.getFeature = function() {
  return this._options.inputs.features[0];
};

proto.start = function() {
  const options = {
    inputs : {
      layer: this._layer,
      features: []
    },
    context : {
      session: this._session,
      layer: this._session.getEditor().getLayer()
    }
  };
  this._options = options;
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
      .then(() => {
        this._session.save()
          .then(() => {});
      })
      .fail(() =>  {
        this._session.rollback()
          .then(() => {})
      })
      .always(() => {
        options.inputs.features = [];
        if (this._session.getEditor().getLayer().getType() !== 'table') startOp(options);
        else this.stop();
      })
  };
  if (this._op) {
    this.state.active = true;
    startOp(options);
  }
};

proto.stop = function(force=false) {
  const d = $.Deferred();
  if (this._op) {
    this._op.stop(force)
      .then(() => {})
      .fail(() => {
        this._session.rollback();
      })
      .always(() => {
        this._options = null;
        this.state.active = false;
        this.emit('stop', {
          session: this._session
        });
        d.resolve();
      })
  } else {
    this.emit('stop', {
      session: this._session
    });
    d.resolve();
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
  this.state.active = typeof bool === 'boolean' ? bool : false;
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
  this.state.enabled = typeof bool === 'boolean' ? bool : false;
};

proto.isEnabled = function() {
  return this.state.enabled;
};

proto.getOperator = function() {
  return this._op;
};

proto.getSession = function() {
  return this._session;
};

proto.setSession = function(session) {
  this._session = session;
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
