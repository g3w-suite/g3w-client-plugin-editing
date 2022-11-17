const { base, inherit } = g3wsdk.core.utils;
const EditingWorkflow = require('./editingworkflow');
const PickProjectLayerFeaturesStep = require('./steps/pickprojectlayerfeaturesstep');
const CopyFeaturesFromOtherProjectLayerStep = require('./steps/copyfeaturesfromotherprojectlayerstep');
const OpenFormStep = require('./steps/openformstep');

function SelectAndCopyFeaturesFromOtherLayerWorflow(options={}) {
  options.help = 'editing.steps.help.copy';
  options.steps = [
    new PickProjectLayerFeaturesStep(options),
    new CopyFeaturesFromOtherProjectLayerStep(options),
    new OpenFormStep(options)
  ];
  this.registerEscKeyEvent();
  base(this, options);
}

inherit(SelectAndCopyFeaturesFromOtherLayerWorflow, EditingWorkflow);

module.exports = SelectAndCopyFeaturesFromOtherLayerWorflow;
