/**
 * @file
 * 
 * ORIGINAL SOURCE: g3w-client/src/core/workflow/task.js@v3.9.1
 * 
 * @since g3w-client-plugin-editing@v3.8.x
 */

const { G3WObject } = g3wsdk.core;
const { GUI }       = g3wsdk.gui;

class Task extends G3WObject {

  constructor(options={}) {
    super(options);
    this.state = {
      usermessagesteps: {}
    };
  }

  /**
   * Set and get task usefult properties used to run
   */
  setInputs(inputs) {
    this.inputs = inputs;
  }

  /**
   *
   * @return {*}
   */
  getInputs() {
    return this.inputs;
  }

  /**
   * @param context
   * 
   * @returns {*}
   */
  setContext(context) {
    return this.context = context;
  }

  /**
   * @returns {*}
   */
  getContext() {
    return this.context;
  }

  /**
   *
   */
  revert() {
    console.log('Revert to implement ');
  }

  /**
   *
   */
  panic() {
    console.log('Panic to implement ..');
  }

  /**
   *
   */
  stop() {
    console.log('Task Stop to implement ..');
  }

  /**
   *
   */
  run() {
    console.log('Wrong. This method has to be overwrite from task');
  }

  /**
   * @param task
   */
  setRoot(task) {
    this.state.root = task;
  }

  /**
   * @returns {{}}
   */
  getUserMessageSteps() {
    return this.state.usermessagesteps;
  }

  /**
   * @param steps
   */
  setUserMessageSteps(steps={}) {
    this.state.usermessagesteps = steps;
  }

  /**
   * @param type
   */
  setUserMessageStepDone(type) {
    if (type) {
      this.state.usermessagesteps[type].done = true;
    }
  }
}

export default Task;

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@v3.7.1
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

    /** @since g3w-client-plugin-editing@v3.8.0 */
    if (options.steps) {
      this.setSteps(options.steps);
    }
  }

  addInteraction(interaction) {
    GUI.getService('map').addInteraction(interaction);
  }

  removeInteraction(interaction) {
    setTimeout(() => GUI.getService('map').removeInteraction(interaction)) // timeout needed to work around an Openlayers issue
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