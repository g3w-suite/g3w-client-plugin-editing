/**
 * @file
 * 
 * ORIGINAL SOURCE: g3w-client/src/core/workflow/task.js@v3.9.1
 * 
 * @since g3w-client-plugin-editing@v3.8.x
 */

const { G3WObject }     = g3wsdk.core;
const { base, inherit } = g3wsdk.core.utils;

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

proto.getInputs = function(){
  return this.inputs;
};

proto.setContext = function(context){
  return this.context = context;
};

proto.getContext = function(){
  return this.context;
};

proto.revert = function() {
  console.log('Revert to implemente ');
};

proto.panic = function() {
  console.log('Panic to implement ..');
};

proto.stop = function() {
  console.log('Task Stop to implement ..');
};

proto.run = function() {
  console.log('Wrong. This method has to be overwrite from task');
};

proto.setRoot = function(task) {
  this.state.root = task;
};

proto.getUserMessageSteps = function() {
  return this.state.usermessagesteps;
};

proto.setUserMessageSteps = function(steps={}) {
  this.state.usermessagesteps = steps;
};

proto.setUserMessageStepDone = function(type) {
  if (type) this.state.usermessagesteps[type].done = true;
};

export default Task;
