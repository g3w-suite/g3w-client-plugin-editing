var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var Workflow = g3wsdk.core.workflow.Workflow;
var DeleteFeatureStep = require('./steps/deletefeaturestep');

function DeleteFeatureWorflow(options) {
  options = options || {};
  options.steps = [new DeleteFeatureStep()];
  base(this, options);
}

inherit(DeleteFeatureWorflow, Workflow);

var proto = DeleteFeatureWorflow.prototype;

module.exports = DeleteFeatureWorflow;