const { CatalogLayersStoresRegistry } = g3wsdk.core.catalog;

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@v3.7.1
 * 
 * Handle layer relation 1:1 features related to feature
 *
 * @param opts.layerId Root layerId
 * @param opts.features Array of update/new features belong to Root layer
 * @param opts.fields Array of form fields father
 *
 * @since g3w-client-plugin-editing@v3.7.0
 */
export async function handleRelation1_1LayerFields({
  layerId,
  features = [],
  fields = [],
  task
} = {}) {

  // skip when no features
  if (features.length === 0) { return }

  const service = g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing');

  // Get layer relation 1:1
  const promises = CatalogLayersStoresRegistry
    .getLayerById(layerId)
    .getRelations()
    .getArray()
    .filter(relation => 'ONE' === relation.getType())
    .map(relation => {
      return new Promise(async (resolve) => {
        // skip when layer is not a father layer (1:1 relation)
        if (layerId !== relation.getFather()) {
          resolve();
          return;
        }
        const fatherField = relation.getFatherField()[0];
        const value       = features[0].get(fatherField);

        //no set father field value. No set
        if (null === value) {
          resolve();
          return
        }

        // check if child relation layer is editable (in editing)
        const childLayerId = relation.getChild();
        const childField   = relation.getChildField()[0];
        const source       = service.getLayerById(childLayerId).getEditingSource();
        let childFeature; // original child feature
        let newChild; //eventually child feature cloned with changes

        //check if child feature is already added to
        childFeature = source.readFeatures().find(f => f.get(childField) === value)

        const fieldsUpdated = undefined !== service
          .getLayerById(relation.getFather())
          .getEditingFields()
          .filter(f => f.vectorjoin_id && f.vectorjoin_id === relation.getId())
          .find(({name}) => fields.find(f => name == f.name).update)

        const isNewChildFeature = undefined === childFeature;

        //check if fields related to child are changed
        if (fieldsUpdated) {
          //Check if we need to create a new child feature
          if (isNewChildFeature) {
            //create feature for child layer
            childFeature = new g3wsdk.core.layer.features.Feature();
            childFeature.setTemporaryId();
            // set name attribute to `null`
            CatalogLayersStoresRegistry
              .getLayerById(childLayerId)
              .getEditingFields()
              .forEach(field => childFeature.set(field.name, null));
            //set father field value
            childFeature.set(childField, fields.find(f => fatherField === f.name).value);
            //add feature to a child source
            source.addFeature(childFeature);
            //new feature and child feature are the same
            newChild = childFeature;
          } else {
            //is update
            if (childFeature) {
              //clone child Feature so all changes apply by father is set to clone new feature
              newChild = childFeature.clone();
            }
          }

          //check if there is a childFeature to save
          if (childFeature) {
            // Loop editable only field of father layerId when
            // a child relation (1:1) is bind to the current feature
            const editiableRelatedFieldChild = service
              .getLayerById(relation.getFather())
              .getEditingFields()
              .filter(f => f.vectorjoin_id && f.vectorjoin_id === relation.getId() && f.editable);

            editiableRelatedFieldChild
              .forEach(field => newChild.set(field.name.replace(relation.getPrefix(), ''), features[0].get(field.name)));

            // add relation new relation
            if (isNewChildFeature) {

              // check if father field is a Pk (Primary key) if feature is new
              if (service.getLayerById(layerId).isPkField(fatherField)) {
                childFeature.set(childField, features[0].getId()); // set temporary
              }

              //if new need to add to session
              task.getContext()
                .session
                .pushAdd(childLayerId, newChild, false);

            } else {
              //need to update source child feature
              source.updateFeature(newChild);
              //need to update
              task.getContext()
                .session
                .pushUpdate(childLayerId, newChild, childFeature);

            }
          }
        }

        resolve();

      })
    });

  await Promise.allSettled(promises);
}