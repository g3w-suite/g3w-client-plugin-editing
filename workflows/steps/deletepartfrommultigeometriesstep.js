const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const EditingStep = require('./editingstep');
const DeletePartFromMultigeometriesTask = require('./tasks/deletepartfrommultigeometriestask');

const DeletePartFromMuligeometriesStep = function(options={}) {
  options.task = new DeletePartFromMultigeometriesTask(options);
  base(this, options)
};

inherit(DeletePartFromMuligeometriesStep, EditingStep);

module.exports = DeletePartFromMuligeometriesStep;
