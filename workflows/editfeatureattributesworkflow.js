var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var Workflow = g3wsdk.core.workflow.Workflow;
var PickFeatureStep = require('./steps/pickfeaturestep');

function EditFeatureAttributesWorkflow(options) {
  options = options || {};
  options.steps = [new PickFeatureStep()];
  base(this, options);
}

inherit(EditFeatureAttributesWorkflow, Workflow);

var proto = EditFeatureAttributesWorkflow.prototype;

module.exports = EditFeatureAttributesWorkflow;