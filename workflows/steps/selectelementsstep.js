const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const t = g3wsdk.core.i18n.tPlugin;
const EditingStep = require('./editingstep');
const SelectElementsTask = require('./tasks/selectelemetsstask');

const SelectElementsStep = function(options={}, chain) {
  const task = new SelectElementsTask(options);
  options.task = task;
  options.help = t("editing.steps.help.select_elements");
  if (chain)
    this.on('run', () => {
      this.emit('next-step', t("editing.steps.help.select_elements"))
    });
  base(this, options)
};

inherit(SelectElementsStep, EditingStep);

module.exports = SelectElementsStep;
