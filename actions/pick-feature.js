/**
 * @file
 * 
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/index.j@v4.0.0
 * 
 * @since g3w-client-plugin-editing@v4.1.0
 */

import { setAndUnsetSelectedFeaturesStyle }             from '../utils/setAndUnsetSelectedFeaturesStyle';
import { PickFeaturesInteraction }                      from '../actions/pick-features';
import { Step }                                         from '../g3w-step';

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/pickfeaturetask.js@v3.7.1
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/pickfeaturestep.js@v3.7.1
 */
export class PickFeatureStep extends Step {

  constructor(options = {}) {
    options.help      = "editing.steps.help.pick_feature";
    options.highlight = options.highlight || false;
    options.multi     = options.multi || false;
    super(options);
  }

  async run(inputs) {
    const promise = new Promise((resolve) => {
      this.addInteraction(
        new PickFeaturesInteraction({ layer: inputs.layer.getEditingLayer() }), {
          'picked': e => {
            if (0 === inputs.features.length) {
              inputs.features   = e.features;
              inputs.coordinate = e.coordinate;
            }
            if (this._steps) { this.setUserMessageStepDone('select') }
            resolve(inputs);
          },
        });
    })
    
    setAndUnsetSelectedFeaturesStyle({ promise, inputs, style: this.selectStyle });
    return promise;
  }

}