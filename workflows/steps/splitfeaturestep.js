const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const t = g3wsdk.core.i18n.tPlugin;
const EditingStep = require('./editingstep');
const SplitFeatureTask = require('./tasks/splitfeaturetask');

const MoveElementsStep = function(options={}) {
  const task = new SplitFeatureTask(options);
  options.task = task;
  options.help = '';
  base(this, options)
};

inherit(MoveElementsStep, EditingStep);

module.exports = MoveElementsStep;
