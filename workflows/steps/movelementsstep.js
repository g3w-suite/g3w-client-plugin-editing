const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const t = g3wsdk.core.i18n.tPlugin;
const EditingStep = require('./editingstep');
const MoveElementTask = require('./tasks/moveelementstask');

const MoveElementsStep = function(options={}, chain) {
  const task = new MoveElementTask(options);
  options.task = task;
  options.help = t("editing.steps.help.select_vertex_to_paste");
  if (chain)
    this.on('run', ()=> {
      this.emit('next-step', t("editing.steps.help.select_vertex_to_paste"))
    });
  base(this, options)
};

inherit(MoveElementsStep, EditingStep);

module.exports = MoveElementsStep;
