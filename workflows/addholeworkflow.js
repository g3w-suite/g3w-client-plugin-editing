const { base, inherit } = g3wsdk.core.utils;
const EditingWorkflow = require('./editingworkflow');
const AddHoleStep = require('./steps/addholestep');

function AddHoleWorflow(options={}) {
  options.steps = [
    new AddHoleStep(options)
  ];
  base(this, options);
}

inherit(AddHoleWorflow, EditingWorkflow);

module.exports = AddHoleWorflow;