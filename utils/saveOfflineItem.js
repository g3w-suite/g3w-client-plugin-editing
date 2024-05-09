const { ApplicationService } = g3wsdk.core;

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
 * 
 * @param { Object } opts
 * @param opts.id
 * @param opts.data
 *
 * @returns {*}
 * 
 * @since g3w-client-plugin-editing@v3.8.0
 */
export function saveOfflineItem({
  id,
  data,
} = {}) {
  // handle offline changes before save
  if (id === 'EDITING_CHANGES') {
    const changes = ApplicationService.getOfflineItem('EDITING_CHANGES');
    const applyChanges = ({layerId, current, previous})=> {
      current[layerId].add = [...previous[layerId].add, ...current[layerId].add];
      current[layerId].delete = [...previous[layerId].delete, ...current[layerId].delete];
      previous[layerId].update.forEach(updateItem => {
        const {id} = updateItem;
        const find = current[layerId].update.find(updateItem => updateItem.id === id);
        if (!find) {
          current[layerId].update.unshift(updateItem);
        }
      });
      const lockids = previous[layerId].lockids|| [];
      lockids
        .forEach(lockidItem => {
          const {featureid} = lockidItem;
          const find = current[layerId].lockids.find(lockidItem => lockidItem.featureid === featureid);
          if (!find) {
            current[layerId].update.unshift(lockidItem);
          }
      })
    };

    for (const layerId in changes) {
      // check if previous changes are made in the same layer or in relationlayer of current
      const current = data[layerId] ? data :
        data[Object.keys(data)[0]].relations[layerId] ?
          data[Object.keys(data)[0]].relations : null;

      if (current) {
        applyChanges({
          layerId,
          current,
          previous: changes
        });
      } else {
        // check if in the last changes
        const currentLayerId = Object.keys(data)[0];
        const relationsIds = Object.keys(changes[layerId].relations);
        if (relationsIds.length) {
          if (relationsIds.indexOf(currentLayerId) !== -1) {
            applyChanges({
              layerId: currentLayerId,
              current: data,
              previous: changes[layerId].relations
            });
            changes[layerId].relations[currentLayerId] = data[currentLayerId];
            data = changes;
          }
        } else data[layerId] = changes[layerId];
      }
    }
    return data;
  }
  return ApplicationService.setOfflineItem(id, data);
}