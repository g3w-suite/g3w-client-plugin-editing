
/**
 * @file
 * 
 * ORIGINAL SOURCE: g3w-client/src/core/workflow/workflow.js@v3.9.1
 * 
 * @since g3w-client-plugin-editing@v3.8.x
 */

import Flow             from './flow';
import WorkflowsStack   from './stack';
import Step             from './step';
import UserMessageSteps from '../../components/UserMessageSteps';

const { GUI }                 = g3wsdk.gui;
const { G3WObject }           = g3wsdk.core;
const { resolve }             = g3wsdk.core.utils;
const { isPointGeometryType } = g3wsdk.core.geoutils.Geometry;
const { Layer }               = g3wsdk.core.layer;

/**
 * Workflow Class (manage flow of steps)
 *
 * @param options.inputs
 * @param options.context
 * @param options.flow
 * @param options.steps
 * @param options.runOnce
 * @param options.backbuttonlabel
 *
 * @constructor
 */
export default class Workflow extends G3WObject {
  
  constructor(options = {}) {

    super();

    const {
      type            = null, /** @since g3w-client-plugin-editing@v3.8.0*/
      inputs          = null,
      context         = null,
      flow            = new Flow(),
      steps           = [],
      runOnce         = false,
      backbuttonlabel = null,
    } = options;

    this._type =  type;

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
    this._inputs = inputs;

    /**
     * @FIXME add description
     */
    this._context = context;

    /**
     * Flow object to control the flow
     */
    this._flow = flow;

    /**
     * All steps of flow
     */
    this._steps = steps || [];

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
    this.runOnce = runOnce;

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
    this.backbuttonlabel = backbuttonlabel;

  }

  /**
   *
   * @param steps
   */
  setUserMessagesSteps(steps) {
    this._userMessageSteps = steps
      .reduce((messagesSteps, step) => ({
        ...messagesSteps,
        ...(step.getTask().getUserMessageSteps() || {})
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
   * @FIXME add description
   */
  removeChild() {
    if (this._child) {
      WorkflowsStack.removeAt(this._child.getStackIndex());
    }
    this._child = null;
  }

  /**
   * @param input.key
   * @param input.value
   */
  setInput({
    key,
    value,
  }) {
    this._inputs[key] = value;
  }

  /**
   * @TODO check if deprecated (probably unused)
   * 
   * @param inputs
   * 
   * @private
   */
  _setInputs(inputs) {
  this._inputs = inputs;
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
   * @returns {*}
   */
  getFlow() {
    return this._flow;
  }

  /**
   * @param flow
   */
  setFlow(flow) {
    this._flow = flow;
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
  setSteps(steps=[]) {
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
    if (this._isThereUserMessaggeSteps()) {
      this.clearUserMessagesSteps();
    }
  }

  /**
   * @returns { * | null }
   */
  getLastStep() {
    return this._steps.length ? this._steps[ this._steps.length - 1 ] : null;
  }

  /**
   * @returns { Step }
   */
  getRunningStep() {
    return this._steps.find(step => step.isRunning());
  }

  /**
   * Stop all workflow children 
   */
  _stopChild() {
    return this._child
    ? this._child.stop()
    : resolve();                 // <-- FIXME: undefined function ?
  }

  /**
   * @returns { number }
   * 
   * @private
   */
  _isThereUserMessaggeSteps() {
    return Object.keys(this._userMessageSteps).length;
  }

  /**
   * @FIXME add description
   */
  reject () {
    if (this._promise) {
      this._promise.reject();
    }
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
    const d       = $.Deferred();

    this._promise = d;
    this._inputs  = options.inputs;
    this._context = options.context || {};

    const isChild = this._context.isChild || false;
    
    // stop child when a workflow is running 
    if (
        !isChild
        && WorkflowsStack.getLength()
        && WorkflowsStack.getCurrent() !== this
    ) {
      WorkflowsStack.getCurrent().addChild(this)
    }

    this._stackIndex = WorkflowsStack.push(this);
    this._flow       = options.flow || this._flow;
    this._steps      = options.steps || this._steps;

    const showUserMessage = this._isThereUserMessaggeSteps();

    if (showUserMessage) {
      GUI.showUserMessage({
        title: 'plugins.editing.workflow.title.steps',
        type: 'tool',
        position: 'left',
        size: 'small',
        closable: false,
        hooks: {
          body: UserMessageSteps({ steps: this._userMessageSteps })
        }
      });
    }

    //start flow of worflow
    this._flow
      .start(this)
      .then(outputs => {
        if (showUserMessage) { setTimeout(() => { this.clearUserMessagesSteps(); d.resolve(outputs); }, 500); }
        else { d.resolve(outputs); }
      })
      .fail(e => {
        if (showUserMessage) { this.clearUserMessagesSteps(); }
        d.reject(e);
      })
      .always(() => {
        if (this.runOnce) { this.stop(); }
      });

    this.emit('start');
    return d.promise();
  }

  /**
   * Stop workflow during flow
   * 
   * @fires stop
   */
  stop() {
    const d = $.Deferred();

    this._promise = null;

    this
      ._stopChild()                                   // stop child workflow
      .always(() => {                                 // ensure that child is always removed
        this.removeChild();
        WorkflowsStack.removeAt(this.getStackIndex());
        this._flow
          .stop()
          .then(d.resolve)
          .fail(d.reject)
          .always(() => this.clearMessages())
    });
    
    this.emit('stop');
    
    return d.promise();
  }

  /**
   * @FIXME add description
   */
  clearUserMessagesSteps() {
    this._resetUserMessaggeStepsDone();
    GUI.closeUserMessage();
  }

  /**
   * @private
   */
  _resetUserMessaggeStepsDone() {
    Object
      .keys(this._userMessageSteps)
      .forEach(type => {
        const userMessageSteps = this._userMessageSteps[type];
        userMessageSteps.done = false;
        if (userMessageSteps.buttonnext) {
          userMessageSteps.buttonnext.disabled = true;
        }
    })
  }

  /**
   * @since 3.9.0
   */
  setBackButtonLabel(label=null) {
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

}

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/editingworkflow.js@3.7.1
 */
export class EditingWorkflow extends Workflow {
  
  constructor(options = {}) {
    super(options);

    this.helpMessage  = options.helpMessage ? { help: options.helpMessage } : null;

    this._toolsoftool = [];

    if (true === options.registerEscKeyEvent) {
      this.registerEscKeyEvent();
    }
  }

  /**
   *
   * @param step
   * @param tools
   */
  addToolsOfTools({ step, tools = [] }) {

    /**
     * @FIXME add description
     */
    const toolsOfTools = {

      snap: {
        type: 'snap',
        options: {
          checkedAll: false,
          checked: false,
          active: true,
          run({ layer }) {
            this.active  = true;
            this.layerId = layer.getId();
            this.source  = layer.getEditingLayer().getSource();
          },
          stop() {
            this.active = false;
          }
        }
      },

      measure: {
        type: 'measure',
        options: {
          checked: false,
          run() {
            setTimeout(() => { this.onChange(this.checked); })
          },
          stop() {
            step.getTask().removeMeasureInteraction();
          },
          onChange(bool) {
            this.checked = bool;
            step.getTask()[bool ? 'addMeasureInteraction':  'removeMeasureInteraction']();
          },
          onBeforeDestroy() {
            this.onChange(false);
          }
        }
      },

    }

    step.on('run', ({ inputs, context }) => {
      if (0 === this._toolsoftool.length) {
        tools
          .forEach(tool => {
            if (
              'measure' !== tool
              || (
                Layer.LayerTypes.VECTOR === inputs.layer.getType()
                && !isPointGeometryType(inputs.layer.getGeometryType())
              )
            ) {
              this._toolsoftool.push(toolsOfTools[tool]);
            }
          });
      }
      this._toolsoftool.forEach(t => t.options.run({ layer: inputs.layer }));
      this.emit('settoolsoftool', this._toolsoftool);
    });

    step.on('stop', () => {
      this._toolsoftool.forEach(t => t.options.stop());
    });
  }

  /**
   * @FIXME add description
   */
  setHelpMessage(message) {
    this.helpMessage = { help: message };
  }

  /**
   * @FIXME add description
   */
  getHelpMessage() {
    return this.helpMessage;
  }

  /**
   * @FIXME add description
   */
  getFeatures() {
    return this.getInputs().features;
  }

  /**
   * @FIXME add description
   */
  startFromLastStep(options) {
    this.setSteps([ this.getSteps().pop() ]);
    return this.start(options);
  }

  /**
   * @FIXME add description
   */
  getCurrentFeature() {
    const feats = this.getFeatures();
    return feats[feats.length -1];
  }

  /**
   * @FIXME add description
   */
  getLayer() {
    return this.getInputs().layer;
  }

  /**
   * @FIXME add description
   */
  getSession() {
    return this.getContext().session;
  }

  /**
   * bind interrupt event
   */
  escKeyUpHandler(evt) {
    if (evt.keyCode === 27) {
      evt.data.workflow.reject();
      evt.data.callback();
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
    $(document).on('keyup', { workflow: this, callback }, this.escKeyUpHandler);
  }

  /**
   * @FIXME add description
   */
  registerEscKeyEvent(callback) {
    this.on('start', () => this.bindEscKeyUp(callback));
    this.on('stop', () => this.unbindEscKeyUp());
  }

}