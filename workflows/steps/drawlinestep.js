const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const t = g3wsdk.core.i18n.tPlugin;
const EditingStep = require('./editingstep');
const DrawLineTask = require('./tasks/selectelementstask');

const DrawLineStep = function(options={}, chain) {
  options.task = new DrawLineTask(options);
  options.help = t("editing.steps.help.draw_split_line");
  chain && this.on('run', () => {
    this.emit('next-step', t("editing.steps.help.draw_split_line"))
  });
  base(this, options)
};

inherit(DrawLineStep, EditingStep);

module.exports = DrawLineStep;
