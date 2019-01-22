const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const EditingWorkflow = require('./editingworkflow');
const t = g3wsdk.core.i18n.tPlugin;
const PickFeatureStep = require('./steps/pickfeaturestep');
const SwitchLineDirectionStep = require('./steps/switchlinedirectionstep');

function SwitchLineDirectionWorflow(options={}) {
  const pickstep = new PickFeatureStep({
    one: true,
    help: t("editing.steps.help.switch_direction")
  });
  const switchlinedirectionstep = new SwitchLineDirectionStep(options);
  options.steps = [pickstep, switchlinedirectionstep];
  base(this, options);
}

inherit(SwitchLineDirectionWorflow, EditingWorkflow);

module.exports = SwitchLineDirectionWorflow;
