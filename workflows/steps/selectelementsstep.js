const {base, inherit} = g3wsdk.core.utils;
const t = g3wsdk.core.i18n.tPlugin;
const EditingStep = require('./editingstep');
const SelectElementsTask = require('./tasks/selectelementstask');

const SelectElementsStep = function(options={}, chain) {
  options.task = new SelectElementsTask(options);
  options.help = options.help || "signaler_iim.steps.help.select_elements";
  chain && this.on('run', () => {
      this.emit('next-step', t("signaler_iim.steps.help.select_elements"))
    });
  base(this, options)
};

inherit(SelectElementsStep, EditingStep);

module.exports = SelectElementsStep;
