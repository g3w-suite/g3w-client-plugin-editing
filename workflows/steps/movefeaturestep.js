const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const t = g3wsdk.core.i18n.tPlugin;
const EditingStep = require('./editingstep');
const MoveFeatureTask = require('./tasks/movefeaturettask');

const MoveFeatureStep = function(options={}) {
  options.task = new MoveFeatureTask(options);
  options.help = "editing.steps.help.move";
  base(this, options)
};

inherit(MoveFeatureStep, EditingStep);

module.exports = MoveFeatureStep;
