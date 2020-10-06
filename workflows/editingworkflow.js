const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const GUI = g3wsdk.gui.GUI;
const Workflow = g3wsdk.core.workflow.Workflow;

function EditingWorkflow(options={}) {
  base(this, options);
  this.helpMessage = options.helpMessage ? {help:options.helpMessage} : null;
  this._toolsoftool = [];
}

inherit(EditingWorkflow, Workflow);

const proto = EditingWorkflow.prototype;

proto.setHelpMessage = function(message) {
  this.helpMessage = {
    help: message
  };
};

proto.getHelpMessage = function(){
  return this.helpMessage;
};

proto.getFeatures = function() {
  return this.getInputs().features;
};

proto.setToolsOfTool = function(tools=[]) {
  this._toolsoftool = [tools]
};

proto.startFromLastStep = function(options) {
  let steps = this.getSteps();
  this.setSteps([steps.pop()]);
  return this.start(options);
};

proto.getCurrentFeature = function() {
  const features = this.getFeatures();
  const length = this.getFeatures().length;
  return features[length -1];
};

proto.getLayer = function() {
  return this.getSession().getEditor().getLayer()
};

proto.getSession = function() {
  return this.getContext().session;
};

//bind interrupt event
proto.escKeyUpHandler = function(evt) {
  if (evt.keyCode === 27) {
    evt.data.workflow.reject();
    evt.data.callback();
  }
};

proto.unbindEscKeyUp = function() {
  $(document).unbind('keyup', this.escKeyUpHandler);
};

proto.bindEscKeyUp = function(callback=()=>{}) {
  const percContent = GUI.hideContent(true);
  $(document).on('keyup', {
    workflow: this,
    callback
  }, this.escKeyUpHandler);
  return percContent;
};

proto.registerEscKeyEvent = function(callback){
  this.on('start', ()=> {
    this.bindEscKeyUp(callback);
  });
  this.on('stop', ()=>{
    this.unbindEscKeyUp()
  });
};
/////

module.exports = EditingWorkflow;
