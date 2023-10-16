const { base, inherit } = g3wsdk.core.utils;
const EditingWorkflow = require('./editingworkflow');
const DeleteHoleStep = require('./steps/deleteholestep');
function RemoveHoleWorflow(options={}) {
  options.steps = [
    new DeleteHoleStep(options)
  ];
  base(this, options);
}

inherit(RemoveHoleWorflow, EditingWorkflow);

module.exports = RemoveHoleWorflow;