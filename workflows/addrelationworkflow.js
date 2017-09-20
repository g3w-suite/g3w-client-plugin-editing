var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var Workflow = g3wsdk.core.workflow.Workflow;
var AddRelationStep = require('./steps/addrelationstep');

function AddRelationWorflow(options) {
  options = options || {};
  options.steps = [new AddRelationStep()];
  base(this, options);
}

inherit(AddRelationWorflow, Workflow);

var proto = AddRelationWorflow.prototype;

module.exports = AddRelationWorflow;