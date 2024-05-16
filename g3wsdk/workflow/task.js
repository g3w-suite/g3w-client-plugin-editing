const { G3WObject } = g3wsdk.core;
const { GUI }       = g3wsdk.gui;

/**
 * ORIGINAL SOURCE: g3w-client/src/core/workflow/task.js@v3.9.1
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@v3.7.1
 * 
 * Base editing task
 *
 * @param options
 *
 * @constructor
 */
export class Task extends G3WObject {

  constructor(options = {}) {
    super(options);

    /**
     * ORIGINAL SOURCE: g3w-client/src/core/workflow/task.js@v3.9.1
     * 
     * @since g3w-client-plugin-editing@v3.8.0
     */
    this.state = {
      usermessagesteps: {}
    };

    this.selectStyle = options.selectStyle; /* @since 3.8.0 */

    /** @since g3w-client-plugin-editing@v3.8.0 */
    if (options.steps) {
      this.setSteps(options.steps);
    }
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/workflow/task.js@v3.9.1
   * 
   * Set and get task usefult properties used to run
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  setInputs(inputs) {
    this.inputs = inputs;
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/workflow/task.js@v3.9.1
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  getInputs() {
    return this.inputs;
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/workflow/task.js@v3.9.1
   * 
   * @param context
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  setContext(context) {
    return this.context = context;
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/workflow/task.js@v3.9.1
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  getContext() {
    return this.context;
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/workflow/task.js@v3.9.1
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  revert() {
    console.log('Revert to implement ');
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/workflow/task.js@v3.9.1
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  panic() {
    console.log('Panic to implement ..');
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/workflow/task.js@v3.9.1
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  stop() {
    console.log('Task Stop to implement ..');
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/workflow/task.js@v3.9.1
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  run() {
    console.log('Wrong. This method has to be overwrite from task');
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/workflow/task.js@v3.9.1
   * 
   * @param task
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  setRoot(task) {
    this.state.root = task;
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/workflow/task.js@v3.9.1
   * 
   * @returns { Object }
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  getUserMessageSteps() {
    return this.state.usermessagesteps;
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/workflow/task.js@v3.9.1
   * 
   * @param steps
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  setUserMessageSteps(steps={}) {
    this.state.usermessagesteps = steps;
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/workflow/task.js@v3.9.1
   * 
   * @param type
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  setUserMessageStepDone(type) {
    if (type) {
      this.state.usermessagesteps[type].done = true;
    }
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@v3.7.1
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  addInteraction(interaction) {
    GUI.getService('map').addInteraction(interaction);
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@v3.7.1
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
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
   * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@v3.7.1
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  registerPointerMoveCursor() {
    GUI.getService('map').getMap().on("pointermove", this._pointerMoveCursor)
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@v3.7.1
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  unregisterPointerMoveCursor() {
    GUI.getService('map').getMap().un("pointermove", this._pointerMoveCursor)
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@v3.7.1
   * 
   * @param evt
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  _pointerMoveCursor(evt) {
    this.getTargetElement().style.cursor = (this.forEachFeatureAtPixel(evt.pixel, () => true) ? 'pointer' : '');
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@v3.7.1
   * 
   * @param steps
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  setSteps(steps = {}) {
    this._steps = steps;
    this.setUserMessageSteps(steps);
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@v3.7.1
   * 
   * @returns { Object }
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  getSteps() {
    return this._steps;
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@v3.7.1
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  getMap() {
    return GUI.getService('map').getMap();
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@v3.7.1
   *
   * Disable sidebar
   *
   * @param {Boolean} bool
   *
   * @since g3w-client-plugin-editing@v3.8.0
   */
  disableSidebar(bool = true) {
    if (!this._isContentChild) {
      GUI.disableSideBar(bool);
    }
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@v3.7.1
   *
   * @param event
   * @param options
   *
   * @returns {*}
   *
   * @since g3w-client-plugin-editing@v3.8.0
   */
  fireEvent(event, options={}) {
    return g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').fireEvent(event, options);
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@v3.7.1
   *
   * @param inputs
   * @param context
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  run(inputs, context) {}

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@v3.7.1
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  stop() {}

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@v3.7.1
   * 
   * Handle single task
   *
   * @since g3w-client-plugin-editing@v3.8.0
   */
  saveSingle(input, context) {
    context.session.save().then(() => g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').saveChange());
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@v3.7.1
   * 
   * Cancel single task
   *
   * @param input
   * @param context
   *
   * @since g3w-client-plugin-editing@v3.8.0
   */
  cancelSingle(input, context) {
    context.session.rollback();
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@v3.7.1
   * 
   * @param get_default_value to context of task
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  setContextGetDefaultValue(get_default_value = false) {
    this.getContext().get_default_value = get_default_value;
  }

}