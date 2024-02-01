const {base, inherit}  = g3wsdk.core.utils;
const EditingStep = require('./editingstep');
const RemoveHoleTask = require('./tasks/deleteholetask');
const Deleteholestep = function(options={}) {
  options.task = new RemoveHoleTask(options);
  options.help = "editing.steps.help.create_hole";
  base(this, options)
};

inherit(Deleteholestep, EditingStep);

module.exports = Deleteholestep;
