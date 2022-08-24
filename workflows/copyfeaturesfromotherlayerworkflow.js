const {base, inherit} = g3wsdk.core.utils;
const EditingWorkflow = require('./editingworkflow');
const CopyFeaturesFromOtherLayerStep = require('./steps/copyfeaturesfromotherlayerstep');

function CopyFeaturesFromOtherLayerWorflow(options={}) {
  options.help = 'editing.steps.help.copy';
  options.steps = [new CopyFeaturesFromOtherLayerStep(options)];
  this.registerEscKeyEvent();
  base(this, options);
}

inherit(CopyFeaturesFromOtherLayerWorflow, EditingWorkflow);

module.exports = CopyFeaturesFromOtherLayerWorflow;
