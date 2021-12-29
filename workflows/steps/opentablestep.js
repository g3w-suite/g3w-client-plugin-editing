const {base, inherit} = g3wsdk.core.utils;
const Step = g3wsdk.core.workflow.Step;
const OpenTableTask = require('./tasks/opentabletask');

const OpenTableStep = function(options={}) {
  options.task = new OpenTableTask();
  options.help = "signaler_iim.steps.help.edit_table";
  base(this, options)
};

inherit(OpenTableStep, Step);

module.exports = OpenTableStep;
