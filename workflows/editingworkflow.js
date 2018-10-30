const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const Workflow = g3wsdk.core.workflow.Workflow;


function EditingWorkflow(options={}) {
  base(this, options);
  this._toolsoftool = [];
}

inherit(EditingWorkflow, Workflow);

const proto = EditingWorkflow.prototype;

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

module.exports = EditingWorkflow;
