/**
 * @file
 * 
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/index.j@v4.0.0
 * 
 * @since g3w-client-plugin-editing@v4.1.0
 */

import { evaluateExpressionFields }                     from '../utils/evaluateExpressionFields';
import { setAndUnsetSelectedFeaturesStyle }             from '../utils/setAndUnsetSelectedFeaturesStyle';
import { RotateInteraction }                            from '../actions/rotate';
import { Step }                                         from '../g3w-step';

const { GUI }                                           = g3wsdk.gui;

/**
 * @since g3w-client-plugin-editing@v4.0.0 Rotate feature
 */
export class RotateFeatureStep extends Step {

  constructor(options = {}) {
    options.help = "editing.steps.help.rotate";

    super(options);

    this.isChange          = false; // changed if geometry or rotaion for Poin geometry is changed
    this._feature          = null;
    this._originalFeature  = null; 
    this.drawInteraction   = null;
    this.promise; // need to be set here in case of picked features
  }

  run(inputs) {               
    /** Need two different promises: One for stop() method and clean-selected feature,
     * and another one for a run task. If we use the same promise, when stop a task without move feature,
     * this.promise.resolve(), it fires also thenable method listens to resolve promise of a run task,
     * that call stop task method.*/
    return new Promise((resolve) => {
      const promise        = new Promise(r => this.resolve = r);
      this.changeKey       = null;
      setAndUnsetSelectedFeaturesStyle({ promise, inputs, style: this.selectStyle });
      this.addInteraction(
        new RotateInteraction({ features: inputs.features }), {
        'rotatestart': e => {
          this._feature         = e.feature;
          this.isChange         = true;
          this._originalFeature = this._feature.clone();
        },
        'rotateend': async e => {
          if (this.isChange) {
            await this.updateFeature(e.feature);
          }
          this.isChange = false;
          resolve(inputs);
        },
      }).select(inputs.features.at(- 1));
    })
  }

  /**
   * Method to update layer feature
   */
  async updateFeature() {
    const inputs  = this.getInputs();
    const context = this.getContext();
    try {
      await evaluateExpressionFields({ inputs, context, feature: this._feature });
    } catch(e) {
      console.warn(e);
    }
    context.session.pushUpdate(inputs.layer.getId(), this._feature.clone(), this._originalFeature);
  }

  async stop(input, context) {
    if (this.isChange) {
     //In case of Point geometry, afetr change rotation and click on tool to stop, need to update feature 
     await this.updateFeature();
     //need to save it on session
     context.session.save();
    }
    this.resolve(true);
    this.resolve  = null;
    this.isChange = false
    GUI.closeUserMessage();
  }
}