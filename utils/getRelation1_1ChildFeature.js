/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@3.7.1
 * 
 * @param { Object } opts
 * @param opts.relation
 * @param opts.fatherFormRelationField
 * 
 * @returns {Promise<{feature: *, locked: boolean}>}
 * 
 * @since g3w-client-plugin-editing@v3.7.0
 * 
 * @private
 */
export async function getRelation1_1ChildFeature({
  relation,
  fatherFormRelationField,
}) {
  const service       = require('../services/editingservice'); //get editing service
  const fatherLayerId = relation.getFather();
  const childLayerId  = relation.getChild();                             // get relation child layer id
  const childField    = relation.getChildField()[0];

  // lock feature false
  let locked = false;
  let feature = service.getLayerById(childLayerId)
    .getEditingSource()
    .readFeatures()
    .find(f => f.get(childField) === fatherFormRelationField.value)

    //get feature from server and lock
  if (undefined === feature) {

    const childFeatureStore = service.getLayerById(childLayerId).getFeaturesStore();

    const unByKey = childFeatureStore.oncebefore(
      'featuresLockedByOtherUser',
      (features) => {
        feature = features[0]
      })

    await service.getLayersDependencyFeatures(fatherLayerId, {
      feature: new ol.Feature({
        [fatherFormRelationField.name]: fatherFormRelationField.value
      }),
      relations: [relation]
    });

    //remove listener
    childFeatureStore.un('featuresLockedByOtherUser', unByKey);

    //in case of no locked check feature on source
    if (undefined === feature) {

      feature = service.getLayerById(childLayerId)
        .getEditingSource()
        .readFeatures()
        .find(f => f.get(childField) === fatherFormRelationField.value)
    }

  }

  //not find on source need to check if exist
  if (undefined === feature) {

    try {
      const layer = service.getProjectLayerById(childLayerId);

      const { data } = await g3wsdk.core.data.DataRouterService.getData('search:features', {  // get feature of relation layer based on value of relation field
        inputs: {
          layer,
          formatter: 0,
          filter: g3wsdk.core.utils.createFilterFormInputs({
            layer,
            search_endpoint: 'api',
            inputs: [{
              attribute: childField,
              value: fatherFormRelationField.value,
            }]
          }),
          search_endpoint: 'api',
        },
        outputs: false,
      });

      if (data && data[0] && 1 === data[0].features.length) {                // NB: length == 1, due to 1:1 relation type
        //locked
        locked = true;
        feature = data[0].features[0];
      }
    } catch(e) {
      console.warn(e);
    }
  }

  //return
  return {
    feature, //feature search
    locked //locked status
  }
}