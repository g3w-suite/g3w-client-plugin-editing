import { evaluateExpressionFields } from '../utils/evaluateExpressionFields';
import { $promisify }               from './promisify';
/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/addparttomultigeometriestask.js@v3.7.1
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/addparttomultigeometriesstep.js@v3.7.1
 * 
 * @returns jQuery promise
 * 
 * @since g3w-client-plugin-editing@v3.8.0
 */
export function addPartToMultigeometries(inputs, context) {
  return $promisify(async () => {
    let feature;
    let originalFeature;

    // add part
    if (inputs.features.length > 1) {
      feature         =  inputs.features[0];
      const geometry  = feature.getGeometry();
      originalFeature = feature.clone();
      geometry.setCoordinates([...geometry.getCoordinates(), ...inputs.features[1].getGeometry().getCoordinates()]);
    } else {
      feature         = inputs.layer.getEditingLayer().getSource().getFeatures()[0];
      originalFeature = feature.clone();
      feature.setGeometry(inputs.features[0].getGeometry());
    }

    // evaluated geometry expression
    try { await evaluateExpressionFields({ inputs, context, feature });}
    catch (e) { console.warn(e); }

    context.session.pushUpdate(inputs.layer.getId(), feature, originalFeature);

    inputs.features = [feature];
    return inputs;
  });
}