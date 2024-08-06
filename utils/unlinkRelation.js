import { Workflow }                      from '../g3wsdk/workflow/workflow';
import { getRelationFieldsFromRelation } from '../utils/getRelationFieldsFromRelation';
import { updateParentWorkflows }         from '../utils/updateParentWorkflows';
import { getEditingLayerById }           from '../utils/getEditingLayerById';

const { GUI }     = g3wsdk.gui;
const { tPlugin } = g3wsdk.core.i18n;

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/services/relationservice.js@v3.7.1
 * 
 * Unlink relation
 * @param layerId
 * @param relation
 * @param relations
 * @param index
 * @param dialog
 * 
 * @returns JQuery Promise
 * 
 * @since g3w-client-plugin-editing@v3.8.0
 */
export function unlinkRelation({
  layerId,
  relation,
  relations,
  index,
  dialog = true,
}) {
  return $.Deferred(d => {
    const unlink = () => {
      const id               = layerId === relation.child ? relation.father : relation.child; // relation layer id
      const feature          = getEditingLayerById(id).getEditingSource().getFeatureById(relations[index].id);
      const originalRelation = feature.clone();
      // loop on ownField (Array field child relation)
      getRelationFieldsFromRelation({ relation, layerId: id }).ownField.forEach(f => feature.set(f, null))
      Workflow.Stack.getCurrent().getSession().pushUpdate(id, feature, originalRelation);
      relations.splice(index, 1);
      updateParentWorkflows();
      d.resolve(true);
    };
    if (dialog) {
      GUI.dialog.confirm(tPlugin("editing.messages.unlink_relation"), result => result ? unlink() : d.reject(false));
    } else {
      unlink();
    }
  }).promise();
}