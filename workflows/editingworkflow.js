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

proto.getLayer = function() {
  return this.getSession().getEditor().getLayer()
};

proto.getSession = function() {
  return this.getContext().session;
};

module.exports = EditingWorkflow;