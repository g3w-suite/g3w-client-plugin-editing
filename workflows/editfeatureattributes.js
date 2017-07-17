var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var Workflow = g3wsdk.core.workflow.Workflow;

function EditFeatureAttributesWorkflow() {
  base(this);
}

inherit(EditFeatureAttributesWorkflow, Workflow);

var proto = EditFeatureAttributesWorkflow.prototype;

module.exports = EditFeatureAttributesWorkflow;