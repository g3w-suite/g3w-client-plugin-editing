const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const t = g3wsdk.core.i18n.tPlugin;
const EditingStep = require('./editingstep');
const SplitBranchTask = require('./tasks/splitbranchtask');

//creato uno step per permettere di fare il pickfeature
const SplitBranchStep = function(options={}) {
  const task = new SplitBranchTask(options);
  options.task = task;
  options.help = options.help ? options.help : t("editing.steps.help.split_branch");
  base(this, options)
};

inherit(SplitBranchStep, EditingStep);

module.exports = SplitBranchStep;
