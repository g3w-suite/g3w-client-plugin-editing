/**
 * @file
 * 
 * ORIGINAL SOURCE: g3w-client/src/core/workflow/step.js@v3.9.1
 * 
 * @since g3w-client-plugin-editing@v3.8.x
 */
import { Task }                  from '../../g3wsdk/workflow/task';
import { promisify, $promisify } from '../../utils/promisify';

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
class Step extends G3WObject {
  
  constructor(options = {}) {

    super();

    const {
      inputs  = null,
      context = null,
      task    = null,
      outputs = null,
      escKeyPressEventHandler,
    } = options;

    /**
     * @FIXME add description
     */
    this._inputs = inputs;

    /**
     * @FIXME add description
     */
    this._context = context;

    /**
     * @FIXME add description
     */
    this._task = task;

    /**
     * @FIXME add description
     */
    this._outputs = outputs;

    /**
     * Dynamic state of step
     */
    this.state = {
      id:      options.id || null,
      name:    options.name || null,
      help:    options.help || null,   // help to show what the user has to do
      running: false,                  // running
      error:   null,                   // error
      message: options.message || null // message
    };

    if (escKeyPressEventHandler) {
      this.registerEscKeyEvent(escKeyPressEventHandler)
    }

  }

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
    $(document).on('keyup', { callback, task: this.getTask()}, this.escKeyUpHandler);
  }

  /**
   * @listens run
   * @listens stop
   */
  registerEscKeyEvent(callback) {
    this.on('run', ()  => this.bindEscKeyUp(callback));
    this.on('stop', () => this.unbindEscKeyUp());
  }

  /**
   * Start task
   * 
   * @param inputs
   * @param context
   * 
   * @returns jQuery promise
   * 
   * @fires run
   */ 
  run(inputs, context) {
    return $promisify(async () => {
      this.emit('run', { inputs, context });
      if (!this._task) {
        return;
      }
      try {
        this.state.running = true;                // change state to running
        this._task.setInputs(inputs);
        this._task.setContext(context);
        if(!this._task.run) {
          console.trace(this);
        }
        const outputs = await promisify(this._task.run(inputs, context));
        return outputs;
      } catch (e) {
        console.warn(e);
        this.state.error = e;
        return Promise.reject(e);
      } finally{
        this.stop();
      }
    });
  }

  /**
   * Stop step
   * 
   * @fires stop
   */
  stop() {
    this._task.stop(this._inputs, this._context);   // stop task
    this.state.running = false;                     // remove running state 
    this.emit('stop');
    this._task.setInputs(null);
    this._task.setContext(null);
  }

  /**
   * Revert task
   */
  revert() {
    if (this._task && this._task.revert) {
      this._task.revert();
    }
  }

  /**
   * @FIXME add description
   */
  panic() {
    if (this._task && this._task.panic) {
      this._task.panic();
    }
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
  setInputs(inputs) {
    this._inputs = inputs;
  }

  /**
   * @FIXME add description
   */
  getInputs() {
    return this._inputs;
  }

  /**
   * @FIXME add description
   */
  setTask(task) {
    this._task = task;
  }

  /**
   * @FIXME add description
   */
  getTask() {
    return this._task;
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

export default Step;

export class EditingStep extends Task {

  constructor(options = {}) {
    super(options);

    options.task = this;

    console.assert(undefined !== options.run, options.run)

    this.run  = options.run.bind(this);
    this.stop = (options.stop || (() => true)).bind(this);

    return new Step(options);
  }
}