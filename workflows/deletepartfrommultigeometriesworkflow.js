const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const EditingWorkflow = require('./editingworkflow');
const DeletePartFromMultigeometriesStep = require('./steps/deletepartfrommultigeometriesstep');

function DeletePartToMultigeometriesWorflow(options={}) {
  const deletepartfrommultigeometriesstep = new DeletePartFromMultigeometriesStep(options);
  options.steps = [deletepartfrommultigeometriesstep];
  base(this, options);
}

inherit(DeletePartToMultigeometriesWorflow, EditingWorkflow);

module.exports = DeletePartToMultigeometriesWorflow;
