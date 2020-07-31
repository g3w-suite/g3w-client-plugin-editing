const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
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
