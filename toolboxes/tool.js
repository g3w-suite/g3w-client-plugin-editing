import { $promisify, promisify } from '../utils/promisify';

const { GUI }       = g3wsdk.gui;
const { G3WObject } = g3wsdk.core;
const { Layer }     = g3wsdk.core.layer;

export class Tool extends G3WObject {

  constructor(layer, session, options) {
    super();

    /** @type { 'create' | 'update_attributes' | 'update_geometry' | delete' | undefined } undefined means all possible tools base on type */
    const capabilities = layer.getEditingCapabilities();

    // skip when ..
    if (!options || (capabilities && !options.type.filter(type => capabilities.includes(type)).length > 0)) {
      this.INVALID = true;
      return;
    }

    // in case of capabilities show all tools on a single row
    if (capabilities) {
      options.row = 1;
    }

    options.visible           = undefined !== options.visible ? options.visible : true;

    this._options             = null;
    this._session             = session;
    /** layer owner of tool */
    this._layer               = layer,
    this._op                  = new options.op({ layer });
    this._once                = undefined !== options.once ? options.once : false;
    /** @type {*[]} */
    this.type                 = undefined !== options.type ? options.type : [];
    this.conditions           = undefined !== options.conditions ? options.conditions : {};
    this.disabledtoolsoftools = [];
    
    this.state                = {
      id:       options.id,
      name:     options.name,
      enabled:  false,
      visible:  options.visible instanceof Function ? (() => options.visible(this))() : options.visible,
      active:   false,
      icon:     options.icon,
      message:  null,
      row:      options.row || 1,
      messages: this._op.getMessages()
    };

  }

  /** @param hideSidebar */
  start(hideSidebar = false) {
    this._options = {
      inputs:  { layer: this._layer, features: [] },
      context: { session: this._session }
    };
    if (this._op) {
      this.state.active = true;
      setTimeout(async() => await this._startOp(this._options, hideSidebar)); // prevent rendering change state
    }
  }

  async _startOp(options, hideSidebar) {
    this._op.once('settoolsoftool', tools => {
      // filter eventually disable tools of tools
      tools = tools.filter(tool => !this.disabledtoolsoftools.includes(tool.type));
      if (tools.length) {
        this.emit('settoolsoftool', tools)
      }
    });
    this._op.once('start',   index => this.emit('active', index));
    this._op.once('stop', index => this.emit('deactive', index));
    //add also in case of reject event
    this._op.once('reject', index => this.emit('deactive', index));
    //reset features
    options.inputs.features = [];
    if (hideSidebar) {
      GUI.hideSidebar();
    }
    try {
      await promisify(this._op.start(options));
      await promisify(this._session.save());
      g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').saveChange(); // after save temp change check if editing service has a autosave
    } catch (e) {
      console.warn(e);
      if (hideSidebar) {
        GUI.showSidebar();
      }
      this._session.rollback();
    } finally {
      if (!this._once && Layer.LayerTypes.TABLE !== this._layer.getType() ) {
        await this._startOp(options, hideSidebar);
      } else {
        this.stop();
      }
    }
  }

  stop(force=false) {
    return $promisify(async () => {
      if (!this._op) {
        this.emit('stop', { session: this._session });
        return
      }
      try {
        await promisify(this._op.stop(force));
      } catch (e) {
        console.warn(e)
        this._session.rollback();
      } finally {
        this._options = null;
        this.state.active = false;
        this.emit('stop', { session: this._session });
      }
    });
  }

  /**
   * Return help message to visualize on toolbox help
   * 
   * @since g3w-client-plugin-editing@v3.6.2
   */
  getHelpMessage()       { return this.state.messages.help || this.getName(); }
  getMessage()           { return this._op.getHelpMessage() || this._op.getRunningStep() ? this.state.messages : null; }
  getState()             { return this.state; };
  getId()                { return this.state.id; }
  getName()              { return this.state.name; }
  isActive()             { return this.state.active; }
  getIcon()              { return this.state.icon; }
  isEnabled()            { return this.state.enabled; }
  isVisible()            { return this.state.visible; }
  getSession()           { return this._session; }
  getOperator()          { return this._op; }
  getLayer()             { return this._layer; }
  getType()              { return this.type; }
  getFeature()           { return this._options.inputs.features[0]; }
  /**
   * @param op (workflow instance)
   *
   * @since g3w-client-plugin-editing@v3.8.0
   */
  setOperator(op)        { this._op = op; }
  setState(state)        { this.state = state; }
  setId(id)              { this.state.id = id; }
  setActive(bool=false)  { this.state.active = bool; }
  setIcon(icon)          { this.state.icon = icon; }
  setEnabled(bool=false) { this.state.enabled = bool }
  setVisible(bool=true)  { this.state.visible = bool; }
  setSession(session)    { this._session = session; }
  setMessage(message)    { this.state.message = message; }
  clearMessage()         { this.state.message = null; }

  clear() {
    this.state.enabled = false;
    this.state.active  = false;
  }
  
  resetDefault() {
    this.state.visible        = true;
    this.state.enabled        = false;
    this.state.messages       = this._op.getMessages();
    this.disabledtoolsoftools = []; //reset disabled tools eventually set by other
  }
}