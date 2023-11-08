const { base, inherit } = g3wsdk.core.utils;
const EditingWorkflow = require('./editingworkflow');
const CopyFeaturesFromOtherLayerStep = require('./steps/copyfeaturesfromotherlayerstep');
const OpenFormStep = require('./steps/openformstep');

function CopyFeaturesFromOtherLayerWorflow(options={}) {
  options.help = 'editing.steps.help.copy';
  options.steps = [
    new CopyFeaturesFromOtherLayerStep(options),
    //@ŢODO put here if we want to change attributes of selected features
    new OpenFormStep(options)
  ];
  this.registerEscKeyEvent();
  base(this, options);
}

inherit(CopyFeaturesFromOtherLayerWorflow, EditingWorkflow);

module.exports = CopyFeaturesFromOtherLayerWorflow;
