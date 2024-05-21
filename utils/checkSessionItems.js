/**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/history.js@v3.9.1
   * 
   * check if was done an update (update are array contains two items, old and new value)
   *
   * @since g3w-client-plugin-editing@v3.8.0
   */
export function checkSessionItems(historyId, items, action) {
  /**
   * action: <reffererd to array index>
   *  0: undo;
   *  1: redo;
   **/
  const newItems = {
    own: [], //array of changes of layer of the current session
    dependencies: {} // dependencies
  };

  items
    .forEach((item) => {
      if (Array.isArray(item)) {
        item = item[action];
      }
      // check if belong to session
      if (historyId === item.layerId) {
        newItems.own.push(item)
      } else {
        newItems.dependencies[item.layerId] = newItems.dependencies[item.layerId] || {
          own: [],
          dependencies: {}
        };
        newItems.dependencies[item.layerId].own.push(item);
      }
    });

  return newItems;
}