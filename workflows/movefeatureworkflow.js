var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var Workflow = g3wsdk.core.workflow.Workflow;
var PickFeatureStep = require('./steps/pickfeaturestep');
var MoveFeatureStep = require('./steps/movefeaturestep');

function MoveFeatureWorflow(options) {
  options = options || {};
  options.steps = [new PickFeatureStep(), new MoveFeatureStep()];
  base(this, options);
}

inherit(MoveFeatureWorflow, Workflow);

var proto = MoveFeatureWorflow.prototype;

module.exports = MoveFeatureWorflow;