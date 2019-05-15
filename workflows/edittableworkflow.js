var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var EditingWorkflow = require('./editingworkflow');
var OpenTableStep = require('./steps/opentablestep');

function EditTableFeaturesWorkflow(options) {
  options = options || {};

  options.steps = [new OpenTableStep()];
  base(this, options);
}

inherit(EditTableFeaturesWorkflow, EditingWorkflow);

module.exports = EditTableFeaturesWorkflow;