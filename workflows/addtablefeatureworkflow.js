var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var EditingWorkflow = require('./editingworkflow');
var AddTableFeatureStep = require('./steps/addtablefeaturestep');
var OpenFormStep = require('./steps/openformstep');

function AddTableFeatureWorflow(options={}) {
  options.steps = [new AddTableFeatureStep(), new OpenFormStep()];
  base(this, options);
}

inherit(AddTableFeatureWorflow, EditingWorkflow);

module.exports = AddTableFeatureWorflow;
