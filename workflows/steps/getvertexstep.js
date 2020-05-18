const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const t = g3wsdk.core.i18n.tPlugin;
const EditingStep = require('./editingstep');
const GetVertexTask = require('./tasks/getvertextask');

const GetVertexStep = function(options={}) {
  options.task = new GetVertexTask(options);
  options.help = "editing.steps.help.select";
  base(this, options)
};

inherit(GetVertexStep, EditingStep);

module.exports = GetVertexStep;
