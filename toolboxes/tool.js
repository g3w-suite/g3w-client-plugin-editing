const {base, inherit} = g3wsdk.core.utils;
const GUI = g3wsdk.gui.GUI;
const G3WObject = g3wsdk.core.G3WObject;

function Tool(options = {}) {
  base(this);
  this.editingService = require('../services/editingservice');
  const {name, row, id, icon, session, layer, once=false, type=[], op} = options;
  this._options = null;
  this._session = session;
  this._layer = layer;
  this._op = new op({
    layer
  });
  this._once = once;
  this.type = type;
  this.disabledtoolsoftools = [];
  this.state = {
    id,
    name,
    enabled: false,
    visible: true,
    active: false,
    icon,
    message: null,
    row: row || 1,
    messages: this._op.getMessages()
  };
}

inherit(Tool, G3WObject);

const proto = Tool.prototype;

proto.setOptions = function(options={}){
  const {messages, enabled=false, visible=true, disabledtoolsoftools = []} = options;
  this.state.messages = messages || this.state.messages;
  this.state.visible = visible;
  this.state.enabled = enabled;
  this.disabledtoolsoftools = disabledtoolsoftools;
};

proto.getType = function(){
  return this.type;
};

proto.getFeature = function() {
  return this._options.inputs.features[0];
};

proto.createOperatorOptions = function(options={features:[]}){
  const {features=[]} = options;
  return {
    inputs : {
      layer: this._layer,
      features
    },
    context : {
      session: this._session
    }
  };
};

/**
 * 
 * @param hideSidebar
 */
proto.start = function(hideSidebar = false) {
  const options = this.createOperatorOptions();
  this._options = options;
  const startOp = options => {
    this._op.once('settoolsoftool', tools => {
      // filter eventually disable tools of tools
      tools = tools.filter(tool => !this.disabledtoolsoftools.includes(tool.type));
      tools.length && this.emit('settoolsoftool', tools)
    });
    this._op.once('active', index => this.emit('active', index));
    this._op.once('deactive', index => this.emit('deactive', index));
    //reset features
    options.inputs.features = [];
    hideSidebar && GUI.hideSidebar();
    this._op.start(options)
      .then(() => {
        this._session.save()
          .then(() => this.editingService.saveChange()); // after save temp change check if editing service has a autosave
      })
      .fail(() =>  {
        hideSidebar && GUI.showSidebar();
        this._session.rollback()
          .then(() => {})
      })
      .always(() => {
        if (!this._once && this._layer.getType() !== 'table') startOp(options);
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
      .fail(() => this._session.rollback())
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

proto.setActive = function(bool=false) {
  this.state.active = bool;
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

proto.setEnabled = function(bool=false) {
  this.state.enabled = bool
};

proto.isEnabled = function() {
  return this.state.enabled;
};

proto.setVisible = function(bool=true){
  this.state.visible = bool;
};

proto.isVisible = function(){
  return this.state.visible;
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
  return operator.getHelpMessage() || operator.getRunningStep() ? this.state.messages : null;
};

proto.setMessage = function(message) {
  this.state.message = message;
};

proto.clearMessage = function() {
  this.state.message = null;
};

proto.resetDefault = function(){
  this.state.visible = true;
  this.state.enabled = false;
  this.state.messages =  this._op.getMessages();
  this.disabledtoolsoftools = []; //reset disabled tools eventually set by other
};

module.exports = Tool;
