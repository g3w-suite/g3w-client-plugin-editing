var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var Workflow = g3wsdk.core.workflow.Workflow;
var PickFeatureStep = require('./steps/pickfeaturestep');
var AddRelationStep = require('./steps/movefeaturestep');

function AddRelationWorflow(options) {
  options = options || {};
  options.steps = [new PickFeatureStep(), new AddRelationStep()];
  base(this, options);
}

inherit(AddRelationWorflow, Workflow);

var proto = AddRelationWorflow.prototype;

module.exports = AddRelationWorflow;