import { VM }                                                      from '../eventbus';
import { getRelation1_1ChildFeature }                              from './getRelation1_1ChildFeature';
import { getChildFieldNameFromRelation1_1 }                        from './getChildFieldNameFromRelation1_1';
import { getRelation1_1ByLayerId }                                 from '../utils/getRelation1_1ByLayerId';
import { getRelation1_1EditingLayerFieldsReferredToChildRelation } from './getRelation1_1EditingLayerFieldsReferredToChildRelation';

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@v3.7.1
 * 
 * Listen changes on 1:1 relation fields (get child values from child layer)
 *
 * @param opts.layerId Current editing layer id
 * @param opts.fields Array of form fields of current editing layer
 *
 * @returns Array of watch function event to remove listen
 *
 * @since g3w-client-plugin-editing@v3.7.0
 */
export async function listenRelation1_1FieldChange({
  layerId,
  fields = [],
} = {}) {
  const unwatches = []; // unwatches field value (event change)

  const service = g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing'); //get editing service

  // get all relation 1:1 of current layer
  for (const relation of getRelation1_1ByLayerId(layerId)) {

    const childLayerId = relation.getChild();                             // get relation child layer id
    const fatherField  = relation.getFatherField();
    const relationLockFeatures = {} //store value

    // NB:
    // need to check if editable when opening form task
    // Not set this condition because maybe i ca be used this method
    // on move task or other when current fatherFormRelationField, related to 1:1 relation
    // it can be changed by default expression or in other way not only with form
    const fatherFormRelationField = fields.find(f => fatherField.includes(f.name)); // get father layer field (for each relation)
    // skip when not relation field and not layer child is in editing
    if (!(fatherFormRelationField && service.getLayerById(childLayerId))) {
      return;
    }

    //store original editable property of fields relation to child layer relation
    const editableRelatedFatherChild = getRelation1_1EditingLayerFieldsReferredToChildRelation(relation)
      .reduce((accumulator, field) => {
        const formField = fields.find(f => f.name === field.name)
        accumulator[formField.name] = formField.editable;
        return accumulator;
      }, {});

    fatherFormRelationField.input.options.loading.state = 'loading'; // show input bar loader

    //get feature from child layer source
    relationLockFeatures[fatherFormRelationField.value] = await getRelation1_1ChildFeature({
      relation,
      fatherFormRelationField,
    })

    fatherFormRelationField.input.options.loading.state = null; // show input bar loader

    //if locked need to set editable to false
    //can update child
    if (relationLockFeatures[fatherFormRelationField.value].locked) {
      Object.keys(editableRelatedFatherChild)
        .forEach(fn => fields.find(f => f.name === fn).editable = false);
    }

    //if not feature is on source child layer it mean it locked or not exist on server
    //need to check

    // listen for relation field changes (vue watcher)
    unwatches.push(
      VM.$watch(
        () => fatherFormRelationField.value,
        async value => {

          // skip empty values
          if (!value) {
            fatherFormRelationField.input.options.loading.state = null;
            fatherFormRelationField.editable                    = true;
            return;
          }

          fatherFormRelationField.editable                    = false;     // disable edit
          fatherFormRelationField.input.options.loading.state = 'loading'; // show input bar loader

          if (undefined === relationLockFeatures[fatherFormRelationField.value]) {
            //get feature from child layer source
            try {

              relationLockFeatures[fatherFormRelationField.value] = await getRelation1_1ChildFeature({
                relation,
                fatherFormRelationField,
              })

            } catch (err) {
              console.warn(err);
            }
          }

          const {feature, locked} = relationLockFeatures[fatherFormRelationField.value];

          Object.keys(editableRelatedFatherChild)
            .forEach(fn => {
              const field = fields.find(f => f.name === fn);
              //set editable property
              field.editable = locked
                ? false
                : editableRelatedFatherChild[fn];
              //need to check if feature is new and not locked ot not present on source
              field.value = feature
                ? feature.get(getChildFieldNameFromRelation1_1({ relation, field }))
                : null
            });

          // reset edit state
          fatherFormRelationField.input.options.loading.state = null;
          fatherFormRelationField.editable                    = true;
        }
      )
    );
  }

  return unwatches;
}