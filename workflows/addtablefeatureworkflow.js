var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var EditingWorkflow = require('./editingworkflow');
var AddTableFeatureStep = require('./steps/addtablefeaturestep');

function AddTableFeatureWorflow(options) {
  options = options || {};
  options.steps = [new AddTableFeatureStep()];
  base(this, options);
}

inherit(AddTableFeatureWorflow, EditingWorkflow);

module.exports = AddTableFeatureWorflow;