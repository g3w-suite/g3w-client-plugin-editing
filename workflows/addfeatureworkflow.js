var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var Workflow = g3wsdk.core.workflow.Workflow;
var AddFeatureStep = require('./steps/addfeaturestep');

function AddFeatureWorflow(options) {
  options = options || {};
  options.steps = [new AddFeatureStep()];
  base(this, options);
}

inherit(AddFeatureWorflow, Workflow);

var proto = AddFeatureWorflow.prototype;

module.exports = AddFeatureWorflow;