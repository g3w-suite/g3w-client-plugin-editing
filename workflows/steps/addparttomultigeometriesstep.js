const {base, inherit}  = g3wsdk.core.utils;
const EditingStep = require('./editingstep');
const AddPartToMuligeometriesTask = require('./tasks/addparttomultigeometriestask');

const AddPartToMuligeometriesStep = function(options={}) {
  options.task = new AddPartToMuligeometriesTask(options);
  base(this, options)
};

inherit(AddPartToMuligeometriesStep, EditingStep);

module.exports = AddPartToMuligeometriesStep;
