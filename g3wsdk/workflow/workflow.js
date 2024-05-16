
/**
 * @file
 * 
 * ORIGINAL SOURCE: g3w-client/src/core/workflow/workflow.js@v3.9.1
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/editingworkflow.js@v3.7.1
 * 
 * @since g3w-client-plugin-editing@v3.8.x
 */

import Step                      from './step';
import { promisify, $promisify } from '../../utils/promisify';
import UserMessageSteps          from '../../components/UserMessageSteps';

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
 */
export class Workflow extends G3WObject {
  
  constructor(options = {}) {

    super();

     /** @since g3w-client-plugin-editing@v3.8.0*/
    this._type =  undefined !== options.type ? options.type : null;

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
     * Flow object to control the flow
     */
    this._flow = options.flow || Object.assign(new G3WObject, {
      _workflow: undefined,
      _steps: [],
      _counter: 0,
      _promise: undefined,
      /** @returns jQuery promise resolved when all workflow steps go right */
      start: workflow => {
        const flow = this._flow;
        flow._promise = $.Deferred();
        if (flow._counter > 0) {
          console.log("reset workflow before restarting");
        }
        flow._steps = workflow.getSteps();
        // run first step
        if (flow._steps && flow._steps.length) {
          flow.runStep(flow._steps[0], workflow.getInputs(), workflow);
        }
        return flow._promise.promise();
      },
      // run step → task
      runStep: async(step, inputs, workflow) => {
        const flow = this._flow;
        try {
          workflow.setMessages({ help: step.state.help });
          const outputs = await promisify(
            step.run(inputs, workflow.getContext())
          );
          // onDone → check if all step are resolved
          flow._counter++;
          if (flow._counter === flow._steps.length) {
            flow._counter = 0;
            flow._promise.resolve(outputs);
          } else {
            flow.runStep(flow._steps[flow._counter], outputs, workflow);
          }
        } catch (e) {
          flow._counter = 0;
          flow._promise.reject(e);
        }
      },
      // stop flow
      stop: () => {
        const flow = this._flow;
        return $promisify(() => {
          flow._steps[flow._counter].isRunning() ? flow._steps[flow._counter].stop() : null;
          // reset counter and reject flow
          if (flow._counter > 0) {
            flow._counter = 0;
            return Promise.reject();
          }
        }).promise();
      },
    });

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
      Workflow.Stack.removeAt(this._child.getStackIndex());
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
    return $.Deferred(async d => {
      this._promise = d;
      this._inputs  = options.inputs;
      this._context = options.context || {};
  
      const isChild = this._context.isChild || false;
      
      // stop child when a workflow is running 
      if (
          !isChild
          && Workflow.Stack.getLength()
          && Workflow.Stack.getCurrent() !== this
      ) {
        Workflow.Stack.getCurrent().addChild(this)
      }
  
      this._stackIndex = Workflow.Stack.push(this);
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
  
      try {
        //start flow of worflow
        const outputs = await promisify(this._flow.start(this));
        if (showUserMessage) {
          setTimeout(() => { this.clearUserMessagesSteps(); d.resolve(outputs); }, 500);
        } else {
          d.resolve(outputs);
        }
      } catch (e) {
        console.warn(e);
        if (showUserMessage) {
          this.clearUserMessagesSteps();
        }
        d.reject(e);
      }

      if (this.runOnce) {
        this.stop();
      }
  
      this.emit('start');
    }).promise();
  }

  /**
   * Stop workflow during flow
   * 
   * @fires stop
   */
  stop() {
    return $.Deferred(async d => {
      this._promise = null;

      try {
        await promisify(this._stopChild()) // stop child workflow  
      } catch (e) {
        console.warn(e);
      }
      
      // ensure that child is always removed
      this.removeChild();

      Workflow.Stack.removeAt(this.getStackIndex());

      this._flow
        .stop()
        .then(d.resolve)
        .fail(d.reject)
        .always(() => this.clearMessages())

      this.emit('stop');

    }).promise();
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

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/editingworkflow.js@v3.7.1
   * 
   * @param step
   * @param tools
   * 
   * @since g3w-client-editing@v3.8.0
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
  startFromLastStep(options) {
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
    return feats[feats.length -1];
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
    if (evt.keyCode === 27) {
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
    this.on('stop', () => this.unbindEscKeyUp());
  }

}

/**
 * ORIGINAL SOURCE: g3w-client/src/services/workflow.js@v3.9.1
 * 
 * Store all activated workflows
 * 
 * @since g3w-client-plugin-editing@v3.8.0
 */
Workflow.Stack = {
  _workflows: [],
  push(workflow) {
    if (Workflow.Stack._workflows.indexOf(workflow) === -1) return Workflow.Stack._workflows.push(workflow) - 1;
    return Workflow.Stack._workflows.indexOf(workflow);
  },
  /** @returns {boolean|*} parent */
  getParent()    { return Workflow.Stack.getLength() > 1 && Workflow.Stack._workflows[Workflow.Stack.getLength() - 2]; },
  /** @returns {boolean|T[]} list of parents */
  getParents()   { return Workflow.Stack.getLength() > 1 && Workflow.Stack._workflows.slice(0, Workflow.Stack.getLength() - 1); },
  pop()          { return Workflow.Stack._workflows.pop() },
  getLength()    { return Workflow.Stack._workflows.length; },
  getFirst()     { return Workflow.Stack._workflows[0]; },
  getCurrent()   { return Workflow.Stack.getLast(); },
  getLast()      { return Workflow.Stack._workflows.slice(-1)[0]; },
  removeAt(i)    { Workflow.Stack._workflows.splice(i, 1); },
  insertAt(i, w) { Workflow.Stack._workflows[i] = w; },
  getAt(i)       { return Workflow.Stack._workflows[i]; },
  clear()        { while (Workflow.Stack.getLength()) { (Workflow.Stack.pop()).stop(); } },
};