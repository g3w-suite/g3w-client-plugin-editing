/**
 * @file
 * 
 * ORIGINAL SOURCE: g3w-client/src/core/workflow/task.js@v3.9.1
 * 
 * @since g3w-client-plugin-editing@v3.8.x
 */

const { G3WObject }     = g3wsdk.core;
const { base, inherit } = g3wsdk.core.utils;
const { GUI }           = g3wsdk.gui;

function Task(options={}) {
  base(this, options);
  this.state = {
    usermessagesteps: {}
  };
}

inherit(Task, G3WObject);

const proto = Task.prototype;

/**
 * Set and get task usefult properties used to run
 */

proto.setInputs = function(inputs){
  this.inputs = inputs;
};

/**
 *
 * @return {*}
 */
proto.getInputs = function(){
  return this.inputs;
};

/**
 *
 * @param context
 * @return {*}
 */
proto.setContext = function(context){
  return this.context = context;
};

/**
 *
 * @return {*}
 */
proto.getContext = function(){
  return this.context;
};

/**
 *
 */
proto.revert = function() {
  console.log('Revert to implement ');
};

/**
 *
 */
proto.panic = function() {
  console.log('Panic to implement ..');
};

/**
 *
 */
proto.stop = function() {
  console.log('Task Stop to implement ..');
};

/**
 *
 */
proto.run = function() {
  console.log('Wrong. This method has to be overwrite from task');
};

/**
 *
 * @param task
 */
proto.setRoot = function(task) {
  this.state.root = task;
};

/**
 *
 * @return {{}}
 */
proto.getUserMessageSteps = function() {
  return this.state.usermessagesteps;
};

/**
 *
 * @param steps
 */
proto.setUserMessageSteps = function(steps={}) {
  this.state.usermessagesteps = steps;
};

/**
 *
 * @param type
 */
proto.setUserMessageStepDone = function(type) {
  if (type) {
    this.state.usermessagesteps[type].done = true;
  }
};

export default Task;

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@3.7.1
 * 
 * Base editing task
 *
 * @param options
 *
 * @constructor
 */
export class EditingTask extends Task {

  constructor(options = {}) {

    super(options);

    this.selectStyle = options.selectStyle; /* @since 3.8.0 */

    this.addInteraction = function(interaction) {
      GUI.getService('map').addInteraction(interaction);
    };

    this.removeInteraction = function(interaction) {
      setTimeout(() => GUI.getService('map').removeInteraction(interaction)) // timeout needed to work around an Openlayers issue
    };

  }

  /**
   * @TODO code implementation
   *
   * Get editing type from editing config
   *
   * @returns { null }
   */
  getEditingType() {
    return null;
  }

  /**
   * @FIXME add description
   */
  registerPointerMoveCursor() {
    GUI.getService('map').getMap().on("pointermove", this._pointerMoveCursor)
  }

  /**
   * @FIXME add description
   */
  unregisterPointerMoveCursor() {
    GUI.getService('map').getMap().un("pointermove", this._pointerMoveCursor)
  }

  /**
   * @param evt
   *
   * @private
   */
  _pointerMoveCursor(evt) {
    this.getTargetElement().style.cursor = (this.forEachFeatureAtPixel(evt.pixel, () => true) ? 'pointer' : '');
  }

  /**
   * @param steps
   */
  setSteps(steps = {}) {
    this._steps = steps;
    this.setUserMessageSteps(steps);
  }

  /**
   * @returns {{}}
   */
  getSteps() {
    return this._steps;
  }

  /**
   * @returns {*}
   */
  getMap() {
    return GUI.getService('map').getMap();
  }

  /**
   * Disable sidebar
   * 
   * @param {Boolean} bool
   */
  disableSidebar(bool = true) {
    if (!this._isContentChild) {
      GUI.disableSideBar(bool);
    }
  }

  /**
   * @param event
   * @param options
   *
   * @returns {*}
   */
  fireEvent(event, options={}) {
    return g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').fireEvent(event, options);
  }

  /**
   * @param inputs
   * @param context
   */
  run(inputs, context) {}

  /**
   * @FIXME add description
   */
  stop() {}

  /**
   * Handle single task
   */
  saveSingle(input, context) {
    context.session.save().then(() => g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').saveChange());
  }

  /**
   * Cancel single task
   *
   * @param input
   * @param context
   */
  cancelSingle(input, context) {
    context.session.rollback();
  }

  /**
   * @param get_default_value to context of task
   */
  setContextGetDefaultValue(get_default_value = false) {
    this.getContext().get_default_value = get_default_value;
  }

}