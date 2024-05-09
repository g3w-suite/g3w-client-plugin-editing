const { GUI }       = g3wsdk.gui;
const { G3WObject } = g3wsdk.core;
const { Layer }     = g3wsdk.core.layer;

module.exports = class Tool extends G3WObject {

  constructor(options = {}) {

    super();

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

  /**
   * @param options
   */
  setOptions(options={}) {
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
  }

  /**
   * Return layer owner of tool
   */
  getLayer() {
    return this._layer;
  }

  /**
   * @returns {*[]}
   */
  getType() {
    return this.type;
  }

  /**
   * @returns {*}
   */
  getFeature() {
    return this._options.inputs.features[0];
  }

  /**
   * @param options
   * 
   * @returns {{inputs: {features: *[], layer}, context: {session: *}}}
   */
  createOperatorOptions(options={features:[]}){
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
  }

  /**
   * @param hideSidebar
   */
  start(hideSidebar = false) {
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
  }

  /**
   * @param force
   * 
   * @returns {*}
   */
  stop(force=false) {
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
  }

  /**
   * @returns {*|{visible: (*|boolean), name, icon, active: boolean, messages: *, id, row: number, message: null, enabled: boolean}}
   */
  getState() {
    return this.state;
  };

  /**
   * @param state
   */
  setState(state) {
    this.state = state;
  }

  /**
   * @returns {*}
   */
  getId() {
    return this.state.id;
  }

  /**
   * @param id
   */
  setId(id) {
    this.state.id = id;
  }

  /**
   * @returns {*}
   */
  getName() {
    return this.state.name;
  }

  /**
   * @param bool
   */
  setActive(bool=false) {
    this.state.active = bool;
  }

  /**
   * @returns {boolean}
   */
  isActive() {
    return this.state.active;
  }

  /**
   * @returns {*}
   */
  getIcon() {
    return this.state.icon;
  }

  /**
   * @param icon
   */
  setIcon(icon) {
    this.state.icon = icon;
  }

  /**
   * @param bool
   */
  setEnabled(bool=false) {
    this.state.enabled = bool
  }

  /**
   * @returns {boolean}
   */
  isEnabled() {
    return this.state.enabled;
  }

  /**
   * @param bool
   */
  setVisible(bool=true) {
    this.state.visible = bool;
  }

  /**
   * @returns {*|boolean}
   */
  isVisible() {
    return this.state.visible;
  }

  /**
   * @returns {*}
   */
  getOperator() {
    return this._op;
  }

  /**
   * @param op (workflow instance)
   *
   * @since g3w-client-plugin-editing@v3.8.0
   */
  setOperator(op) {
    this._op = op;
  }

  /**
   * @returns {*}
   */
  getSession() {
    return this._session;
  }

  /**
   * @param session
   */
  setSession(session) {
    this._session = session;
  }

  /**
   *
   */
  clear() {
    this.state.enabled = false;
    this.state.active  = false;
  }

  /**
   * @returns {*|null}
   */
  getMessage() {
    const operator = this.getOperator();
    return operator.getHelpMessage()
      || operator.getRunningStep() ? this.state.messages : null;
  }

  /**
   * Return help message to visualize on toolbox help
   * 
   * @since g3w-client-plugin-editing@v3.6.2
   * 
   * @returns {*}
   */
  getHelpMessage() {
    return this.state.messages.help || this.getName();
  }

  /**
   * @param message
   */
  setMessage(message) {
    this.state.message = message;
  }

  /**
   *
   */
  clearMessage() {
    this.state.message = null;
  }

  /**
   *
   */
  resetDefault() {
    this.state.visible        = true;
    this.state.enabled        = false;
    this.state.messages       =  this._op.getMessages();
    this.disabledtoolsoftools = []; //reset disabled tools eventually set by other
  }
}