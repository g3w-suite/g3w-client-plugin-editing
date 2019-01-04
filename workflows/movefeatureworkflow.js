var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var EditingWorkflow = require('./editingworkflow');
var PickFeatureStep = require('./steps/pickfeaturestep');
var MoveFeatureStep = require('./steps/movefeaturestep');

function MoveFeatureWorflow(options) {
  options = options || {};
  options.steps = [new PickFeatureStep(options), new MoveFeatureStep(options)];
  base(this, options);
}

inherit(MoveFeatureWorflow, EditingWorkflow);

var proto = MoveFeatureWorflow.prototype;

module.exports = MoveFeatureWorflow;
