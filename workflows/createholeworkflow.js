const { base, inherit } = g3wsdk.core.utils;
const EditingWorkflow = require('./editingworkflow');
const CreateHoleStep = require('./steps/createholestep');

function CreateHoleWorflow(options={}) {
  options.steps = [
    new CreateHoleStep(options)
  ];
  base(this, options);
}

inherit(CreateHoleWorflow, EditingWorkflow);

module.exports = CreateHoleWorflow;