/**
 * @file
 * 
 * ORIGINAL SOURCE: g3w-client/src/core/workflow/flow.js@v3.9.1
 * 
 * @since g3w-client-plugin-editing@v3.8.x
 */

import Queque from './queque';

const { G3WObject }     = g3wsdk.core;
const { base, inherit } = g3wsdk.core.utils;

//Class Flow of workflow step by step
function Flow() {
  let steps = [];
  let inputs;
  let counter = 0;
  let context = null;
  let d;
  let _workflow;

  this.queques = {
    end: new Queque(),
    micro: new Queque()
  };

  //start workflow
  this.start = function(workflow) {
    // return a promise that will be reolved if all step go right
    return new Promise((resolve, reject) => {

      // Assign d module variable to an object having resolve, reject methods used on other module method
      d = { resolve, reject };

      if (counter > 0) {
        console.log("reset workflow before restarting");
      }

      _workflow = workflow;
      inputs    = workflow.getInputs();
      context   = workflow.getContext();
      steps     = workflow.getSteps();

      // check if there are steps
      if (steps && steps.length) {
        this.runStep(steps[0], inputs, context); // run step (first)
      }
    });
  };

  //run step
  this.runStep = async function(step, inputs) {
    //run step that run task
    _workflow.setMessages({ help: step.state.help });
    const runMicroTasks = this.queques.micro.getLength();
    try {
      const outputs = await step.run(inputs, context, this.queques);
      if (runMicroTasks) {
        this.queques.micro.run();
      }
      this.onDone(outputs);
    } catch (e) {
      this.onError(e);
    }
  };

  //check if all step are resolved
  this.onDone = function(outputs) {
    counter++;
    if (counter === steps.length) {
      counter = 0;
      d.resolve(outputs);
      return;
    }
    this.runStep(steps[counter], outputs);
  };

  // in case of error
  this.onError = function(err) {
    counter = 0;
    this.clearQueques();
    d.reject(err);
  };

  // stop flow
  this.stop = async function() {
    if (steps[counter].isRunning()) {
      steps[counter].stop();
    }
    this.clearQueques();
    if (counter > 0) {
      counter = 0;             // set counter to 0
      return Promise.reject(); // reject flow
    }
  };

  base(this)
}

inherit(Flow, G3WObject);

const proto = Flow.prototype;

/**
 * @FIXME add description
 */
proto.clearQueques = function(){
  this.queques.micro.clear();
  this.queques.end.clear();
};

export default Flow;