import { cloneFeature }                   from '../utils/cloneFeature';
import { evaluateExpressionFields }       from '../utils/evaluateExpressionFields';
import { getNotEditableFieldsNoPkValues } from '../utils/getNotEditableFieldsNoPkValues';

const { Feature } = g3wsdk.core.layer.features;

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/splitfeaturetask.js@v3.7.1
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/splitfeaturestep.js@v3.7.1
 *
 * @param feature
 * @param inputs
 * @param context
 * @param splittedGeometries
 * 
 * @returns {Promise<*[]>}
 * 
 * @since g3w-client-plugin-editing@v3.8.0
 */
export async function handleSplitFeature({
  feature,
  inputs,
  context,
  splittedGeometries = []
} = {}) {
  const newFeatures              = [];
  const { layer }                = inputs;
  const session                  = context.session;
  const source                   = layer.getEditingLayer().getSource();
  const layerId                  = layer.getId();
  const oriFeature               = feature.clone();
  inputs.features                = splittedGeometries.length ? [] : inputs.features;
  const splittedGeometriesLength = splittedGeometries.length;

  for (let index = 0; index < splittedGeometriesLength; index++) {
    const splittedGeometry = splittedGeometries[index];
    if (0 === index) {
      /**
       * check geometry evaluated expression
       */
      feature.setGeometry(splittedGeometry);
      try {
        await evaluateExpressionFields({ inputs, context, feature });
      } catch(e) {
        console.warn(e);
      }

      session.pushUpdate(layerId, feature, oriFeature);

    } else {
      const newFeature = cloneFeature(oriFeature, layer);
      newFeature.setGeometry(splittedGeometry);

      // set media fields to null
      layer.getEditingMediaFields({}).forEach(f => newFeature.set(f, null));

      feature = new Feature({ feature: newFeature });

      feature.setTemporaryId();

      // evaluate geometry expression
      try { await evaluateExpressionFields({ inputs, context, feature }); }
      catch(e) { console.warn(e); }

      /**
       * @todo improve client core to handle this situation on sesssion.pushAdd not copy pk field not editable only
       */
      const noteditablefieldsvalues = getNotEditableFieldsNoPkValues({ layer, feature });

      if (Object.entries(noteditablefieldsvalues).length) {
        const newFeature = session.pushAdd(layerId, feature);
        Object.entries(noteditablefieldsvalues).forEach(([field, value]) => newFeature.set(field, value));
        newFeatures.push(newFeature);
        //need to add features with no editable fields on layers source
        source.addFeature(newFeature);
      } else {
        newFeatures.push(session.pushAdd(layerId, feature));
        //add feature to source
        source.addFeature(feature);
      }
    }
    inputs.features.push(feature);
  }

  return newFeatures;
}