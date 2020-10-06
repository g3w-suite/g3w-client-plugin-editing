const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const EditingWorkflow = require('./editingworkflow');
const SelectElementsStep = require('./steps/selectelementsstep');
const OpenFormStep = require('./steps/openformstep');

function EditMultiFeatureAttributesWorkflow(options={}) {
  options.helpMessage = 'editing.tools.update_multi_features';
  options.steps = [new SelectElementsStep(), new OpenFormStep({
    multi: true
  })];
  base(this, options);
}

inherit(EditMultiFeatureAttributesWorkflow, EditingWorkflow);

module.exports = EditMultiFeatureAttributesWorkflow;