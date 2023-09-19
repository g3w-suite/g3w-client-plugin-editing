const { base, inherit } = g3wsdk.core.utils;
const EditingWorkflow = require('./editingworkflow');
const OpenTableStep = require('./steps/opentablestep');

function EditTableFeaturesWorkflow(options={}) {
  options.steps = [new OpenTableStep()];
  options.backbuttonlabel = "plugins.editing.form.buttons.save_and_back_table";
  base(this, options);
}

inherit(EditTableFeaturesWorkflow, EditingWorkflow);

module.exports = EditTableFeaturesWorkflow;