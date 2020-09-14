var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var EditingWorkflow = require('./editingworkflow');
var OpenFormStep = require('./steps/openformstep');

function EditTableFeatureWorflow(options={}) {
  options.steps = [new OpenFormStep()];
  base(this, options);
}

inherit(EditTableFeatureWorflow, EditingWorkflow);

module.exports = EditTableFeatureWorflow;