const {base, inherit} = g3wsdk.core.utils;
const EditingStep = require('./editingstep');
const GetVertexTask = require('./tasks/getvertextask');

const GetVertexStep = function(options={}) {
  options.task = new GetVertexTask(options);
  options.help = "editing.steps.help.select";
  base(this, options)
};

inherit(GetVertexStep, EditingStep);

module.exports = GetVertexStep;
