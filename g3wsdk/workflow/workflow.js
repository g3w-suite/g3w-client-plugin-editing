
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
const {
  base,
  inherit,
  resolve,
}                             = g3wsdk.core.utils;
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
function Workflow(options = {}) {

  const {
    type            = null, /** @since g3w-client-plugin-editing@v3.8.0*/
    inputs          = null,
    context         = null,
    flow            = new Flow(),
    steps           = [],
    runOnce         = false,
    backbuttonlabel = null,
  } = options;

  base(this);

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
  this._steps = steps;

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
  this._userMessageSteps = this._steps
    .reduce((messagesSteps, step) => ({
      ...messagesSteps,
      ...(step.getTask().getUserMessageSteps() || {})
    }), {});

  /**
   * Holds back button label (in case of child workflow)
   * 
   * @since 3.9.0
   */
  this.backbuttonlabel = backbuttonlabel;

}

inherit(Workflow, G3WObject);

const proto = Workflow.prototype;

/**
 * @since g3w-client-plugin-editing@v3.8.0
 * Check if it is in same type
 *
 * @param {String | Array.<string[]>} type
 */
proto.isType = function(type) {
  if (Array.isArray(type)) {
    return Boolean(type.find(t => t === this._type));
  }
  return type === this._type;
};

/**
 * @returns { * }
 */
proto.getContextService = function() {
  return this.getContext().service;
};

/**
 * @param service
 */
proto.setContextService = function(service) {
  this.getContext().service = service;
};

/**
 * @returns { null | * }
 */
proto.getStackIndex = function() {
  return this._stackIndex;
};

/**
 * @param workflow
 */
proto.addChild = function(workflow) {
  if (this._child) {
    this._child.addChild(workflow);
  } else {
    this._child = workflow;
  }
};

/**
 * @FIXME add description
 */
proto.removeChild = function() {
  if (this._child) {
    WorkflowsStack.removeAt(this._child.getStackIndex());
  }
  this._child = null;
};

/**
 * @param input.key
 * @param input.value
 */
proto.setInput = function({
  key,
  value,
}) {
  this._inputs[key] = value;
};

/**
 * @TODO check if deprecated (probably unused)
 * 
 * @param inputs
 * 
 * @private
 */
proto._setInputs = function(inputs) {
 this._inputs = inputs;
};

/**
 * @returns { null | * }
 */
proto.getInputs = function() {
  return this._inputs;
};

/**
 * @param context
 */
proto.setContext = function(context) {
 this._context = context;
};

/**
 * @returns { * | {} | null }
 */
proto.getContext = function() {
  return this._context;
};

/**
 * @returns {*}
 */
proto.getFlow = function() {
  return this._flow;
};

/**
 * @param flow
 */
proto.setFlow = function(flow) {
  this._flow = flow;
};

/**
 * @param step
 */
proto.addStep = function(step) {
  this._steps.push(step);
};

/**
 * @param steps
 */
proto.setSteps = function(steps) {
  this._steps = steps;
};

/**
 * @returns { * | Array }
 */
proto.getSteps = function() {
  return this._steps;
};

/**
 * @param index
 * 
 * @returns { * }
 */
proto.getStep = function(index) {
  return this._steps[index];
};

/**
 * @param messages
 */
proto.setMessages = function(messages) {
  Object.assign(this._messages, messages);
};

/**
 * @FIXME add description
 */
proto.getMessages = function() {
  return this._messages;
};

/**
 * @FIXME add description
 */
proto.clearMessages = function() {
  this._messages.help = null;
  if (this._isThereUserMessaggeSteps()) {
    this.clearUserMessagesSteps();
  }
};

/**
 * @returns { * | null }
 */
proto.getLastStep = function() {
  return this._steps.length ? this._steps[ this._steps.length - 1 ] : null;
};

/**
 * @returns { Step }
 */
proto.getRunningStep = function() {
  return this._steps.find(step => step.isRunning());
};

/**
 * Stop all workflow children 
 */
proto._stopChild = function() {
  return this._child
  ? this._child.stop()
  : resolve();                 // <-- FIXME: undefined function ?
};

/**
 * @returns { number }
 * 
 * @private
 */
proto._isThereUserMessaggeSteps = function() {
  return Object.keys(this._userMessageSteps).length;
};

/**
 * @FIXME add description
 */
proto.reject  = function() {
  if (this._promise) {
    this._promise.reject();
  }
};

/**
 * @FIXME add description
 */
proto.resolve = function() {
  if (this._promise) {
    this._promise.resolve();
  }
};

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
proto.start = function(options = {}) {
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
      if (showUserMessage) {
        setTimeout(() => { this.clearUserMessagesSteps(); d.resolve(outputs); }, 500);
      } else {
        d.resolve(outputs);
      }
    })
    .fail(error => {
      if (showUserMessage) {
        this.clearUserMessagesSteps();
      }
      d.reject(error);
    })
    .always(() => {
      if (this.runOnce) {
        this.stop();
      }
    });

  this.emit('start');

  return d.promise();
};

/**
 * Stop workflow during flow
 * 
 * @fires stop
 */
proto.stop = function() {
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
};

/**
 * @FIXME add description
 */
proto.clearUserMessagesSteps = function() {
  this._resetUserMessaggeStepsDone();
  GUI.closeUserMessage();
};

/**
 * @private
 */
proto._resetUserMessaggeStepsDone = function() {
  Object
    .keys(this._userMessageSteps)
    .forEach(type => {
      const userMessageSteps = this._userMessageSteps[type];
      userMessageSteps.done = false;
      if (userMessageSteps.buttonnext) {
        userMessageSteps.buttonnext.disabled = true;
      }
  })
};

/**
 * @since 3.9.0
 */
proto.setBackButtonLabel = function(label=null) {
  this.backbuttonlabel = label;
}

/**
 * @returns { null }
 * 
 * @since 3.9.0
 */
proto.getBackButtonLabel = function() {
  return this.backbuttonlabel;
}

export default Workflow;

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

    };

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
    return this.getSession().getEditor().getLayer();
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