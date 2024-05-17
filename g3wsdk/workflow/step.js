/**
 * @file
 * 
 * ORIGINAL SOURCE: g3w-client/src/core/workflow/step.js@v3.9.1
 * 
 * @since g3w-client-plugin-editing@v3.8.x
 */
import { promisify, $promisify } from '../../utils/promisify';

const { GUI }       = g3wsdk.gui;
const { G3WObject } = g3wsdk.core;

/**
 * @param options.input
 * @param options.context
 * @param options.task
 * @param options.outputs
 * @param options.escKeyPressEventHandler
 * @param options.id
 * @param options.name
 * @param options.help
 * @param options.message
 */
export class Step extends G3WObject {
  
  constructor(options = {}) {

    super();

    this._options = options;

    this._run  = (options.run  || this.run  || (async () => true)).bind(this);
    this._stop = (options.stop || this.stop || (async () => true)).bind(this);

    /**
     * @FIXME add description
     */
    this._inputs = options.inputs || null;

    /**
     * @FIXME add description
     */
    this._context = options.context || null;

    /**
     * @FIXME add description
     */
    this._outputs = options.outputs || null;

    /**
     * Dynamic state of step
     */
    this.state = {
      id:      options.id || null,
      name:    options.name || null,
      help:    options.help || null,   // help to show what the user has to do
      running: false,                  // running
      error:   null,                   // error
      message: options.message || null, // message
      /**
       * ORIGINAL SOURCE: g3w-client/src/core/workflow/task.js@v3.9.1
       * 
       * @since g3w-client-plugin-editing@v3.8.0
       */
      usermessagesteps: {}
    };

    this.registerEscKeyEvent(options.escKeyPressEventHandler)

    /**
     * ORIGINAL SOURCE: g3w-client/src/core/workflow/task.js@v3.9.1
     * 
     * @since g3w-client-plugin-editing@v3.8.0
     */
    this.selectStyle = options.selectStyle;

    /**
     * ORIGINAL SOURCE: g3w-client/src/core/workflow/task.js@v3.9.1
     * 
     * @since g3w-client-plugin-editing@v3.8.0
     */
    if (options.steps) {
      this.setSteps(options.steps);
    }

    /**
     * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/addfeaturetask.js@v3.7.1
     * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/addfeaturestep.js@v3.7.1
     * 
     * @since g3w-client-plugin-editing@v3.8.0
     */
    if (options.onRun) {
      this.on('run', options.onRun);
    }

    /**
     * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/addfeaturetask.js@v3.7.1
     * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/addfeaturestep.js@v3.7.1
     * 
     * @since g3w-client-plugin-editing@v3.8.0
     */
    if (options.onStop) {
      this.on('run', options.onStop);
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
    this._inputs = this.inputs = inputs;
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/workflow/task.js@v3.9.1
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  getInputs() {
    return this._inputs;
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/workflow/task.js@v3.9.1
   * 
   * @param context
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  setContext(context) {
    return this._context = this.context = context;
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
   * Revert task
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

  // /**
  //  * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@v3.7.1
  //  * 
  //  * @param get_default_value to context of task
  //  * 
  //  * @since g3w-client-plugin-editing@v3.8.0
  //  */
  // setContextGetDefaultValue(get_default_value = false) {
  //   this.getContext().get_default_value = get_default_value;
  // }

  /**
   * Bind interrupt event on keys escape pressed
   * 
   * @param evt.key
   * @param evt.data.callback
   * @param evt.data.task
   */
  escKeyUpHandler(evt) {
    if ('Escape' === evt.key) {
      evt.data.callback({ task: evt.data.task });
    }
  }

  /**
   * @FIXME add description
   */
  unbindEscKeyUp() {
    $(document).unbind('keyup', this.escKeyUpHandler);
  }

  /**
   * @FIXME add description
   */
  bindEscKeyUp(callback = () => {}) {
    $(document).on('keyup', { callback, task: this }, this.escKeyUpHandler);
  }

  /**
   * @listens run
   * @listens stop
   */
  registerEscKeyEvent(callback) {
    if (callback) {
      this.on('run', ()  => this.bindEscKeyUp(callback));
      this.on('stop', () => this.unbindEscKeyUp());
    }
  }

  /**
   * 
   * ORIGINAL SOURCE: g3w-client/src/core/workflow/task.js@v3.9.1
   * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@v3.7.1
   * 
   * Start task
   * 
   * @param inputs
   * @param context
   * 
   * @returns jQuery promise
   * 
   * @fires run
   */ 
  __run(inputs, context) {
    return $promisify(async() => {
      this.setContext(context);
      this.emit('run', { inputs, context });
      try {
        this.state.running = true;                // change state to running
        return await promisify(this._run(inputs, context));
      } catch (e) {
        console.warn(e);
        this.state.error = e;
        return Promise.reject(e);
      } finally{
        this.__stop();
      }
    });
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/workflow/task.js@v3.9.1
   * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@v3.7.1
   *
   * Stop step
   *
   * @fires stop
   */
  __stop() {
    this._stop(this._inputs, this._context);   // stop task
    this.state.running = false;                // remove running state 
    this.emit('stop');
  }

  /**
   * @FIXME add description
   */
  getId() {
    return this.state.id;
  }

  /**
   * @FIXME add description
   */
  getName() {
    return this.state.name;
  }

  /**
   * @FIXME add description
   */
  getHelp() {
    return this.state.help;
  }

  /**
   * @FIXME add description
   */
  getError() {
    return this.state.error;
  }

  /**
   * @FIXME add description
   */
  getMessage() {
    return this.state.message;
  }

  /**
   * @FIXME add description
   */
  isRunning() {
    return this.state.running;
  }

  /**
   * @FIXME add description
   */
  getTask() {
    return this;
  }

  /**
   * @FIXME add description
   */
  setOutputs(outputs) {
    this._outputs = outputs;
  }

  /**
   * @FIXME add description
   */
  getOutputs() {
    return this._outputs;
  }

}

/**
 * @FIXME add description
 */
Step.MESSAGES = {
  help: null,
};