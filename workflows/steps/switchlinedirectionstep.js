const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const t = g3wsdk.core.i18n.tPlugin;
const Step = g3wsdk.core.workflow.Step;
const SwitchLineDirectionTask = require('./tasks/switchlinedirectiontask');

//creato uno step per permettere di fare il pickfeature
const PickFeatureStep = function(options={}) {
  const task = new SwitchLineDirectionTask(options);
  options.task = task ;
  base(this, options)
};

inherit(PickFeatureStep, Step);

module.exports = PickFeatureStep;
