const {
  base,
  inherit,
}                   = g3wsdk.core.utils;
const { GUI }       = g3wsdk.gui;
const { G3WObject } = g3wsdk.core;
const { Layer }     = g3wsdk.core.layer;

function Tool(options = {}) {
  base(this);

  const {
    name,
    row,
    id,
    icon,
    session,
    layer,
    once = false,
    type = [],
    visible = true,
    conditions = {},
  }                         = options;
  this._options             = null;
  this._session             = session;
  this._layer               = layer;
  this._op                  = new options.op({layer});
  this._once                = once;
  this.type                 = type;
  this.conditions           = conditions;
  this.disabledtoolsoftools = [];
  this.state                = {
    id,
    name,
    enabled: false,
    visible: visible instanceof Function ?
      (() => visible(this))() :
      visible,
    active: false,
    icon,
    message: null,
    row: row || 1,
    messages: this._op.getMessages()
  };
}

inherit(Tool, G3WObject);

const proto = Tool.prototype;

/**
 *
 * @param options
 */
proto.setOptions = function(options={}){
  const {
    messages,
    enabled = false,
    visible = true,
    disabledtoolsoftools = []
  }                         = options;
  this.state.messages       = messages || this.state.messages;
  this.state.visible        = visible;
  this.state.enabled        = enabled;
  this.disabledtoolsoftools = disabledtoolsoftools;
};

/**
 * Return layer owner of tool
 */
proto.getLayer = function(){
  return this._layer;
};

/**
 *
 * @returns {*[]}
 */
proto.getType = function(){
  return this.type;
};

/**
 *
 * @returns {*}
 */
proto.getFeature = function() {
  return this._options.inputs.features[0];
};

/**
 *
 * @param options
 * @returns {{inputs: {features: *[], layer}, context: {session: *}}}
 */
proto.createOperatorOptions = function(options={features:[]}){
  const { features = [] } = options;
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
  const startOp = (options) => {
    this._op.once('settoolsoftool', tools => {
      // filter eventually disable tools of tools
      tools = tools.filter(tool => !this.disabledtoolsoftools.includes(tool.type));
      if (tools.length) {
        this.emit('settoolsoftool', tools)
      }
    });
    this._op.once('active', index => this.emit('active', index));
    this._op.once('deactive', index => this.emit('deactive', index));
    //reset features
    options.inputs.features = [];
    if (hideSidebar) {
      GUI.hideSidebar();
    }
    this._op.start(options)
      .then(() => {
        this._session
          .save()
          .then(() => g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').saveChange()); // after save temp change check if editing service has a autosave
      })
      .fail(() => {
        if (hideSidebar) {
          GUI.showSidebar();
        }
        this._session
          .rollback()
          .then(() => {})
      })
      .always(() => {
        if (!this._once && Layer.LayerTypes.TABLE !== this._layer.getType() ) {
          startOp(options);
        } else {
          this.stop();
        }
      })
  };
  if (this._op) {
    this.state.active = true;
    setTimeout(() => { // used to prevent renderind change state
      startOp(options);
    })
  }
};

/**
 *
 * @param force
 * @returns {*}
 */
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

/**
 *
 * @returns {*|{visible: (*|boolean), name, icon, active: boolean, messages: *, id, row: number, message: null, enabled: boolean}}
 */
proto.getState = function() {
  return this.state;
};

/**
 *
 * @param state
 */
proto.setState = function(state) {
  this.state = state;
};

/**
 *
 * @returns {*}
 */
proto.getId = function() {
  return this.state.id;
};

/**
 *
 * @param id
 */
proto.setId = function(id) {
  this.state.id = id;
};

/**
 *
 * @returns {*}
 */
proto.getName = function() {
  return this.state.name;
};

/**
 *
 * @param bool
 */
proto.setActive = function(bool=false) {
  this.state.active = bool;
};

/**
 *
 * @returns {boolean}
 */
proto.isActive = function() {
  return this.state.active;
};

/**
 *
 * @returns {*}
 */
proto.getIcon = function() {
  return this.state.icon;
};

/**
 *
 * @param icon
 */
proto.setIcon = function(icon) {
  this.state.icon = icon;
};

/**
 *
 * @param bool
 */
proto.setEnabled = function(bool=false) {
  this.state.enabled = bool
};

/**
 *
 * @returns {boolean}
 */
proto.isEnabled = function() {
  return this.state.enabled;
};

/**
 *
 * @param bool
 */
proto.setVisible = function(bool=true){
  this.state.visible = bool;
};

/**
 *
 * @returns {*|boolean}
 */
proto.isVisible = function(){
  return this.state.visible;
};

/**
 *
 * @returns {*}
 */
proto.getOperator = function() {
  return this._op;
};

/**
 * @param op (workflow instance)
 *
 * @since g3w-client-plugin-editing@3.8.0
 */
proto.setOperator = function(op) {
  this._op = op;
};

/**
 *
 * @returns {*}
 */
proto.getSession = function() {
  return this._session;
};

/**
 *
 * @param session
 */
proto.setSession = function(session) {
  this._session = session;
};

/**
 *
 */
proto.clear = function() {
  this.state.enabled = false;
  this.state.active  = false;
};

/**
 *
 * @returns {*|null}
 */
proto.getMessage = function() {
  const operator = this.getOperator();
  return operator.getHelpMessage()
    || operator.getRunningStep() ? this.state.messages : null;
};

/**
 * Return help message to visualize on toolbox help
 * 
 * @since g3w-client-plugin-editing@v3.6.2
 * 
 * @returns {*}
 */
proto.getHelpMessage = function() {
  return this.state.messages.help || this.getName();
};

/**
 *
 * @param message
 */
proto.setMessage = function(message) {
  this.state.message = message;
};

/**
 *
 */
proto.clearMessage = function() {
  this.state.message = null;
};

/**
 *
 */
proto.resetDefault = function(){
  this.state.visible        = true;
  this.state.enabled        = false;
  this.state.messages       =  this._op.getMessages();
  this.disabledtoolsoftools = []; //reset disabled tools eventually set by other
};

module.exports = Tool;
