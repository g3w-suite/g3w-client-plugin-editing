const {base, inherit} = g3wsdk.core.utils;
const EditingWorkflow = require('./editingworkflow');
const SetFeatureCoordinatesStep = require('./steps/addfeaturebycoordintesstep');
const OpenFormStep = require('./steps/openformstep');

function AddFeatureByCoordinatesWorflow(options={}) {
  const setfeaturecoordinatesstep = new SetFeatureCoordinatesStep(options);
  const openformstep = new OpenFormStep(options);
  options.steps = [setfeaturecoordinatesstep, openformstep];
  base(this, options);
}

inherit(AddFeatureByCoordinatesWorflow, EditingWorkflow);

module.exports = AddFeatureByCoordinatesWorflow;
