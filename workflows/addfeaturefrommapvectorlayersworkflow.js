const { base, inherit } = g3wsdk.core.utils;
const EditingWorkflow = require('./editingworkflow');
const SelectElementsStep = require('./steps/selectelementsstep');
const OpenFormStep = require('./steps/openformstep');

function AddFeatureFromMapVectorLayersWorflow(options={}) {
  options.type =  'external';
  options.help = 'editing.steps.help.copy';
  options.steps = [];
  const selectelementssteps = new SelectElementsStep(options, false);
  const openformstep = new OpenFormStep(options);
  options.steps = [selectelementssteps, openformstep];
  this.registerEscKeyEvent();
  base(this, options);
}

inherit(AddFeatureFromMapVectorLayersWorflow, EditingWorkflow);

module.exports = AddFeatureFromMapVectorLayersWorflow;
