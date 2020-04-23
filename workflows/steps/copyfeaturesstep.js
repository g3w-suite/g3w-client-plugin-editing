const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const t = g3wsdk.core.i18n.tPlugin;
const EditingStep = require('./editingstep');
const CopyFeaturesTask = require('./tasks/copyfeaturestask');

const CopyFeatureStep = function(options) {
  options = options || {};
  options.task = new CopyFeaturesTask();
  options.help = t("editing.steps.help.copy");
  base(this, options)
};

inherit(CopyFeatureStep, EditingStep);

module.exports = CopyFeatureStep;
