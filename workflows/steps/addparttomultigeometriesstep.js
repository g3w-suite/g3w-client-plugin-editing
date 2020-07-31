const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const EditingStep = require('./editingstep');
const AddPartToMuligeometriesTask = require('./tasks/addparttomultigeometriestask');

const AddPartToMuligeometriesStep = function(options={}) {
  options.task = new AddPartToMuligeometriesTask(options);
  base(this, options)
};

inherit(AddPartToMuligeometriesStep, EditingStep);

module.exports = AddPartToMuligeometriesStep;
