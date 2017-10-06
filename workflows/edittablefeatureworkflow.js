var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var EditingWorkflow = require('./editingworkflow');
var AddTableFeatureStep = require('./steps/addtablefeaturestep');

function EditTableFeatureWorflow(options) {
  options = options || {};
  options.steps = [new AddTableFeatureStep()];
  base(this, options);
}

inherit(EditTableFeatureWorflow, EditingWorkflow);

module.exports = EditTableFeatureWorflow;