
/**
 * @file
 * 
 * ORIGINAL SOURCE: g3w-client/src/core/workflow/workflow.js@v3.9.1
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/editingworkflow.js@v3.7.1
 * 
 * @since g3w-client-plugin-editing@v3.8.x
 */

import { Step }                  from './step';
import { promisify, $promisify } from '../../utils/promisify';

const { GUI }                 = g3wsdk.gui;
const { G3WObject }           = g3wsdk.core;

/**
 * Workflow Class (manage flow of steps)
 *
 * @param options.inputs
 * @param options.context
 * @param options.flow
 * @param options.steps
 * @param options.runOnce
 * @param options.backbuttonlabel
 */
export class Workflow extends G3WObject {
  
  constructor(options = {}) {

    super();

    /** @since g3w-client-plugin-editing@v3.8.0*/
    this._type = undefined !== options.type ? options.type : null;

    /**
     * @since g3w-client-plugin-editing@v3.8.0
     */
    this._options = options;

    /**
     * @FIXME add description
     */
    this._promise = null;

    /**
     * Mandatory inputs to work with editing
     */
    this._inputs = undefined !== options.inputs ? options.inputs : null;

    /**
     * @FIXME add description
     */
    this._context = undefined !== options.context ? options.context : null;

    /**
     * All steps of flow
     */
    this._steps = options.steps || [];

    /**
     * Whether is child of another workflow
     */
    this._child = null;

    /**
     * stack workflowindex
     */
    this._stackIndex = null;

    /**
     * Stop when flow stop
     */
    this.runOnce = options.runOnce || false;

    /**
     * @FIXME add description
     */
    this._messages = Step.MESSAGES;

    /**
     * Store user messages steps to show when workflow
     * use a mandatory steps (ex. select: {description}, merge: {description}}
     */
    this._userMessageSteps = {};

    if (this._steps.length > 0) {
      this.setUserMessagesSteps(this._steps);
    }

    /**
     * Holds back button label (in case of child workflow)
     * 
     * @since 3.9.0
     */
    this.backbuttonlabel = undefined !== options.backbuttonlabel ? options.backbuttonlabel : null;

    /**
     * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/editingworkflow.js@v3.7.1
     * 
     * @since g3w-client-editing@v3.8.0
     */
    this.helpMessage  = options.helpMessage ? { help: options.helpMessage } : null;

    /**
     * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/editingworkflow.js@v3.7.1
     * 
     * @since g3w-client-editing@v3.8.0
     */
    this._toolsoftool = [];

    /**
     * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/editingworkflow.js@v3.7.1
     * 
     * @since g3w-client-editing@v3.8.0
     */
    if (true === options.registerEscKeyEvent) {
      this.registerEscKeyEvent();
    }

    /**
     * ORIGINAL SOURCE: g3w-client/src/core/workflow/flow.js@v3.9.1
     * 
     * Current flow step
     * 
     * @since g3w-client-editing@v3.8.0
     */
    this._stepIndex = 0;

  }

  /**
   *
   * @param steps
   */
  setUserMessagesSteps(steps) {
    this._userMessageSteps = steps
      .reduce((messagesSteps, step) => ({
        ...messagesSteps,
        ...(step.getUserMessageSteps() || {})
      }), {});
  }

  /**
   * Check if it is in same type
   *
   * @param {String | Array.<string[]>} type
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  isType(type) {
    if (Array.isArray(type)) {
      return Boolean(type.find(t => t === this._type));
    }
    return type === this._type;
  }

  /**
   * @returns { * }
   */
  getContextService() {
    return this.getContext().service;
  }

  /**
   * @param service
   */
  setContextService(service) {
    this.getContext().service = service;
  }

  /**
   * @returns { null | * }
   */
  getStackIndex() {
    return this._stackIndex;
  }

  /**
   * @param workflow
   */
  addChild(workflow) {
    if (this._child) {
      this._child.addChild(workflow);
    } else {
      this._child = workflow;
    }
  }

  /**
   * @param input.key
   * @param input.value
   */
  setInput({ key, value }) {
    this._inputs[key] = value;
  }

  /**
   * @returns { null | * }
   */
  getInputs() {
    return this._inputs;
  }

  /**
   * @param context
   */
  setContext(context) {
    this._context = context;
  }

  /**
   * @returns { * | {} | null }
   */
  getContext() {
    return this._context;
  }

  /**
   * @param step
   */
  addStep(step) {
    this._steps.push(step);
  }

  /**
   * @param steps
   */
  setSteps(steps = []) {
    this._steps = steps;
    this.setUserMessagesSteps(steps);
  }

  /**
   * @returns { * | Array }
   */
  getSteps() {
    return this._steps;
  }

  /**
   * @param index
   * 
   * @returns { * }
   */
  getStep(index) {
    return this._steps[index];
  }

  /**
   * @param messages
   */
  setMessages(messages) {
    Object.assign(this._messages, messages);
  }

  /**
   * @FIXME add description
   */
  getMessages() {
    return this._messages;
  }

  /**
   * @FIXME add description
   */
  clearMessages() {
    this._messages.help = null;
    if (Object.keys(this._userMessageSteps).length > 0) {
      this.clearUserMessagesSteps();
    }
  }

  /**
   * @returns { * | null }
   */
  getLastStep() {
    return this._steps.length > 0 ? this._steps[ this._steps.length - 1 ] : null;
  }

  /**
   * @returns { Object }
   */
  getRunningStep() {
    return this._steps.find(s => s.isRunning());
  }

  /**
   * @FIXME add description
   */
  reject() {
    if (this._promise) {
      this._promise.reject();
    }
    this.emit('reject');
  }

  /**
   * @FIXME add description
   */
  resolve() {
    if (this._promise) {
      this._promise.resolve();
    }
  }

  /**
   * Method to run steps of workflow
   * @param step
   * @param inputs
   * @return {Promise<unknown>}
   */
  async runStep(step, inputs) {
    try {
      //set step message
      this.setMessages({ help: step.state.help });

      //@since 3.9.1
      this.emit('settoolsoftool', (step.tools || []));
      //run step
      const outputs = await promisify(step.__run(inputs, this.getContext()));
      // onDone → check if all step is resolved
      this._stepIndex++;
      //check if is the last of workflow steps
      if (this._stepIndex === this.getSteps().length) {
        this._stepIndex = 0;
        return outputs;
      } else {
        return this.runStep(this.getSteps()[this._stepIndex], outputs);
      }
    } catch(e) { //In case of reject
      this._stepIndex = 0;
      return Promise.reject(e);
    }
  }

  /**
   * Start workflow
   * 
   * @param options.inputs
   * @param options.context
   * @param options.flow
   * @param options.steps
   * 
   * @fires start
   */
  start(options = {}) {
    return $promisify( new Promise(async (resolve, reject) => {
      this._promise = { resolve, reject };
      this._inputs  = options.inputs;
      this._context = options.context || {};
  
      const isChild = this._context.isChild || false;
      
      // stop child when a workflow is running 
      if (
          !isChild
          && Workflow.Stack.getLength()
          && this !== Workflow.Stack.getCurrent()
      ) {
        Workflow.Stack.getCurrent().addChild(this);
      }

      //get stack index
      this._stackIndex = Workflow.Stack.push(this);
      //get steps
      this._steps      = options.steps || this._steps;
      //for each step assign current workflow to _workflow
      (this._steps || []).forEach(s => s._workflow = this);
  
      const showUserMessage = Object.keys(this._userMessageSteps).length > 0;
  
      if (showUserMessage) {
        GUI.showUserMessage({
          title:    'plugins.editing.workflow.title.steps',
          type:     'tool',
          position: 'left',
          size:     'small',
          closable: false,
          hooks: {
            body: {
              ...require('../../components/UserMessage.vue').default,
              data: () => ({
                steps: this._userMessageSteps,
              })
            }
          }
        });
      }
      //emit start Workflow
      this.emit('start');
  
      try {
        console.assert(0 === this._stepIndex, `reset workflow before restarting: ${this._stepIndex}`)
        //start flow of workflow
        const outputs = await this.runStep(this.getSteps()[this._stepIndex], this.getInputs());
        //In case of show user message (tool steps)
        if (showUserMessage) {
          setTimeout(() => { this.clearUserMessagesSteps(); resolve(outputs); }, 500);
        } else {
          resolve(outputs);
        }
      } catch(e) {
        console.warn(e);
        if (showUserMessage) {
          this.clearUserMessagesSteps();
        }
        reject(e);
      }

      //in case of worflow that need to run once time, stop workflow
      if (this.runOnce) {
        this.stop();
      }
    }));
  }

  /**
   * Stop workflow during flow
   * 
   * @fires stop
   */
  async stop() {
    return $promisify(new Promise(async (resolve, reject) => {

      this._promise = null;

      try {
        // stop child workflow
        if (this._child) {
          await promisify(this._child.stop());
        }
      } catch(e) {
        console.warn(e);
      }
      //remove child
      this._child = null;

      // stop flow
      try {
        //get current step
        const step = this.getSteps()[this._stepIndex];
        //check if it is running
        if (step.isRunning()) {
          //clear messages steps
          this.clearMessages();
          //wait stop run
          await step.__stop();
        }
        // reset counter and reject flow
        if (this._stepIndex > 0) {
          this._stepIndex = 0;
          reject();
          return Promise.reject();
        } else {
          resolve();
        }
      } catch(e) {
        console.warn(e);
        reject(e);
      } finally {
        //remove workflow from stack
        Workflow.Stack.removeAt(this.getStackIndex());

        //emit stop Workflow
        this.emit('stop');
      }

      

    }));
  }

  /**
   * Reset user message steps
   */
  clearUserMessagesSteps() {
    Object
      .keys(this._userMessageSteps)
      .forEach(type => {
        const step = this._userMessageSteps[type];
        step.done  = false;
        if (step.buttonnext) {
          step.buttonnext.disabled = true;
        }
    })
    GUI.closeUserMessage();
  }

  /**
   * @since 3.9.0
   */
  setBackButtonLabel(label = null) {
    this.backbuttonlabel = label;
  }

  /**
   * @returns { null }
   * 
   * @since 3.9.0
   */
  getBackButtonLabel() {
    return this.backbuttonlabel;
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/editingworkflow.js@v3.7.1
   * 
   * @param step
   * @param tools
   * 
   * @since g3w-client-editing@v3.8.0
   */
  addToolsOfTools({ step, tools = [] }) {
    step.setToolsOfTools(this, tools);
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/editingworkflow.js@v3.7.1
   * 
   * @since g3w-client-editing@v3.8.0
   */
  setHelpMessage(message) {
    this.helpMessage = { help: message };
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/editingworkflow.js@v3.7.1
   * 
   * @since g3w-client-editing@v3.8.0
   */
  getHelpMessage() {
    return this.helpMessage;
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/editingworkflow.js@v3.7.1
   * 
   * @since g3w-client-editing@v3.8.0
   */
  getFeatures() {
    return this.getInputs().features;
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/editingworkflow.js@v3.7.1
   * 
   * @since g3w-client-editing@v3.8.0
   */
  startFromLastStep(options = {}) {
    this.setSteps([ this.getSteps().pop() ]);
    return this.start(options);
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/editingworkflow.js@v3.7.1
   * 
   * @since g3w-client-editing@v3.8.0
   */
  getCurrentFeature() {
    const feats = this.getFeatures();
    return feats[feats.length - 1];
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/editingworkflow.js@v3.7.1
   * 
   * @since g3w-client-editing@v3.8.0
   */
  getLayer() {
    return this.getInputs().layer;
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/editingworkflow.js@v3.7.1
   * 
   * @since g3w-client-editing@v3.8.0
   */
  getSession() {
    return this.getContext().session;
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/editingworkflow.js@v3.7.1
   * 
   * bind interupt event
   * 
   * @since g3w-client-editing@v3.8.0
   */
  escKeyUpHandler(evt) {
    if (27 === evt.keyCode) {
      evt.data.workflow.reject();
      evt.data.callback();
    }
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/editingworkflow.js@v3.7.1
   * 
   * @since g3w-client-editing@v3.8.0
   */
  unbindEscKeyUp() {
    $(document).unbind('keyup', this.escKeyUpHandler);
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/editingworkflow.js@v3.7.1
   * 
   * @since g3w-client-editing@v3.8.0
   */
  bindEscKeyUp(callback = () => {}) {
    $(document).on('keyup', { workflow: this, callback }, this.escKeyUpHandler);
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/editingworkflow.js@v3.7.1
   * 
   * @since g3w-client-editing@v3.8.0
   */
  registerEscKeyEvent(callback) {
    this.on('start', () => this.bindEscKeyUp(callback));
    this.on('stop',  () => this.unbindEscKeyUp());
  }

}

/** @type { Workflow[] } */
const workflows = [];

/**
 * ORIGINAL SOURCE: g3w-client/src/services/workflow.js@v3.9.1
 * 
 * Store all activated workflows
 * 
 * @since g3w-client-plugin-editing@v3.8.0
 */
Workflow.Stack = {
  _workflows: workflows,
  push(workflow) { return workflows.includes(workflow) ? workflows.indexOf(workflow) : (workflows.push(workflow) - 1); },
  getParent()    { return workflows.slice(-2)[0]; },
  getParents()   { return workflows.slice(0, -1); },
  pop()          { return workflows.pop(); },
  getLength()    { return workflows.length; },
  getFirst()     { return workflows[0]; },
  getCurrent()   { return Workflow.Stack.getLast(); },
  getLast()      { return workflows.slice(-1)[0]; },
  removeAt(i)    { workflows.splice(i, 1); },
  insertAt(i, w) { workflows[i] = w; },
  getAt(i)       { return workflows[i]; },
  async clear()  { workflows.splice(0); }
};