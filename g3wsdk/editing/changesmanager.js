/**
 * @file
 * 
 * ORIGINAL SOURCE: g3w-client/src/services/editing.js@v3.9.1
 * 
 * @since g3w-client-plugin-editing@v3.8.x
 */

//lass that is usefult to apply changes to features (undo/redo) singleton
function ChangesManager() {
  this.execute = function(object, items, reverse) {
    let fnc;
    let feature;
    items.forEach((item) => {
      feature = item.feature;
      if (reverse) {
        // change to opposite
        feature[ChangesManager.Actions[feature.getState()].opposite]();
      }
      // get method from object
      fnc = ChangesManager.Actions[feature.getState()].fnc;
      object[fnc](feature);
    })
  }
}

// know actions
ChangesManager.Actions = {
  'add': {
    fnc: 'addFeature',
    opposite: 'delete'
  },
  'delete': {
    fnc: 'removeFeature',
    opposite: 'add'
  },
  'update': {
    fnc: 'updateFeature',
    opposite: 'update'
  }
};

export default new ChangesManager();