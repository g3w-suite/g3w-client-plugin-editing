const {base, inherit} = g3wsdk.core.utils;
const EditingWorkflow = require('./editingworkflow');
const DeletePartFromMultigeometriesStep = require('./steps/deletepartfrommultigeometriesstep');

function DeletePartToMultigeometriesWorflow(options={}) {
  options.helpMessage = 'signaler_iim.tools.deletepart';
  const deletepartfrommultigeometriesstep = new DeletePartFromMultigeometriesStep(options);
  options.steps = [deletepartfrommultigeometriesstep];
  base(this, options);
}

inherit(DeletePartToMultigeometriesWorflow, EditingWorkflow);

module.exports = DeletePartToMultigeometriesWorflow;
