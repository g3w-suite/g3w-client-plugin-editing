var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var Workflow = g3wsdk.core.workflow.Workflow;


function EditingWorkflow(options) {
  options = options || {};
  base(this, options);
}

inherit(EditingWorkflow, Workflow);

var proto = EditingWorkflow.prototype;

proto.getFeatures = function() {
  return this.getInputs().features;
};

proto.startFromLastStep = function(options) {
  var steps = this.getSteps();
  this.setSteps([steps.pop()]);
  return this.start(options);
};

proto.getCurrentFeature = function() {
  var features = this.getFeatures();
  var length = this.getFeatures().length;
  return features[length -1];
};


proto.getLayer = function() {
  return this.getSession().getEditor().getLayer()
};

proto.getSession = function() {
  return this.getContext().session;
};

module.exports = EditingWorkflow;
