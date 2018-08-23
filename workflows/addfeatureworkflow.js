var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var EditingWorkflow = require('./editingworkflow');
var AddFeatureStep = require('./steps/addfeaturestep');
var OpenFormStep = require('./steps/openformstep');

function AddFeatureWorflow(options) {
  options = options || {};
  const addfeaturestep = new AddFeatureStep(options);
  const openformstep = new OpenFormStep(options);
  let snapTool;
  addfeaturestep.on('run', ({inputs, context}) => {
    const layer = inputs.layer;
    snapTool = {
      type: 'snap',
      options: {
        source: layer.getSource(),
        active: true
      }
    };
    this.emit('settoolsoftool', [snapTool]);
  });
  addfeaturestep.on('stop', () => {
    snapTool.options.active = false;
  });

  options.steps = [addfeaturestep, openformstep];
  base(this, options);
}

inherit(AddFeatureWorflow, EditingWorkflow);

module.exports = AddFeatureWorflow;
