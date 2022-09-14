const {base, inherit}  = g3wsdk.core.utils;
const EditingStep = require('./editingstep');
const MoveElementTask = require('./tasks/moveelementstask');

const MoveElementsStep = function(options={}, chain) {
  const task = new MoveElementTask(options);
  options.task = task;
  options.help = "editing.steps.help.select_vertex_to_paste";
  base(this, options)
};

inherit(MoveElementsStep, EditingStep);

module.exports = MoveElementsStep;
