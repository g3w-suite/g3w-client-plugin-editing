import { promisify }                     from '../utils/promisify';
import { getRelationFieldsFromRelation } from '../utils/getRelationFieldsFromRelation';
import { getRelationId }                 from '../utils/getRelationId';
import { getRelationsInEditing }         from '../utils/getRelationsInEditing';
import { createEditingDataOptions }      from '../utils/createEditingDataOptions';

const { ApplicationState } = g3wsdk.core;

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
 * 
 * @param { string } layerId
 * @param opts
 *
 * @returns { Promise<Awaited<unknown>[]> }
 * 
 * @since g3w-client-plugin-editing@v3.8.0
 */
export async function getLayersDependencyFeatures(layerId, opts = {}) {

  const service   = g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing'); //get editing service

  const layer     = service.getLayerById(layerId);
  const relations = opts.relations
    || layer.getChildren().length && layer.getRelations() && getRelationsInEditing({ layerId, relations: layer.getRelations().getArray().filter(r => r.getFather() === layerId) })
    || [];

  let response;

  try {
    response = await Promise.all(relations.map(async relation => {

      if (relation.setLoading) { relation.setLoading(true) }
      else { relation.loading = true }

      const id = getRelationId({ layerId, relation });

      opts.relation    = relation;
      opts.layerId     = layerId;
      opts.filterType  = 'ONE' === (relation.getType ? relation.getType() : relation.type) ? '1:1' :  opts.filterType; // In a case of relation 1:1
      const filterType =  opts.filterType || 'fid';
      const options    = createEditingDataOptions(filterType, opts);
      const session    = service.state.sessions[id];
      const online     = ApplicationState.online && session;
      const toolbox    = service.getToolBoxById(id);

      // getLayersDependencyFeaturesFromSource

      opts.operator = undefined !== opts.operator ? opts.operator : 'eq'; 

      const { ownField, relationField } = getRelationFieldsFromRelation({ layerId: id, relation });
      const features                    = service.getLayerById(layerId).readEditingFeatures();
      const featureValues               = relationField.map(field => opts.feature.get(field));

      // try to get feature from source without a server request
      const find = (
        (!ApplicationState.online || !session || session.isStarted())
        && 'eq' === opts.operator
        && ownField.every((field, i) => features.find(f => featureValues[i] == f.get(field)))
      );

      toolbox.startLoading();

      try {
        if (online && !session.isStarted()) {
          await promisify(session.start(options));       // start session and get features
        } else if (online && !find) {
          await promisify(session.getFeatures(options)); // request features from server
        }
      } catch (promise) {
        try { await promisify(promise) } catch (e) { console.warn(e, promise); }
      }

      toolbox.stopLoading();

      return id;
    }));
  } catch (e) {
    console.warn(e);
  }

  // at the end se loading false
  relations.forEach(relation => {
    if (relation.setLoading) { relation.setLoading(false) }
    else { relation.loading = false }
  });

  return response;
}