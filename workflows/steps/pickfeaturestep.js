const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const t = g3wsdk.core.i18n.tPlugin;
const EditingStep = require('./editingstep');
const PickFeatureTask = require('./tasks/pickfeaturetask');

//creato uno step per permettere di fare il pickfeature
const PickFeatureStep = function(options={}) {
  const task = new PickFeatureTask(options);
  options.task = task ;
  options.help = options.help ? options.help : t("editing.steps.help.pick_feature");
  base(this, options)
};

inherit(PickFeatureStep, EditingStep);

module.exports = PickFeatureStep;
