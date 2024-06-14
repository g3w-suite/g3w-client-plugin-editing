import { promisify } from '../../utils/promisify';

/**
 * Class Flow of workflow step by step
 * 
 * ORIGINAL SOURCE: g3w-client/src/core/workflow/flow.js@v3.9.1
 * ORIGINAL SOURCE: g3w-client/src/core/workflow/queque.js@v3.9.1
 */
export function Flow() {
  console.warn('[G3W-CLIENT] g3wsdk.core.workflow.Flow is deprecated');

  class Queque {
    constructor() { this.tasks = []; }
    addTask(task) { this.tasks.push(task); }
    run(reverse = false) { while (this.tasks.length) { const task = reverse ? this.tasks.pop() : this.tasks.shift(); task(); } }
    flush() { return this.tasks.splice(0); }
    getLength() { return this.tasks.length; }
    clear() { this.run(); this.tasks = []; }
  }

  let steps = [];
  let inputs;
  let counter = 0;
  let context = null;
  let d;
  let _workflow;
  this.queques = {
    end: new Queque(),
    micro: new Queque()
  };
  //start workflow
  this.start = function(workflow) {
    d = $.Deferred();
    if (counter > 0) {
      console.log("reset workflow before restarting");
    }
    _workflow = workflow;
    inputs = workflow.getInputs();
    context = workflow.getContext();
    steps = workflow.getSteps();
    // check if there are steps
    if (steps && steps.length) {
      //run step (first)
      this.runStep(steps[0], inputs, context);
    }
    // return a promise that will be reolved if all step go right
    return d.promise();
  };

  //run step
  this.runStep = function(step, inputs) {
    //run step that run task
    _workflow.setMessages({
      help: step.state.help
    });
    const runMicroTasks = this.queques.micro.getLength();
    step.run(inputs, context, this.queques)
      .then(outputs => {
        runMicroTasks && this.queques.micro.run();
        this.onDone(outputs);
      })
      .fail(error => this.onError(error));
  };

  //check if all step are resolved
  this.onDone = function(outputs) {
    counter++;
    if (counter === steps.length) {
      counter = 0;
      d.resolve(outputs);
      return;
    }
    this.runStep(steps[counter], outputs);
  };

  // in case of error
  this.onError = function(err) {
    counter = 0;
    this.clearQueques();
    d.reject(err);
  };

  // stop flow
  this.stop = function() {
    const d = $.Deferred();
    steps[counter].isRunning() ? steps[counter].stop() : null;
    this.clearQueques();
    if (counter > 0) {
      // set counter to 0
      counter = 0;
      // reject flow
      d.reject();
    } else {
      //reject to force rollback session
      d.resolve();
    }
    return d.promise();
  };

  this.clearQueques = function(){
    this.queques.micro.clear();
    this.queques.end.clear();
  }

  g3wsdk.core.utils.base(this)
}

g3wsdk.core.utils.inherit(Flow, g3wsdk.core.G3WObject);

/**
 * ORIGINAL SOURCE: g3w-client/src/services/editing.js@v3.9.1
 */
export const ChangesManager = {
  /** known actions */
  Actions: {
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
  },
  /* apply changes to features (undo/redo) */
  execute(object, items, reverse) {
    console.warn('[G3W-CLIENT] g3wsdk.core.workflow.ChangesManager is deprecated');
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
};

/**
 * ORIGINAL SOURCE: g3w-client/src/core/editing/session.js@v3.9.1
 */
export class Session extends g3wsdk.core.G3WObject {

  constructor(options={}) {
    console.warn('[G3W-CLIENT] g3wsdk.core.workflow.Session is deprecated');

    super(options);

    this.setters = {

      /**
       * Start session
       */
      start(options={}) {
        return $.Deferred(async d => {
          try {
            const features = await promisify(this._editor.start(options));
            this.state.started = true;
            d.resolve(features);
          } catch (e) {
            console.warn(e);
            d.reject(e);
          }
        }).promise();
      },

      /**
       * stop session
       */
      stop() {
        return $.Deferred(async d => {
          const canStop = this.state.started || this.state.getfeatures;
          if (!canStop) {
            return d.resolve();
          }
          try {
            await promisify(this._editor.stop());
            this.clear();
            d.resolve();
          } catch (e) {
            console.warn(e);
            d.reject(e);
          }
        }).promise()
      },

      /**
       * Get features from server (by editor)
       */
      getFeatures(options={}) {
        return $.Deferred(async d => {
          if (this._allfeatures) {
            return d.resolve([]);
          }
          this._allfeatures = !options.filter;
          try {
            const features = await promisify(this._editor.getFeatures(options));
            this.state.getfeatures = true;
            d.resolve(features);
          } catch (e) {
            console.warn(e);
            d.reject(e)
          }
        }).promise();
      },

      /**
       * Hook to get informed that are saved on server
       * 
       * @param commitItems
       */
      saveChangesOnServer(commitItems){},
    };

    this.state = {
      id: options.id,
      started: false,
      getfeatures: false,
      /** maximum "buffer history" lenght for undo/redo */
      maxSteps: 10,
      /** current state of history (useful for undo /redo) */
      current: null,
      /** temporary change not save on history */
      changes: [],
    };

    /**
     * Array of states of a layer in editing
     * {
     * _states: [
     *     {
     *       id: unique key
     *       state: [state] // example: history contsins features state
     *                      // array because a tool can apply changes to more than one features at time (split di una feature)
     *     },
     *     {
     *       id: unique key
     *       state: [state]
     *     },
     *   ]
     *     ....
     *
     *  _current: unique key // usefult to undo redo
     *
     *
     */
    this._states = [];

    /** reactive state of history */
    this._constrains = {
      commit: false,
      undo:false,
      redo: false
    },

    // editor
    this._editor = options.editor;

    /**
     * ORIGINAL SOURCE: g3w-client/src/core/editing/history.js@v3.9.1
     * 
     * @since g3w-client-plugin-editing@v3.8.0
     */
    this._history = {
      id:                   this.state.id,
      state:                new Proxy({}, { get: (_, prop) => this._constrains[prop] }),
      add:                  this.__add.bind(this),
      getRelationStates:    this.__getRelationStates.bind(this),
      insertState:          this.__insertState.bind(this),
      removeState:          this.deleteState.bind(this),
      removeStates:         this.removeChangesFromHistory.bind(this),
      insertStates:         this.__insertStates.bind(this),
      undo:                 this.__undo.bind(this),
      clear:                this.clearHistory.bind(this),
      redo:                 this.__redo.bind(this),
      setItemsFeatureIds:   this.__setItemsFeatureIds.bind(this),
      getState:             this.__getState.bind(this),
      getFirstState:        this.__getFirstState.bind(this),
      getLastState:         this.getLastHistoryState.bind(this),
      getCurrentState:      this.__getCurrentState.bind(this),
      getCurrentStateIndex: this.__getCurrentStateIndex.bind(this),
      canCommit:            this.__canCommit.bind(this),
      canUndo:              this.__canUndo.bind(this),
      canRedo:              this.__canRedo.bind(this),
      commit:               this.__commit.bind(this),
    };

    // register this session on session registry
    this.register();
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/history.js@v3.9.1
   * 
   * check if was done an update (update are array contains two items, old and new value)
   *
   * @since g3w-client-plugin-editing@v3.8.0
   */
  _checkSessionItems(historyId, items, action) {
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

  /**
   * @FIXME add description
   */
  getId() {
    return this.state.id;
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/history.js@v3.9.1
   * 
   * @returns {*|null}
   */
  getLastHistoryState() {
    return this._states.length ? this._states[this._states.length -1] : null;
  }

  /**
   * @FIXME add description
   */
  getLastStateId() {
    return this.getLastHistoryState().id;
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/history.js@v3.9.1
   * 
   * @param stateId
   */
  deleteState(stateId) {
    const i = this._states.findIndex(s => s.id === stateId);
    console.assert(i >= 0, `invalid stateId ${stateId}`);
    if (this.state.current === stateId) {
      this.state.current = this._states.length > 1 ? this._states[i-1].id : null;
    }
    this._states.splice(i, 1);
  }

  /**
   * @FIXME add description
   */
  register() {
    Session.Registry.register(this);
  }

  /**
   * @FIXME add description
   */
  unregister() {
    Session.Registry.unregister(this.getId());
  }

  /**
   * @returns {boolean}
   */
  isStarted() {
    return this.state.started;
  }

  /**
   * @FIXME add description
   */
  getEditor() {
    return this._editor;
  }

  /**
   * @param editor
   */
  setEditor(editor) {
    this._editor = editor;
  }

  /**
   * Save temporary changes to the layer in history instance and feature store
   * 
   * @param options
   */
  save(options={}) {
    //fill history
    const d = $.Deferred();
    // add temporary modify to history
    if (this.state.changes.length) {
      const uniqueId = options.id || Date.now();
      this._history.add(uniqueId, this.state.changes)
        .then(() => {
          // clear to temporary changes
          this.state.changes = [];
          // resolve if unique id
          d.resolve(uniqueId);
        });
    } else {
      d.resolve(null);
    }
    return d.promise();
  }

  /**
   * @param feature
   */
  updateTemporaryChanges(feature) {
    this.state.changes.forEach(c => c.feature.setProperties(feature.getProperties()));
  }

  /**
   * Add temporary feature
   * 
   * @param layerId 
   * @param feature 
   * @param removeNotEditableProperties  
   */
  pushAdd(layerId, feature, removeNotEditableProperties=true) {
    /**
     * @TODO check if it need to deprecate it. All properties are need
     * Please take care of this to understand
     * In case of removeNotEditableProperties true, remove not editable field
     * from feature properties
     */
    const editor = layerId === this.getId() ? this._editor : Session.Registry.getSession(layerId).getEditor();

    // remove not editable proprierties from feature
    if (removeNotEditableProperties) {
      (editor.getLayer().getEditingNotEditableFields() || []).forEach(f => feature.unset([f]));
    }

    const newFeature = feature.clone();

    this.push({ layerId, feature: newFeature.add() });

    return newFeature;
  }

  /**
   * Delete temporary feature
   * 
   * @param layerId 
   * @param feature 
   */
  pushDelete(layerId, feature) {
    this.push({ layerId, feature: feature.delete() });
    return feature;
  }

  /**
   * Add temporary feature changes
   * 
   * @param layerId
   * @param newFeature
   * @param oldFeature
   */
  pushUpdate(layerId, newFeature, oldFeature) {
    // get index of temporary changes
    const is_new = newFeature.isNew();
    const i = is_new && this.state.changes.findIndex(c => layerId === c.layerId && c.feature.getId() === newFeature.getId());

    // in case of new feature
    if (is_new && i >=0) {
      const feature = newFeature.clone();
      feature.add();
      this.state.changes[i].feature = feature;
      return;
    }

    this.push(
      { layerId, feature: newFeature.update() },
      { layerId, feature: oldFeature.update() }
    )
  }

  /**
   * @param stateIds
   */
  removeChangesFromHistory(stateIds = []) {
    (stateIds || []).forEach(s => this.deleteState(s));
  }

  /**
   * @returns { Object } state ids
   */
  moveRelationStatesOwnSession() {
    const ids = {};
    const { relations } = this.getCommitItems();
    for (let id in relations) {
      const states = this._history.getRelationStates(id);
      Session.Registry.getSession(id)._history.insertStates(states);
      ids[id] = states.map(s => s.id);
    }
    return ids;
  }

  /**
   * Add temporary features that will be added with save method
   * 
   * @param { { layerId: string, feature: * } } NewFeat 
   * @param { { layerId: string, feature: * } } OldFeat
   */
  push(newFeat, oldFeat) {
    this.state.changes.push(oldFeat ? [oldFeat, newFeat] : newFeat); // check is set old (edit)
  }

  /**
   * Revert (cancel) all changes in history and clean session
   */
  revert() {
    const d = $.Deferred();
    this._editor
      .revert()
      .then(() => {
        this.clearHistory();
        d.resolve();
      });
    return d.promise();
  }

  /**
   * @param changes
   */
  rollback(changes) {
    // skip when..
    if (changes) {
      return this._editor.rollback(changes);
    }

    // Handle temporary changes of layer
    const d = $.Deferred();
    const id = this.getId();
    changes = {
      own:[],
      dependencies: {}
    };
    this.state.changes.forEach(c => {
      const change = Array.isArray(c) ? c[0] : c;
      if (change.layerId === id) {
        changes.own.push(change);
      } else {
        if (!changes.dependencies[change.layerId]) {
          changes.dependencies[change.layerId] = [];
        }
        // FILO
        changes.dependencies[change.layerId].unshift(change);
      }
    });

    this._editor
      .rollback(changes.own)
      .then(() => {
        for (const id in changes.dependencies) {
          Session.Registry.getSession(id).rollback(changes.dependencies[id]);
        }
        d.resolve(changes.dependencies);
      });

    this.state.changes = [];

    return d.promise();
  }

  /**
   * Rollback child changes of current session
   * 
   * @param ids [array of child layer id]
   */
  rollbackDependecies(ids=[]) {
    ids.forEach(id => {
      const changes = [];
      this.state.changes = this.state.changes.filter(temporarychange => {
        if (temporarychange.layerId === id) {
          changes.push(temporarychange);
          return false
        }
      });
      changes.length && Session.Registry.getSession(id).rollback(changes);
    });
  }

  /**
   * undo method
   * 
   * @param items 
   */
  undo(items) {
    items = items || this._history.undo();
    this._editor.setChanges(items.own, true);
    this._history.canCommit();
    return items.dependencies;
  }

  /**
   * redo method
   * 
   * @param items 
   */
  redo(items) {
    items = items || this._history.redo();
    this._editor.setChanges(items.own, true);
    this._history.canCommit();
    return items.dependencies;
  }

  /**
   * Serialize commit
   * 
   * @returns {{ add: *[], update: *[], relations: {}, delete: *[] }} JSON Object for a commit body send to server
   */
  getCommitItems() {
    const itemsToCommit = this._history.commit();
    const id = this.getId();
    let state;
    let layer;
    const commitObj = {
      add: [],      // features to add
      update: [],   // features to update
      delete: [],   // features to delete
      relations: {} // relation features
    };
    // key is a layer id that has changes to apply
    for (const key in itemsToCommit) {
      let isRelation = false; //set relation to false
      const items = itemsToCommit[key];
      // case key (layer id) is not equal to id (current layer id on editing)
      if (key !== id) {
        isRelation = true; //set true because these changes belong to features relation items
        const sessionRelation = Session.Registry.getSession(key);
        //check lock ids of relation layer
        const lockids =  sessionRelation ? sessionRelation.getEditor().getLockIds(): [];
        //create a relations object
        commitObj.relations[key] = {
          lockids,
          add: [],
          update: [],
          delete: [],
          relations: {} //@since v3.7.1
        };
        layer = commitObj.relations[key];
      } else {
        layer = commitObj;
      }

      items
        .forEach((item) => {
          //check state of feature item
          state = item.getState();
          const GeoJSONFormat = new ol.format.GeoJSON();
          switch (state) {
            //item needs to be deleted
            case 'delete':
              //check if is new. If is new mean is not present on server
              //so no need to say to server to delete it
              if (!item.isNew()) {
                layer.delete.push(item.getId());
              }
              break;
            default:
              //convert feature to json ex. {geometry:{tye: 'Point'}, properties:{}.....}
              const itemObj = GeoJSONFormat.writeFeatureObject(item);
              //get properties
              const childs_properties = item.getProperties();
              for (const p in itemObj.properties) {
              // in case the value of property is an object
              if (itemObj.properties[p] && typeof itemObj.properties[p] === 'object' && itemObj.properties[p].constructor === Object) {
                //need to get value from value attribute object
                itemObj.properties[p] = itemObj.properties[p].value;
              }
              // @TODO explain when this condition happen
              if (undefined === itemObj.properties[p] && childs_properties[p]) {
                itemObj.properties[p] = childs_properties[p]
              }
              }
              // in case of add it have to remove not editable properties
              layer[item.isNew() ? 'add' : item.getState()].push(itemObj);
              break;
          }
        });
      // check in case of no edit remove relation key
      if (
        isRelation
        && layer.add.length    === 0 //no relation features to add
        && layer.update.length === 0 //no relation features to update
        && layer.delete.length === 0 //no relation features to delete
      ) {
        delete commitObj.relations[key];
      }
    }

    // Remove deep relations from current layer (commitObj) that are not relative to that layer
    const relations = Object.keys(commitObj.relations || {});
    relations
      .filter(id => undefined === this._editor.getLayer().getRelations().getArray().find(r => id === r.getChild())) // child relations
      .map(id => {
        commitObj.relations[
          Session.Registry
            .getSession(id)
            .getEditor()
            .getLayer()
            .getRelations()
            .getArray()
            .find(r => -1 !== relations.indexOf(r.getFather())) // parent relation layer
            .getFather()
          ].relations[id] = commitObj.relations[id];
        return id;
      })
      .forEach(id => delete commitObj.relations[id]);

    return commitObj;
  }

  /**
   * Set geometry: {type} of geojson to a 3D type if needed
   * 
   * @param layerId
   * @param commitItems
   */
  set3DGeometryType({
    layerId=this.getId(),
    commitItems}={}
  ) {
    const { relations } = commitItems;
    const editingLayer = MapLayersStoresRegistry.getLayerById(layerId).getEditingLayer();
    // check id there is editing layer and if is a vector layer
    if (editingLayer && g3wsdk.core.layer.Layer.LayerTypes.VECTOR === editingLayer.getType()) {
      // get Geometry type layer
      const geometryType = editingLayer.getGeometryType();
      // if is a 3D layer i set on geoJON before send it to server
      if (g3wsdk.core.geoutils.Geometry.is3DGeometry(geometryType)){
        ['add', 'update']
          .forEach((action) => commitItems[action].forEach(feature => feature.geometry.type = geometryType))
      }
    }
    // the same control of relations layers
    Object
      .keys(relations)
      .forEach(layerId => this.set3DGeometryType({
        layerId,
        commitItems: relations[layerId]
      }));
  }

  /**
   * Commit changes on server (save)
   * 
   * @param opts.ids
   * @param opts.items
   * @param opts.relations
   */
  commit({
    ids = null,
    items,
    relations = true,
    /** @since g3w-client-plugin-editing@v3.8.0 */
    __esPromise = false,
  } = {}) {

    const d = $.Deferred();

    let commit; // committed items

    // skip when ..
    if (ids) {
      commit = this._history.commit(ids);
      this.clearHistory(ids);
      return d.promise();
    }

    commit = items || this.getCommitItems(this._history.commit());

    if (!relations) {
      commit.relations = {};
    }

    this._editor
      .commit(commit)
      .then(response => {

        // skip when response is null or undefined and response.result is false
        if (!(response && response.result)) {
          d.reject(response);
          return;
        }
        
        const { new_relations = {} } = response.response; // check if new relations are saved on server

        // sync server data with local data
        for (const id in new_relations) {
          Session.Registry
            .getSession(id)               // get session of relation by id
            .getEditor()
            .applyCommitResponse({        // apply commit response to current editing relation layer
              response: new_relations[id],
              result: true
            });
        }

        this.clearHistory();

        this.saveChangesOnServer(commit); // dispatch setter event.

        // ES6 promises only accept a single response
        if (__esPromise) {
          d.resolve({ commit, response });
        } else {
          d.resolve(commit, response);
        }
        

      })
      .fail(err => d.reject(err));

    return d.promise();
  }

  /**
   * Clear all things bind to session
   */
  clear() {
    this._allfeatures = false;
    this.state.started = false;
    this.state.getfeatures = false;
    this.clearHistory();
  }

  /**
   * @returns history
   */ 
  getHistory() {
    return this._history;
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/history.js@v3.9.1
   * 
   * @param ids since g3w-client-plugin-editing@v3.8.0
   */
  clearHistory(ids) {
    if (ids) {
      this._states.forEach((state, idx) => {
        if (ids.indexOf(state.id) !== -1) {
          if (this.state.current && this.state.current === state.id()) {
            this._history.undo();
          }
          this._states.splice(idx, 1);
        }
      });
    } else {
      // clear all
      this._states               = [];
      this.state.current         = null;
      this._constrains.commit = false;
      this._constrains.redo   = false;
      this._constrains.undo   = false;
    }
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/history.js@v3.9.1
   *
   * @param uniqueId
   * @param items
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  __add(uniqueId, items) {
    //state object is an array of feature/features changed in a transaction
    const d = $.Deferred();
    // before insert an item into the history
    // check if are at last state step (no redo was done)
    // If we are in the middle of undo, delete all changes
    // in the history from the current "state" so if it
    // can create a new history
    if (null === this.state.current) {
      this._states = [{ id: uniqueId, items }]
    } else {
      if (this._states.length > 0 && this.state.current < this.getLastStateId()) {
        this._states = this._states.filter(s => s.id <= this.state.current);
      }
      this._states.push({ id: uniqueId, items });
    }

    this.state.current = uniqueId;
    // set internal state
    this._history.canUndo();
    this._history.canCommit();
    this._history.canRedo();
    // return unique id key
    // it can be used in save relation
    d.resolve(uniqueId);
    return d.promise();
  }
  
  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/history.js@v3.9.1
   *
   * @param layerId
   * @param clear
   * 
   * @returns { Array }
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  __getRelationStates(layerId, {clear=false}={}) {
    const relationStates = [];
    for (let i=0; i < this._states.length; i++) {
      const state = this._states[i];
      const items = state.items.filter((item) => (Array.isArray(item) ? item[0].layerId : item.layerId) === layerId);
      if (items.length > 0) {
        relationStates.push({ id: state.id, items });
      }
    }
    return relationStates;
  }


  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/history.js@v3.9.1
   *
   * @param state
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  __insertState(state) {
    const stateId = state.id;
    let index = this._states.length;
    for (let i=0; i < this._states.length; i++) {
      const _state = this._states[i];
      if (_state.id > stateId) {
        index = i;
        break;
      } else if (_state.id === stateId) {
        index = -1;
        break;
      }
    }
    if (index > -1) {
      if (this.state.current < stateId) {
        this.state.current = stateId;
      }
      this._states.splice(index, 0, state)
    }
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/history.js@v3.9.1
   *
   * @param states
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  __insertStates(states=[]) {
    for (let i=0; i< states.length; i++) {
      this._history.insertState(states[i]);
    }
    this._history.canCommit();
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/history.js@v3.9.1
   * 
   * undo method
   *
   * @since g3w-client-plugin-editing@v3.8.0
   */
  __undo() {
    let items;
    if (this.state.current === this._history.getFirstState().id) {
      this.state.current = null;
      items = this._states[0].items;
    } else {
      this._states.find((state, idx) => {
        if (state.id === this.state.current) {
          items = this._states[idx].items;
          this.state.current = this._states[idx-1].id;
          return true;
        }
      })
    }
    items = this._checkSessionItems(this._history.id, items, 0);
    // set internal state
    this._history.canUndo();
    this._history.canCommit();
    this._history.canRedo();
    return items;
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/history.js@v3.9.1
   * 
   * redo method
   *
   * @since g3w-client-plugin-editing@v3.8.0
   */
  __redo() {
    let items;
    // if not set get first state
    if (!this.state.current) {
      items = this._states[0].items;
      // set current to first
      this.state.current = this._states[0].id;
    } else {
      this._states.find((state, idx) => {
        if (this.state.current === state.id) {
          this.state.current = this._states[idx+1].id;
          items = this._states[idx+1].items;
          return true;
        }
      })
    }
    items = this._checkSessionItems(this._history.id, items, 1);
    // set internal state
    this._history.canUndo();
    this._history.canCommit();
    this._history.canRedo();
    return items;
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/history.js@v3.9.1
   * 
   * @param { Array } unsetnewids
   *
   * @since g3w-client-plugin-editing@v3.8.0
   */
  __setItemsFeatureIds(unsetnewids=[]) {
    unsetnewids.forEach(unsetnewid => {
      this._states.forEach(state => {
        state.items.forEach(item => {
          const feature = item.feature.getId() === unsetnewid.clientid && item.feature;
          if (feature) {
            feature.setId(unsetnewid.id);
          }
        })
      });
    })
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/history.js@v3.9.1
   * 
   * @param id
   * 
   * @returns {T}
   *
   * @since g3w-client-plugin-editing@v3.8.0
   */
  __getState(id) {
    return this._states.find(s => s.id === id);
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/history.js@v3.9.1
   * 
   * @returns {*|null}
   *
   * @since g3w-client-plugin-editing@v3.8.0
   */
  __getFirstState() {
    return this._states.length ? this._states[0] : null;
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/history.js@v3.9.1
   * 
   * @returns {null}
   *
   * @since g3w-client-plugin-editing@v3.8.0
   */
  __getCurrentState() {
    let currentState = null;
    if (this.state.current && this._states.length) {
      currentState = this._states.find((state) => {
      return this.state.current === state.id;
      });
    }
    return currentState;
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/history.js@v3.9.1
   *
   * @returns { number | null } index of current state
   *
   * @since g3w-client-plugin-editing@v3.8.0
   */
  __getCurrentStateIndex() {
    let currentStateIndex = null;
    if (this.state.current && this._states.length) {
      this._states.forEach((state, idx) => {
        if (this.state.current === state.id) {
          currentStateIndex = idx;
          return false
        }
      });
    }
    return currentStateIndex;
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/history.js@v3.9.1
   *
   * @returns { boolean } true if we can commit
   *
   * @since g3w-client-plugin-editing@v3.8.0
   */
  __canCommit() {
    const checkCommitItems = this._history.commit();
    let canCommit = false;
    for (let layerId in checkCommitItems) {
      const commitItem = checkCommitItems[layerId];
      canCommit = canCommit || commitItem.length > 0;
    }
    this._constrains.commit = canCommit;
    return this._constrains.commit;
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/history.js@v3.9.1
   *
   * canUdo method
   *
   * @since g3w-client-plugin-editing@v3.8.0
   */
  __canUndo() {
    const steps = (this._states.length - 1) - this._history.getCurrentStateIndex();
    this._constrains.undo = (null !== this.state.current) && (this.state.maxSteps > steps);
    return this._constrains.undo;
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/history.js@v3.9.1
   *
   * canRedo method
   *
   * @since g3w-client-plugin-editing@v3.8.0
   */
  __canRedo() {
    this._constrains.redo = (
      (this.getLastHistoryState() && this.getLastStateId() != this.state.current))
      || (null === this.state.current && this._states.length > 0);
    return this._constrains.redo;
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/history.js@v3.9.1
   *
   * get all changes to send to server (mandare al server)
   *
   * @since g3w-client-plugin-editing@v3.8.0
   */
  __commit() {
    const commitItems = {};
    const statesToCommit = this._states.filter(s => s.id <= this.state.current);
    statesToCommit
      .forEach(state => {
        state.items.forEach((item) => {
        let add = true;
        if (Array.isArray(item)) {
          item = item[1];
        }
        if (commitItems[item.layerId]) {
          commitItems[item.layerId].forEach((commitItem, index) => {
            // check if already inserted feature
            if (commitItem.getUid() === item.feature.getUid()) {
              if (item.feature.isNew() && !commitItem.isDeleted() && item.feature.isUpdated()) {
                const _item = item.feature.clone();
                _item.add();
                commitItems[item.layerId][index] = _item;
              } else if (item.feature.isNew() && item.feature.isDeleted()) {
                commitItems[item.layerId].splice(index, 1);
              } else if (item.feature.isUpdated() || item.feature.isDeleted()) {
                commitItems[item.layerId][index] = item.feature;
              }
              add = false;
              return false;
            }
          });
        }
        if (add) {
          const feature = item.feature;
          const layerId = item.layerId;
          if (!(!feature.isNew() && feature.isAdded())) {
            if (!commitItems[layerId]) {
              commitItems[layerId] = [];
            }
            commitItems[layerId].push(feature);
          }
        }
      });
    });
    return commitItems;
  }

}

/** @type { Object<string, Session> } */
const sessions = {};

/**
 * ORIGINAL SOURCE: g3w-client/src/store/sessions.js@v3.9.1
 *
 * Store user session (login / logout)
 *
 * @since g3w-client-plugin-editing@v3.8.0
 */
Session.Registry = {
  _sessions: sessions,
  register(session)       { sessions[session.getId()] = session; },
  unregister(id)          { delete sessions[id]; },
  getSession(id)          { return sessions[id]; },
  setSession(id, session) { sessions[id] = session; },
  getSessions()           { return sessions; },
  clear()                 { Object.keys(sessions).forEach(Session.Registry.unregister); }
};