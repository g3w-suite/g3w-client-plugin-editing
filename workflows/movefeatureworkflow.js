var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var Workflow = g3wsdk.core.workflow.Workflow;
var MoveFeatureStep = require('./steps/movefeaturestep');

function MoveFeatureWorflow(options) {
  options = options || {};
  options.steps = [new MoveFeatureStep()];
  base(this, options);
}

inherit(MoveFeatureWorflow, Workflow);

var proto = MoveFeatureWorflow.prototype;

module.exports = MoveFeatureWorflow;