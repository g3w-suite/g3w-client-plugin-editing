const {
  base,
  inherit
}                  = g3wsdk.core.utils;
const { Step }     = g3wsdk.core.workflow;
const PickHoleTask = require('./tasks/pickholetask');

const PickHoleStep = function(options={}) {
  options.task = new PickHoleTask(options) ;
  options.help = "editing.steps.help.pick_hole";
  base(this, options)
};

inherit(PickHoleStep, Step);

module.exports = PickHoleStep;
