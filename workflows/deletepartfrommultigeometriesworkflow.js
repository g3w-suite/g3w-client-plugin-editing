const { base, inherit } = g3wsdk.core.utils;
const EditingWorkflow = require('./editingworkflow');
const DeletePartFromMultigeometriesStep = require('./steps/deletepartfrommultigeometriesstep');
const PickFeatureStep = require('./steps/pickfeaturestep');
const ChooseFeatureStep = require('./steps/choosefeaturestep');

function DeletePartToMultigeometriesWorflow(options={}) {
  options.helpMessage = 'editing.tools.deletepart';
  options.steps = [
    new PickFeatureStep(),
    new ChooseFeatureStep(),
    new DeletePartFromMultigeometriesStep(options)
  ];
  base(this, options);
}

inherit(DeletePartToMultigeometriesWorflow, EditingWorkflow);

module.exports = DeletePartToMultigeometriesWorflow;
