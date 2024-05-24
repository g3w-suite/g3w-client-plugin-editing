import { Workflow }                                     from '../g3wsdk/workflow/workflow';
import { Step }                                         from '../g3wsdk/workflow/step';
import { createEditingDataOptions }                     from '../utils/createEditingDataOptions';
import { setLayerUniqueFieldValues }                    from '../utils/setLayerUniqueFieldValues';
import { getRelationsInEditing }                        from '../utils/getRelationsInEditing';
import { getRelationId }                                from '../utils/getRelationId';
import { setAndUnsetSelectedFeaturesStyle }             from '../utils/setAndUnsetSelectedFeaturesStyle';
import { chooseFeature }                                from '../utils/chooseFeature';
import { cloneFeature }                                 from '../utils/cloneFeature';
import { evaluateExpressionFields }                     from '../utils/evaluateExpressionFields';
import { getNotEditableFieldsNoPkValues }               from '../utils/getNotEditableFieldsNoPkValues';
import { getDeltaXY }                                   from '../utils/getDeltaXY';
import { chooseFeatureFromFeatures }                    from '../utils/chooseFeatureFromFeatures';
import { convertFeaturesGeometryToGeometryTypeOfLayer } from '../utils/convertFeaturesGeometryToGeometryTypeOfLayer';
import { getProjectLayerFeatureById }                   from '../utils/getProjectLayerFeatureById';
import { addTableFeature }                              from '../utils/addTableFeature';
import { getRelationFieldsFromRelation }                from '../utils/getRelationFieldsFromRelation';
import { getLayersDependencyFeatures }                  from '../utils/getLayersDependencyFeatures';
import { getEditingLayerById }                          from '../utils/getEditingLayerById';
import { getRelationsInEditingByFeature }               from '../utils/getRelationsInEditingByFeature';
import { isPointOnVertex }                              from '../utils/isPointOnVertex';
import { handleSplitFeature }                           from '../utils/handleSplitFeature';
import { addPartToMultigeometries }                     from '../utils/addPartToMultigeometries';
import { checkSessionItems }                            from '../utils/checkSessionItems';
import { promisify, $promisify }                        from '../utils/promisify';
import { unlinkRelation }                               from '../utils/unlinkRelation';

import {
  OpenFormStep,
  SelectElementsStep,
  PickFeatureStep,
  AddFeatureStep,
  MoveFeatureStep,
  ModifyGeometryVertexStep,
  OpenTableStep,
}                          from '../workflows';
import { Tool }            from '../toolboxes/tool';

Object
  .entries({
    Workflow,
    OpenFormStep,
    SelectElementsStep,
    PickFeatureStep,
    MoveFeatureStep,
    ModifyGeometryVertexStep,
    Tool,
    OpenTableStep,
    AddFeatureStep,
  })
  .forEach(([k, v]) => console.assert(undefined !== v, `${k} is undefined`));

const { G3W_FID }                         = g3wsdk.constant;
const {
  ApplicationState,
  G3WObject
}                                         = g3wsdk.core;
const { CatalogLayersStoresRegistry }     = g3wsdk.core.catalog;
const { Geometry }                        = g3wsdk.core.geometry;
const {
  dissolve,
  isSameBaseGeometryType,
  multiGeometryToSingleGeometries,
  singleGeometriesToMultiGeometry,
  splitFeatures,
}                                         = g3wsdk.core.geoutils;
const {
  removeZValueToOLFeatureGeometry,
  is3DGeometry,
}                                         = g3wsdk.core.geoutils.Geometry;
const { tPlugin }                         = g3wsdk.core.i18n;
const { Layer }                           = g3wsdk.core.layer;
const { Feature }                         = g3wsdk.core.layer.features;
const { debounce, toRawType }             = g3wsdk.core.utils;
const { GUI }                             = g3wsdk.gui;
const { getScaleFromResolution }          = g3wsdk.ol.utils;

/**
 * ORIGINAL SOURCE: g3w-client-plugin/toolboxes/toolsfactory.js@v3.7.1
 */
export class ToolBox extends G3WObject {

  constructor(layer) {
    super();

    const is_vector       = [undefined, Layer.LayerTypes.VECTOR].includes(layer.getType());
    const geometryType    = is_vector && layer.getGeometryType();
    const is_point        = is_vector && Geometry.isPointGeometryType(geometryType);
    const is_line         = is_vector && Geometry.isLineGeometryType(geometryType);
    const is_poly         = is_vector && Geometry.isPolygonGeometryType(geometryType);
    const is_table        = Layer.LayerTypes.TABLE === layer.getType();
    const isMultiGeometry = geometryType && Geometry.isMultiGeometry(geometryType);
    const iconGeometry    = is_vector && (is_point ? 'Point' : is_line ? 'Line' : 'Polygon');

    this._start       = false;
    this.uniqueFields = this.getUniqueFieldsType(layer.getEditingFields());

    /** constraint loading features to a filter set */
    this.constraints  = { filter: null, show: null, tools: [] };

    /** reactive state of history */
    this._constrains  = { commit: false, undo: false, redo: false };

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

    /**
     * ORIGINAL SOURCE: g3w-client/src/core/editing/history.js@v3.9.1
     * 
     * @since g3w-client-plugin-editing@v3.8.0
     */
    this._history = {
      id:                   layer.getId(),
      state:                new Proxy({}, { get: (_, prop) => this._constrains[prop] }),
      add:                  this.__add.bind(this),
      getRelationStates:    this.__getRelationStates.bind(this),
      insertState:          this.__insertState.bind(this),
      removeState:          this.__deleteState.bind(this),
      removeStates:         this.__removeChangesFromHistory.bind(this),
      insertStates:         this.__insertStates.bind(this),
      undo:                 this.__undo.bind(this),
      clear:                this.__clearHistory.bind(this),
      redo:                 this.__redo.bind(this),
      setItemsFeatureIds:   this.__setItemsFeatureIds.bind(this),
      getState:             this.__getState.bind(this),
      getFirstState:        this.__getFirstState.bind(this),
      getLastState:         this.__getLastHistoryState.bind(this),
      getCurrentState:      this.__getCurrentState.bind(this),
      getCurrentStateIndex: this.__getCurrentStateIndex.bind(this),
      canCommit:            this.__canCommit.bind(this),
      canUndo:              this.__canUndo.bind(this),
      canRedo:              this.__canRedo.bind(this),
      commit:               this.__commit.bind(this),
    };

    /**
     * ORIGINAL SOURCE: g3w-client/src/core/editing/session.js@v3.9.1
     */
    this._session = Object.assign(new G3WObject({ setters: {
      start:                        (options={}) => $promisify(this.__startSession(options)),
      stop:                         ()           => $promisify(this.__stopSession()),
      getFeatures:                  (options={}) => $promisify(this.__getFeatures(options)),
      saveChangesOnServer:          commitItems  => this.__saveChangesOnServer(commitItems),
    }}), {
      _history:                     this._history,
      state:                        new Proxy({}, { get: (_, prop) => this.state.editing.session[prop] }),
      getId:                        () => layer.getId(),
      getLastHistoryState:          this.__getLastHistoryState.bind(this),
      getLastStateId:               this.__getLastStateId.bind(this),
      isStarted:                    this.__isStarted.bind(this),
      getHistory:                   this.__getHistory.bind(this),
      getEditor:                    this.__getEditor.bind(this),
      updateTemporaryChanges:       this.__updateTemporaryChanges.bind(this),
      removeChangesFromHistory:     this.__removeChangesFromHistory.bind(this),
      push:                         this.__push.bind(this),
      pushDelete:                   this.__pushDelete.bind(this),
      deleteState:                  this.__deleteState.bind(this),
      save:                         this.__save.bind(this),
      pushAdd:                      this.__pushAdd.bind(this),
      pushUpdate:                   this.__pushUpdate.bind(this),
      moveRelationStatesOwnSession: this.__moveRelationStatesOwnSession.bind(this),
      revert:                       this.revert.bind(this),
      rollback:                     this.__rollback.bind(this),
      rollbackDependecies:          this.__rollbackDependecies.bind(this),
      undo:                         this.__undoSession.bind(this),
      redo:                         this.__redoSession.bind(this),
      getCommitItems:               this.__getCommitItems.bind(this),
      set3DGeometryType:            this.__set3DGeometryType.bind(this),
      commit:                       this.save.bind(this),
      clear:                        this.__clearSession.bind(this),
      clearHistory:                 this.__clearHistory.bind(this),
    });

    // register this session on session registry
    ToolBox._sessions[layer.getId()] = this;

    this.state = {
      layer,
      id               : layer.getId(),
      changingtools    : false, // whether to show tools during change phase
      show             : true,  // whether to show the toolbox if we need to filtered
      color            : layer.getColor()       || 'blue',
      title            : ` ${layer.getTitle()}` || "Edit Layer",
      customTitle      : false,
      loading          : false,
      enabled          : false,
      toolboxheader    : true,
      startstopediting : true,
      message          : null,
      toolmessages     : { help: null },
      toolsoftool      : [],
      selected         : false,
      activetool       : null,
      editing          : {
        session      : {
          id:          new Proxy({}, { get: () => this.state.id }),
          started:     false,
          getfeatures: false,
          /** maximum "buffer history" lenght for undo/redo */
          maxSteps:    10,
          /** current state of history (useful for undo /redo) */
          current:     null,
          /** temporary change not save on history */
          changes:     [],
        },
        history      : this._history.state,
        on           : false,
        dependencies : [],
        relations    : [],
        father       : false,
        canEdit      : true
      },
      layerstate       : layer.state,
      /** @since g3w-client-plugin-editing@v3.7.0 store key events setters */
      _unregisterStartSettersEventsKey: [],
      _getFeaturesOption: {},
      _layerType: layer.getType() || Layer.LayerTypes.VECTOR,
      _enabledtools: undefined,
      _disabledtools: undefined,
      _constraints: layer.getEditingConstrains() || {},
      _tools: [
        //Add Feature
        (is_vector) && {
          id: 'addfeature',
          type: ['add_feature'],
          name: 'editing.tools.add_feature',
          icon: `add${iconGeometry}.png`,
          row: 1,
          /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/addfeatureworkflow.js@v3.7.1 */
          op(options = {}) {
            const w = new Workflow({
              ...options,
              type: 'addfeature',
              steps: [
                new AddFeatureStep(options),
                new OpenFormStep(options),
              ],
            });
            w.addToolsOfTools({ step: w.getStep(0), tools: ['snap', 'measure'] });
            return w;
          },
        },
        //Edit Attributes Feature
        (is_vector) && {
          id: 'editattributes',
          type: ['change_attr_feature'],
          name: 'editing.tools.update_feature',
          icon: 'editAttributes.png',
          row: 1,
          /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/editfeatureattributesworkflow.js@v3.7.1 */
          op(options = {}) {
            const w = new Workflow({
              ...options,
              helpMessage: 'editing.tools.update_feature',
              type: 'editfeatureattributes',
              steps: [
                new PickFeatureStep(),
                new Step({ run: chooseFeature }),
                new OpenFormStep(),
              ],
            });
            return w;
          },
        },
        //Delete Feature
        (is_vector) && {
          id: 'deletefeature',
          type: ['delete_feature'],
          name: 'editing.tools.delete_feature',
          icon: `delete${iconGeometry}.png`,
          row: 1,
          /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/deletefeatureworkflow.js@v3.7.1 */
          op(options = {}) {
            return new Workflow({
              ...options,
              type: 'deletefeature',
              steps: [
                new PickFeatureStep(),
                new Step({ run: chooseFeature }),
                // delete feature
                new Step({
                  help: "editing.steps.help.double_click_delete",
                  run(inputs, context) {
                    return $promisify(async() => {
                      const layerId = inputs.layer.getId();
                      const feature = inputs.features[0];
    
                      // get all relations of the current editing layer that are in editing
                      // and filter relations
                      // get relation layer id that are in relation with layerId (current layer in editing)
                      // get fields of relation layer that are in relation with layerId
                      // Exclude relation child layer that has at least one
                      // editing field required because when unlink relation feature from
                      // delete father, when try to commit update relation, we receive an error
                      // due missing value /null to required field.
                      const relations = getRelationsInEditing({
                        layerId,
                        relations: inputs.layer.getRelations() ? inputs.layer.getRelations().getArray() : []
                      }).filter(
                        relation => getEditingLayerById(getRelationId({ layerId, relation }))
                          .getEditingFields() //get editing field of relation layer
                          .filter(f => getRelationFieldsFromRelation({ relation, layerId: getRelationId({ layerId, relation }) }).ownField.includes(f.name)) //filter only relation fields
                          .every(f => !f.validate.required) // check required
                      );

                      // promise return features relations and add to relation layer child
                      if (relations.length > 0) {
                        await getLayersDependencyFeatures(layerId, { feature, relations});
                      }

                      inputs.features = [feature];

                      // Unlink relation features related to layer id
                      getRelationsInEditingByFeature({ layerId, relations, feature }).forEach(({ relation, relations }) => {
                        relations.forEach(r => unlinkRelation({ layerId, relation, relations, index: 0, dialog: false }));
                      });
  
                      context.session.pushDelete(layerId, feature);
  
                      return inputs;
                    });
                  },
                }),
                // confirm step
                new Step({
                  run(inputs) {
                    return $.Deferred(d => {
                      const editingLayer = inputs.layer.getEditingLayer();
                      const feature      = inputs.features[0];
                      const layerId      = inputs.layer.getId();
                      GUI
                        .dialog
                        .confirm(
                          `<h4>${tPlugin('editing.messages.delete_feature')}</h4>`
                          + `<div style="font-size:1.2em;">`
                          + (inputs.layer.getChildren().length && getRelationsInEditing({ layerId, relations: inputs.layer.getRelations().getArray() }).length
                              ? tPlugin('editing.messages.delete_feature_relations')
                              : ''
                            )
                          + `</div>`,
                          result => {
                            if (!result) {
                              d.reject(inputs);
                              return;
                            }
                            editingLayer.getSource().removeFeature(feature);
                            // Remove unique values from unique fields of a layer (when deleting a feature)
                            const fields = g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').state.uniqueFieldsValues[layerId];
                            if (fields) {
                              Object
                                .keys(feature.getProperties())
                                .filter(field => undefined !== fields[field])
                                .forEach(field => fields[field].delete(feature.get(field)));
                            }
                            d.resolve(inputs);
                          }
                        );
                      if (inputs.features) {
                        setAndUnsetSelectedFeaturesStyle({ promise: d.promise(), inputs, style: this.selectStyle });
                      }
                    }).promise();
                  }
                }),
              ],
            });
          },
        },
        //Edit vertex Feature
        (is_line || is_poly) && {
          id: 'movevertex',
          type: ['change_feature'],
          name: "editing.tools.update_vertex",
          icon: "moveVertex.png",
          row: 1,
          /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/modifygeometryvertexworkflow.js@v3.7.1 */
          op(options = {}) {
            const w = new Workflow({
              ...options,
              type: 'modifygeometryvertex',
              helpMessage: 'editing.tools.update_vertex',
              steps: [
                new PickFeatureStep(options),
                new Step({ run: chooseFeature }),
                new ModifyGeometryVertexStep(),
              ],
            })
            w.addToolsOfTools({ step: w.getStep(2), tools: ['snap', 'measure'] });
            return w;
          },
        },
        //Edit Attributes to Multi features
        (is_vector) && {
          id: 'editmultiattributes',
          type: ['change_attr_feature'],
          name: "editing.tools.update_multi_features",
          icon: "multiEditAttributes.png",
          row: 2,
          once: true,
          /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/editmultifeatureattributesworkflow.js@v3.7.1 */
          op(options = {}) {
            const w = new Workflow({
              ...options,
              type: 'editmultiattributes',
              helpMessage: 'editing.tools.update_multi_features',
              registerEscKeyEvent: true,
              steps: [
                new SelectElementsStep({
                  type: 'multiple',
                  steps: {
                    select: {
                      description: `editing.workflow.steps.${ApplicationState.ismobile ? 'selectDrawBoxAtLeast2Feature' : 'selectMultiPointSHIFTAtLeast2Feature'}`,
                      buttonnext: {
                        disabled: true,
                        condition:({ features=[] }) => features.length < 2,
                        done: () => { w.clearUserMessagesSteps() }
                      },
                    }
                  }
                }),
                new OpenFormStep({ multi: true }),
              ],
            });
            return w;
          },
        },
        //Move Feature
        (is_vector) && {
          id: 'movefeature',
          type: ['change_feature'],
          name: 'editing.tools.move_feature',
          icon: `move${iconGeometry}.png`,
          row: 2,
          /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/movefeatureworkflow.js@v3.7.1 */
          op(options = {}) {
            return new Workflow({
              ...options,
              type: 'movefeature',
              helpMessage: 'editing.tools.move_feature',
              steps: [
                new PickFeatureStep(),
                new Step({ run: chooseFeature }),
                new MoveFeatureStep(),
              ],
            });
          },
        },
        //Copy Feature from another layer
        (is_vector) && {
          id: 'copyfeaturesfromotherlayer',
          type: ['add_feature'],
          name: "editing.tools.pastefeaturesfromotherlayers",
          icon: "pasteFeaturesFromOtherLayers.png",
          once: true,
          conditions: {
            enabled: (function() {
              const map          = GUI.getService('map');
              const layerId      = layer.getId();
              const geometryType = layer.getGeometryType();
              const selection    = map.defaultsLayers.selectionLayer.getSource();
              const data = {
                bool: false,
                tool: undefined
              };
              // check selected feature layers
              const selected = () => {
                const enabled = data.bool && selection
                  .getFeatures()
                  .filter(f => {
                    const type = f.getGeometry() && f.getGeometry().getType();
                    return (f.__layerId !== layerId) && isSameBaseGeometryType(geometryType, type) && ((geometryType === type) || Geometry.isMultiGeometry(geometryType) || !Geometry.isMultiGeometry(type));
                  }).length > 0;
                data.tool.setEnabled(enabled);
                return enabled;
              };
              return ({ bool, tool = {} }) => {
                data.tool = tool;
                data.bool = bool;
                selection[bool ? 'on' : 'un']('addfeature', selected);
                selection[bool ? 'on' : 'un']('removefeature', selected);
                return selected();
              }
            }())
          },
          row: 2,
          /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/copyfeaturesfromotherlayerworkflow.js@v3.7.1 */
          op(options = {}) {
            const openFormStep = new OpenFormStep({ ...options, help: 'editing.steps.help.copy' });
            return new Workflow({
              ...options,
              type: 'copyfeaturesfromotherlayer',
              steps: [
                new Step({
                  ...options,
                  help: 'editing.steps.help.draw_new_feature',
                  run(inputs, context) {
                    const d                = $.Deferred();
                    const originalLayer    = inputs.layer;
                    const geometryType     = originalLayer.getGeometryType();
                    const layerId          = originalLayer.getId();
                    //get attributes/properties from current layer in editing
                    const attributes       = originalLayer.getEditingFields().filter(attribute => !attribute.pk);
                    const session          = context.session;
                    const editingLayer     = originalLayer.getEditingLayer();
                    const source           = editingLayer.getSource();
                    // get features from selection features
                    const features         = convertFeaturesGeometryToGeometryTypeOfLayer({
                      geometryType,
                      features: GUI.getService('map').defaultsLayers.selectionLayer.getSource().getFeatures().filter(f => f.__layerId !== layerId),
                    });
                    const selectedFeatures = [];
                
                    /**
                     * ORIGINAL SOURCE: g3w-client-plugin-editing/g3w-editing-components/selectcopyotherlayersfeatures.js.js@v3.6
                     */
                    const layers = {};
                    (features || []).forEach(f => {
                      if (undefined === layers[f.__layerId]) {
                        const external = !CatalogLayersStoresRegistry.getLayerById(f.__layerId);
                        layers[f.__layerId] = {
                          external,
                          fields: !external && CatalogLayersStoresRegistry.getLayerById(f.__layerId).getFields(),
                          features:[]
                        };
                      }
                      layers[f.__layerId].features.push(f);
                    });
                
                    //set reactive
                    const editAttributes = Vue.observable({
                      state: false
                    })
                    const vueInstance    = new (Vue.extend(require('../components/CopyFeaturesFromOtherLayers.vue')))({
                      layers,
                      selectedFeatures,
                      editAttributes
                    });
                
                    const message        = vueInstance.$mount().$el;
                    const dialog         = GUI.showModalDialog({
                      title: tPlugin('editing.modal.tools.copyfeaturefromotherlayer.title'),
                      className: 'modal-left',
                      closeButton: false,
                      message,
                      buttons: {
                        cancel: {
                          label: 'Cancel',
                          className: 'btn-danger',
                          callback() {d.reject();}
                        },
                        ok: {
                          label: 'Ok',
                          className: 'btn-success',
                          callback: async () => {
                            const features = [];
                            let isThereEmptyFieldRequiredNotDefined = false;
                            const promisesFeatures = [];
                            selectedFeatures.forEach(selectedFeature => {
                              /**
                               * check if the layer belongs to project or not
                               */
                              if (CatalogLayersStoresRegistry.getLayerById(selectedFeature.__layerId)) {
                                promisesFeatures.push(getProjectLayerFeatureById({
                                  layerId: selectedFeature.__layerId,
                                  fid: selectedFeature.get(G3W_FID)
                                }));
                              } else {
                                promisesFeatures.push({
                                  properties: selectedFeature.getProperties()
                                })
                              }
                            });
                
                            (await Promise.allSettled(promisesFeatures))
                              .forEach(({status, value:layerFeature}, index) => {
                                if (status === "fulfilled") {
                                  const selectedFeature = selectedFeatures[index];
                                  // Check if there is an empty filed required not defined
                                  isThereEmptyFieldRequiredNotDefined = undefined !== attributes
                                    .find(({name, validate: {required=false}}) => (undefined === layerFeature.properties[name] && required));
                
                                const feature = new Feature({
                                  feature: selectedFeature,
                                  properties: attributes.map(attribute => attribute.name)
                                });
                
                                //@TODO check better way
                                //Set undefined property to null otherwise on commit
                                // property are lost
                                attributes.forEach(({name}) => {
                                  if (undefined === feature.get(name)) {
                                    feature.set(name, null);
                                  }
                                })
                
                                originalLayer.getEditingNotEditableFields()
                                  .find(field => {
                                    if (originalLayer.isPkField(field)) {
                                      feature.set(field, null)
                                    }
                                  });
                                  //remove eventually Z Values
                                  removeZValueToOLFeatureGeometry({
                                    feature
                                  });
                                  feature.setTemporaryId();
                                  source.addFeature(feature);
                                  features.push(feature);
                                  session.pushAdd(layerId, feature, false);
                                }
                              });
                            //check if features selected are more than one
                            if (features.length > 1) {
                              if (editAttributes.state && openFormStep) {
                                openFormStep.updateMulti(true);
                              } else {
                                if (isThereEmptyFieldRequiredNotDefined) {
                                  GUI.showUserMessage({
                                    type: 'warning',
                                    message: 'plugins.editing.messages.copy_and_paste_from_other_layer_mandatory_fields',
                                    autoclose: true,
                                    duration: 2000
                                  });
                                }
                              }
                            }
                            features.forEach(feature => {
                              inputs.features.push(feature)
                              this.fireEvent('addfeature', feature)
                            });
                            vueInstance.$destroy();
                            d.resolve(inputs)
                          }
                        }
                      }
                    });
                    dialog.find('button.btn-success').prop('disabled', true);
                    vueInstance.$watch('selectedFeatures', features => dialog.find('button.btn-success').prop('disabled', features.length === 0));
                    return d.promise();
                  },
                }),
                openFormStep,
              ],
              registerEscKeyEvent: true
            });
          },
        },
        //Copy Feature from layer
        (is_vector) && {
          id: 'copyfeatures',
          type: ['add_feature'],
          name: "editing.tools.copy",
          icon: `copy${iconGeometry}.png`,
          once: true,
          row: 2,
          /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/copyfeaturesworkflow.js@v3.7.1 */
          op(options = {}) {
            return new Workflow({
              ...options,
              type: 'copyfeatures',
              steps: [
                new SelectElementsStep({
                  ...options,
                  help: 'editing.steps.help.copy',
                  type: ApplicationState.ismobile ? 'single' : 'multiple',
                  steps: {
                    select: {
                      description: `editing.workflow.steps.${ApplicationState.ismobile ? 'selectPoint' : 'selectPointSHIFT'}`,
                    }
                  },
                }, true),
                // get vertex
                options.layer.getGeometryType().indexOf('Point') >= 0 ? undefined : new Step({
                  ...options,
                  help: 'editing.steps.help.select',
                  steps: {
                    from: {
                      description: 'editing.workflow.steps.selectStartVertex',
                    }
                  },
                  run(inputs) {
                    /** @since g3w-client-plugin-editing@v3.8.0 */
                    this._stopPromise = this._stopPromise;
                    return $.Deferred(d => {
                      if (!inputs.features.length) {
                        return d.reject('no feature');
                      }
                      this._stopPromise = $.Deferred();

                      /** @since g3w-client-plugin-editing@v3.8.0 */
                      setAndUnsetSelectedFeaturesStyle({ promise: this._stopPromise, inputs, style: this.selectStyle });

                      this.addInteraction(
                        new ol.interaction.Draw({ type: 'Point', condition: e => inputs.features.some(f => isPointOnVertex({ feature: f, coordinates: e.coordinate}))}), {
                        'drawend': e => {
                          inputs.coordinates = e.feature.getGeometry().getCoordinates();
                          this.setUserMessageStepDone('from');
                          d.resolve(inputs);
                        }
                      });
                      this.addInteraction(
                        new ol.interaction.Snap({ edge: false, features: new ol.Collection(inputs.features) })
                      );
                    }).promise();
                  },
                  stop() {
                    /** @since g3w-client-plugin-editing@v3.8.0 */
                    this._stopPromise.resolve(true);
                  },
                }),
                // move elements
                new Step({
                  ...options,
                  help: "editing.steps.help.select_vertex_to_paste",
                  steps: {
                    to: {
                      description: 'editing.workflow.steps.selectToPaste',
                    }
                  },
                  run(inputs, context) {
                    return $.Deferred(d => {
                      const {
                        layer,
                        features,
                        coordinates
                      }             = inputs;
                      const source  = layer.getEditingLayer().getSource();
                      const layerId = layer.getId();
                      const session = context.session;
  
                      /** @since g3w-client-plugin-editing@v3.8.0 */
                      setAndUnsetSelectedFeaturesStyle({ promise: d, inputs, style: this.selectStyle });
  
                      this.addInteraction(
                        new ol.interaction.Draw({ type: 'Point', features: new ol.Collection() }), {
                        'drawend': evt => {
                          const [x, y]                    = evt.feature.getGeometry().getCoordinates();
                          const deltaXY                   = coordinates ? getDeltaXY({x, y, coordinates}) : null;
                          const featuresLength            = features.length;
                          const promisesDefaultEvaluation = [];
    
                          for (let i = 0; i < featuresLength; i++) {
                            const feature = cloneFeature(features[i], layer);
                            if (deltaXY) {
                              feature.getGeometry().translate(deltaXY.x, deltaXY.y);
                            }
                            else {
                              const coordinates = feature.getGeometry().getCoordinates();
                              const deltaXY = getDeltaXY({ x, y, coordinates });
                              feature.getGeometry().translate(deltaXY.x, deltaXY.y)
                            }
                            // set media fields to null
                            layer.getEditingMediaFields({}).forEach(f => feature.set(f, null));
                            /**
                             * evaluated geometry expression
                             */
                            promisesDefaultEvaluation.push(evaluateExpressionFields({ inputs, context, feature }))
                          }
                          Promise
                            .allSettled(promisesDefaultEvaluation)
                            .then(promises => promises
                              .forEach(({status, value:feature}) => {
    
                                /**
                                 * @todo improve client core to handle this situation on session.pushAdd not copy pk field not editable only
                                 */
                                const noteditablefieldsvalues = getNotEditableFieldsNoPkValues({ layer, feature });
                                const newFeature = session.pushAdd(layerId, feature);
                                // after pushAdd need to set not edit
                                if (Object.entries(noteditablefieldsvalues).length) {
                                  Object
                                    .entries(noteditablefieldsvalues)
                                    .forEach(([field, value]) => newFeature.set(field, value));
                                }
    
                                //need to add to editing layer source newFeature
                                source.addFeature(newFeature);
    
                                inputs.features.push(newFeature);
                              })
                            )
                            .finally(() => {
                              /**
                               * @type {boolean}
                               */
                              this._steps.to.done = true;
                              d.resolve(inputs);
                            })
                        }
                      });
  
                      this.addInteraction(
                        new ol.interaction.Snap({ source, edge: false })
                      );
                    }).promise();
                  },
                }),
              ].filter(Boolean),
              registerEscKeyEvent: true,
            });
          },
        },
        //Add part to MultiGeometry Feature
        (is_vector) && {
          id: 'addPart',
          type: ['add_feature', 'change_feature'],
          name: "editing.tools.addpart",
          icon: "addPart.png",
          once: true,
          row: 3,
          visible: isMultiGeometry,
          /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/addparttomultigeometriesworkflow.js@v3.7.1 */
          op(options = {}) {
            const w = new Workflow({
              ...options,
              type: 'addparttomultigeometries',
              helpMessage: 'editing.tools.addpart',
              steps: [
                new PickFeatureStep({
                  steps: {
                    select: {
                      description: 'editing.workflow.steps.select',
                    }
                  },
                }),
                new Step({
                  run: chooseFeature,
                  help: 'editing.steps.help.select_element',
                }),
                new AddFeatureStep({
                  ...options,
                  help: 'editing.steps.help.select_element',
                  add: false,
                  steps: {
                    addfeature: {
                      description: 'editing.workflow.steps.draw_part',
                    }
                  },
                }),
                // add part to multi geometries
                new Step({
                  ...options,
                  help: 'editing.steps.help.select_element',
                  run: addPartToMultigeometries
                }),
              ],
              registerEscKeyEvent: true
            });
            w.addToolsOfTools({ step: w.getStep(2), tools: ['snap', 'measure'] });
            return w;
          },
        },
        //Remove part from MultiGeometry Feature
        (is_vector) && {
          id: 'deletePart',
          type: ['change_feature'],
          name: "editing.tools.deletepart",
          icon: "deletePart.png",
          row: 3,
          visible: isMultiGeometry,
          /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/deletepartfrommultigeometriesworkflow.js@v3.7.1 */
          op(options = {}) {
            return new Workflow({
              ...options,
              type: 'deletepartfrommultigeometries',
              steps: [
                new PickFeatureStep(),
                new Step({ run: chooseFeature }),
                // delete part from multi geometries
                new Step({
                  ...options,
                  run(inputs, context) {
                    return $.Deferred(d => {
                      const originaLayer    = inputs.layer;
                      const editingLayer    = inputs.layer.getEditingLayer();
                      const layerId         = originaLayer.getId();
                      const session         = context.session;
                      const {
                        features,
                        coordinate
                      }                     = inputs;
                      const feature         = features[0];
                      const originalFeature = feature.clone();
                      const geometry        = feature.getGeometry();
                      const geometries      = multiGeometryToSingleGeometries(geometry);
                      const source          = new ol.source.Vector({features: geometries.map(geometry => new ol.Feature(geometry))});
                      const map             = this.getMap();
                      const pixel           = map.getPixelFromCoordinate(coordinate);
                      let tempLayer         = new ol.layer.Vector({
                        source,
                        style: editingLayer.getStyle()
                      });
                  
                      map.addLayer(tempLayer);
                  
                      map.once('postrender', () => {
                        let found = false;
                        //need to call map.forEachFeatureAtPixel and not this.forEachFeatureAtPixel
                        //because we use arrow function, and it referred this to outside context
                        map.forEachFeatureAtPixel(pixel, _feature => {
                          if (!found) {
                            source.removeFeature(_feature);
                            if (source.getFeatures().length) {
                              const newGeometry = singleGeometriesToMultiGeometry(source.getFeatures().map(feature => feature.getGeometry()));
                              feature.setGeometry(newGeometry);
                              /**
                               * evaluated geometry expression
                               */
                              evaluateExpressionFields({
                                inputs,
                                context,
                                feature
                              }).finally(() => {
                                session.pushUpdate(layerId, feature, originalFeature);
                                d.resolve(inputs);
                              });
                              /**
                               * end of evaluated
                               */
                              } else {
                                editingLayer.getSource().removeFeature(feature);
                                session.pushDelete(layerId, feature);
                                d.resolve(inputs);
                              }
                              found = true;
                            }
                          },
                          {
                            layerFilter(layer){
                              return layer === tempLayer
                            },
                            hitTolerance: 1
                          }
                        );
                        //need to call map.forEachFeatureAtPixel and not this.forEachFeatureAtPixel
                        //because we use arrow function, and it referred this to outside context
                        map.removeLayer(tempLayer);
                        tempLayer = null;
                      });
                    }).promise();
                  },
                }),
              ],
              helpMessage: 'editing.tools.deletepart',
            });
          },
        },
        // Split Feature
        (is_line || is_poly) && {
          id: 'splitfeature',
          type:  ['change_feature'],
          name: "editing.tools.split",
          icon: "splitFeatures.png",
          row: 3,
          once: true,
          /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/splitfeatureworkflow.js@v3.7.1 */
          op(options = {}) {
            return new Workflow({
              ...options,
              type: 'splitfeature',
              steps: [
                new SelectElementsStep({
                  ...options,
                  help: 'editing.steps.help.split',
                  type: ApplicationState.ismobile ? 'single' : 'multiple',
                  steps: {
                    select: {
                      description: `editing.workflow.steps.${ApplicationState.ismobile ? 'selectPoint' : 'selectPointSHIFT'}`,
                    }
                  },
                }, true),
                // split feature
                new Step({
                  ...options,
                  help: '',
                  steps: {
                    draw_line: {
                      description: 'editing.workflow.steps.draw_split_line',
                    }
                  },
                  run(inputs, context) {
                    /** @since g3w-client-plugin-editing@v3.8.0 */
                    this._stopPromise = this._stopPromise;
  
                    const d               = $.Deferred();
                    const source          = inputs.layer.getEditingLayer().getSource();
  
                    /** @since g3w-client-plugin-editing@v3.8.0 */
                    this._stopPromise     = $.Deferred();
                    setAndUnsetSelectedFeaturesStyle({ promise: this._stopPromise, inputs, style: this.selectStyle });

                    this.addInteraction(
                      new ol.interaction.Draw({
                        type: 'LineString',
                        features: new ol.Collection(),
                        freehandCondition: ol.events.condition.never
                      }), {
                      'drawend': async e => {
                        let isSplitted = false;
                        const splittedGeometries = splitFeatures({
                          splitfeature: e.feature,
                          features:     inputs.features
                        });
                        const splittedGeometriesLength = splittedGeometries.length;

                        for (let i = 0; i < splittedGeometriesLength; i++) {
                          if (splittedGeometries[i].geometries.length > 1) {
                            isSplitted = true;
                            await handleSplitFeature({
                              feature: inputs.features.find(f => f.getUid() === splittedGeometries[i].uid),
                              context,
                              splittedGeometries: splittedGeometries[i].geometries,
                              inputs,
                              session: context.session,
                            });
                          }
                        }

                        if (isSplitted) {
                          GUI.showUserMessage({
                            type: 'success',
                            message: 'plugins.editing.messages.splitted',
                            autoclose: true
                          });
                        } else {
                          GUI.showUserMessage({
                            type: 'warning',
                            message: 'plugins.editing.messages.nosplittedfeature',
                            autoclose: true
                          });
                        }

                        /** @since g3w-client-plugin-editing@v3.8.0 */
                        //resolve select style feature
                        this._stopPromise.resolve(true);

                        //need to set timeout promise, because at the end of the workflow all user messages are cleared
                        await new Promise((r) => setTimeout(r, 1000));

                        d[isSplitted ? 'resolve' : 'reject'](inputs);
                      }
                    });

                    this.addInteraction(
                      new ol.interaction.Snap({ source, edge: true })
                    );

                    return d.promise();
                  },
                }),
              ],
              registerEscKeyEvent: true,
            });
          },
        },
        //Merge features in one
        (is_line || is_poly) && {
          id: 'mergefeatures',
          type: ['change_feature'],
          name: "editing.tools.merge",
          icon: "mergeFeatures.png",
          row: 3,
          once: true,
          /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/mergefeaturesworkflow.js@v3.7.1 */
          op(options = {}) {
            return new Workflow({
              ...options,
              type: 'mergefeatures',
              steps: [
                new SelectElementsStep({
                  ...options,
                  type: 'bbox',
                  help: 'editing.steps.help.merge',
                  steps: {
                    select: {
                      description: `editing.workflow.steps.${ApplicationState.ismobile ? 'selectDrawBox' : 'selectSHIFT'}`,
                    }
                  },
                }, true),
                // merge features
                new Step({
                  ...options,
                  help: 'editing.steps.help.merge',
                  steps: {
                    choose: {
                      description: 'editing.workflow.steps.merge',
                    }
                  },
                  run(inputs, context) {
                    return $.Deferred(d => {
                      const {
                        layer,
                        features
                      }                  = inputs;
                      const editingLayer = layer.getEditingLayer();
                      const source       = editingLayer.getSource();
                      const layerId      = layer.getId();
                      const session      = context.session;
                  
                      if (features.length < 2) {
                        GUI.showUserMessage({
                          type: 'warning',
                          message: 'plugins.editing.messages.select_min_2_features',
                          autoclose: true
                        });
                        d.reject();
                      } else {
                        chooseFeatureFromFeatures({ features, inputs })
                          .then(async (feature) => {
                            const index           = features.findIndex(_feature => feature === _feature);
                            const originalFeature = feature.clone();
                            const newFeature      = dissolve({features, index});
                  
                            if (newFeature) {
                              try {
                                await evaluateExpressionFields({ inputs, context, feature: newFeature });
                              } catch (err) {
                                console.warn(err);
                              }
                              session.pushUpdate(layerId, newFeature, originalFeature);
                              features
                                .filter(_feature => _feature !== feature)
                                .forEach(deleteFeature => {
                                  session.pushDelete(layerId, deleteFeature);
                                  source.removeFeature(deleteFeature);
                                });
                              inputs.features = [feature];
                              d.resolve(inputs);
                            } else {
                              GUI.showUserMessage({
                                type: 'warning',
                                message: 'plugins.editing.messages.no_feature_selected',
                                autoclose: true
                              });
                              d.reject();
                            }
                          })
                          .catch(() => {
                            d.reject();
                          })
                      }
                    }).promise();
                  },
                }),
              ],
              registerEscKeyEvent: true
            });
          },
        },
        //Copy Features from external layer
        (is_line || is_poly) && {
          id: 'copyfeaturefromexternallayer',
          type: ['add_feature'],
          name: "editing.tools.copyfeaturefromexternallayer",
          icon: "copyPolygonFromFeature.png",
          row: 3,
          once: true,
          visible: tool => {
            const map  = GUI.getService('map');
            const type = tool.getLayer().getGeometryType();
            const has_same_geom = layer => {
              // check if tool is visible and the layer is a Vector
              const features = 'VECTOR' === layer.getType() && layer.getSource().getFeatures();
              return features && features.length ? isSameBaseGeometryType(features[0].getGeometry().getType(), type) : true;
            };
            map.onbefore('loadExternalLayer',  layer => !tool.isVisible() && tool.setVisible(has_same_geom(layer)));
            map.onafter('unloadExternalLayer', layer => {
              const features = tool.isVisible() && 'VECTOR' === layer.getType() && layer.getSource().getFeatures();
              if (features && features.length && isSameBaseGeometryType(features[0].getGeometry().getType(), type)) {
                tool.setVisible(map.getExternalLayers().find(l => undefined !== has_same_geom(l)));
              }
            });
            return false;
          },
          /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/addfeaturefrommapvectorlayersworkflow.js@v3.7.1 */
          op(options = {}) {
            return new Workflow({
              ...options,
              type: 'addfeaturefrommapvectorlayers',
              steps: [
                new SelectElementsStep({
                  ...options,
                  type: 'external',
                  help: 'editing.steps.help.copy'
                }, false),
                new OpenFormStep({
                  ...options,
                  help: 'editing.steps.help.copy'
                }),
              ],
              registerEscKeyEvent: true
            });
          },
        },
        //Table layer (alphanumerical - No geometry)
        //Add Feature
        is_table && {
          id: 'addfeature',
          type: ['add_feature'],
          name: "editing.tools.add_feature",
          icon: "addTableRow.png",
          /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/addtablefeatureworkflow.js@v3.7.1 */
          op(options = {}) {
            return new Workflow({
              ...options,
              type: 'addtablefeature',
              steps: [
                new Step({ help: 'editing.steps.help.new', run: addTableFeature }),
                new OpenFormStep(),
              ],
            });
          },
        },
        //Edit Table
        is_table && {
          id: 'edittable',
          type: ['delete_feature', 'change_attr_feature'],
          name: "editing.tools.update_feature",
          icon: "editAttributes.png",
          once: true,
          /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/edittableworkflow.js@v3.7.1 */
          op(options = {}) {
            return new Workflow({
              type: 'edittable',
              ...options,
              backbuttonlabel: 'plugins.editing.form.buttons.save_and_back_table',
              steps: [ new OpenTableStep() ],
            });
          },
        },
      ].map(tool => new Tool(layer, this._session, tool)).filter(t => !t.INVALID)
    };

    Object.assign(this.state, {
      tools: this.state._tools.map(t => t.getState()),
      /** original value of state in case of custom changes */
      originalState: {
        title: this.state.title,
        toolsoftool: [...this.state.toolsoftool]
      },
    })

    // BACKOMP v3.x
    this.originalState = this.state.originalState;

    this.state._tools.forEach(t => t.setSession(this._session));

    // get informed when save on server
    if (this.uniqueFields) {
      this.getFieldUniqueValuesFromServer();
      this._resetOnSaveChangesOnServer = true;
    }
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
   * 
   * @param { string } layerId
   *
   */
  _stopSessionChildren(layerId) {
    const service = g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing');
    const layer = service.getLayerById(layerId);
    getRelationsInEditing({
      layerId,
      relations: layer.getRelations() ? layer.getRelations().getArray() : [],
    })
      .filter(relation => relation.getFather() === layerId)
      .forEach(relation => {
        const relationId = getRelationId({ layerId, relation });
        // In case of no editing is started (click on pencil of relation layer) need to stop (unlock) features
        if (!service.getToolBoxById(relationId).inEditing()) {
          service.state.sessions[relationId].stop();
        }
      })
  }

  /**
   * @returns {*|{toolboxheader: boolean, layerstate, color: string, toolsoftool: *[], show: boolean, customTitle: boolean, startstopediting: boolean, title: string, loading: boolean, message: null, tools: *[], enabled: boolean, editing: {session, father: boolean, canEdit: boolean, history, relations: *[], on: boolean, dependencies: *[]}, toolmessages: {help: null}, changingtools: boolean, id, activetool: null, selected: boolean}}
   */
  getState() {
    return this.state;
  }

  /**
   * @param bool
   */
  setShow(bool=true) {
    this.state.show = bool;
  }

  /**
   * @returns {*}
   */
  getLayer() {
    return this.state.layer;
  }

  /**
   * @param bool
   */
  setFather(bool) {
    this.state.editing.father = bool;
  }

  /**
   * @returns {boolean}
   */
  isFather() {
    return this.state.editing.father;
  }

  /**
   * @param relations
   */
  addRelations(relations = []) {
    relations.forEach(relation => this.addRelation(relation));
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/session.js@v3.9.1
   *
   * Revert (cancel) all changes in history and clean session
   *
   * @since g3w-client-plugin-editing@v3.8.0
   */
  revert() {
    return $promisify(async () => {
      await promisify(this.state.layer.getEditor().revert());
      this.__clearHistory();
    });
  }

  /**
   * @param relation
   */
  addRelation(relation) {
    this.state.editing.relations.push(relation);
  }

  /**
   * @returns {[]}
   */
  getDependencies() {
    return this.state.editing.dependencies;
  }

  /**
   * @returns {boolean}
   */
  hasDependencies() {
    return this.state.editing.dependencies.length > 0;
  }

  /**
   * @param dependencies
   */
  addDependencies(dependencies) {
    dependencies.forEach(dependency => this.addDependency(dependency));
  }

  /**
   * @param dependency
   */
  addDependency(dependency) {
    this.state.editing.dependencies.push(dependency);
  }

  /**
   * @param reset
   */
  getFieldUniqueValuesFromServer({
    reset=false
  }={}) {
    this.state.layer.getWidgetData({
      type: 'unique',
      fields: Object.values(this.uniqueFields).map(field => field.name).join()
    })
    .then((response) => {
      Object
        .entries(response.data)
        .forEach(([fieldName, values]) => {
          if (reset) {
            this.uniqueFields[fieldName].input.options.values.splice(0);
          }
          values.forEach(value => this.uniqueFields[fieldName].input.options.values.push(value));
        })
    })
    .fail(console.warn)
  }

  /**
   * @param fields
   * 
   * @returns {{}|null}
   */
  getUniqueFieldsType(fields) {
    const uniqueFields = {};
    let find = false;
    fields.forEach(f => {
      if (f.input && 'unique' === f.input.type) {
        uniqueFields[f.name] = f;
        find = true;
      }
    });
    return find && uniqueFields || null;
  }

  /**
   * check if vectorLayer
   */
  isVectorLayer() {
    return Layer.LayerTypes.VECTOR === this.state._layerType;
  }

  /**
   * Create getFeatures options
   * 
   * @param filter
   */
  setFeaturesOptions({
    filter } = {}
  ) {
    if (filter) {
      // in case of no features filter request check if no features_filed is present otherwise it get first field
      if (filter.nofeatures) {
        filter.nofeatures_field = filter.nofeatures_field || this.state.layer.getEditingFields()[0].name;
      }
      this.state._getFeaturesOption = {
        filter,
        editing: true,
        registerEvents: false
      };
      // in case of constraint attribute set the filter as constraint
      if (filter.constraint) {
        this.setConstraintFeaturesFilter(filter);
      }
    } else {
      this.state._getFeaturesOption = createEditingDataOptions(Layer.LayerTypes.TABLE === this.state._layerType ? 'all': 'bbox', { layerId: this.getId() });
    }
  }

  /**
   * @param constraints
   */
  setEditingConstraints(constraints={}) {
    Object.keys(constraints).forEach(c => this.constraints[c] = constraints[c]);
  }

  /**
   * Clear single layer unique field values (when stopping toolbox editing).
   */
  clearLayerUniqueFieldsValues() {
    g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').state.uniqueFieldsValues[this.getId()] = {};
  }

  //added option object to start method to have a control by other plugin how
  start(options={}) {
    const d                     = $.Deferred();
    const id                    = this.getId();
    const applicationConstraint = g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').state.constraints.toolboxes[id];
    let {
      toolboxheader    = true,
      startstopediting = true,
      showtools        = true,
      changingtools    = false,
      tools,
      filter,
    }                           = options;

    this.state.changingtools    = changingtools;
    if (tools) {
      this.setEnablesDisablesTools(tools);
    }
    this.state.toolboxheader    = toolboxheader;
    this.state.startstopediting = startstopediting;

    filter = applicationConstraint && applicationConstraint.filter || this.constraints.filter || filter;
    // set filterOptions
    this.setFeaturesOptions({ filter });

    //register lock features to show message
    const unKeyLock = this.state.layer.getFeaturesStore().onceafter('featuresLockedByOtherUser', () => {
      GUI.showUserMessage({
        type: 'warning',
        subtitle: this.state.layer.getName().toUpperCase(),
        message: 'plugins.editing.messages.featureslockbyotheruser'
      })
    });

    //add featuresLockedByOtherUser setter
    this.state._unregisterStartSettersEventsKey.push(
      () => this.state.layer.getFeaturesStore().un('featuresLockedByOtherUser', unKeyLock)
    );

    const handlerAfterSessionGetFeatures = async promise => {
      this.emit('start-editing');
      await setLayerUniqueFieldValues(this.getId());
      await g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').runEventHandler({ type: 'start-editing', id });
      try {
        const features = await promisify(promise);
        this.stopLoading();
        this.setEditing(true);
        await g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').runEventHandler({ type: 'get-features-editing', id, options: { features } });
        d.resolve({ features })
      } catch (e) {
        console.warn(e);
        GUI.notify.error(e.message);
        await g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').runEventHandler({ type: 'error-editing', id, error: e });
        this.stop();
        this.stopLoading();
        d.reject(e);
      }
    }

    const is_started = !!this.__isStarted();

    const GIVE_ME_A_NAME = !!(
      !is_started
      && ApplicationState.ismobile
      && GUI.getService('map').isMapHidden()
      && Layer.LayerTypes.VECTOR === this.state._layerType
    );

    if (!is_started && GIVE_ME_A_NAME) {
      this.setEditing(true);
      GUI
        .getService('map')
        .onceafter('setHidden', () => {
          setTimeout(() => {
            this._start = true;
            this.startLoading();
            this.setFeaturesOptions({ filter });
            this._session.start(this.state._getFeaturesOption).then(handlerAfterSessionGetFeatures).fail(() => this.setEditing(false));
          }, 300);
      })
    }

    /** @TODO merge the following condtions? */

    if (!is_started && !GIVE_ME_A_NAME) {
      this._start = true;
      this.startLoading();
      this._session.start(this.state._getFeaturesOption).then(handlerAfterSessionGetFeatures)
    }

    if (is_started && !this._start) {
      this.startLoading();
      this._session.getFeatures(this.state._getFeaturesOption).then(handlerAfterSessionGetFeatures);
      this._start = true;
    }

    if (is_started) {
      this.setEditing(true);
    }

    return d.promise();
  };

  /**
   *
   */
  startLoading() {
    this.state.loading = true;
  }

  /**
   *
   */
  stopLoading() {
    this.state.loading = false;
  }

  /**
   * @returns {*}
   */
  getFeaturesOption() {
    return this.state._getFeaturesOption;
  };

  /**
   * @returns {*}
   */
  stop() {
    return $promisify(async() => {
      if (this.disableCanEditEvent) {
        this.disableCanEditEvent();
      }

      this.state._unregisterStartSettersEventsKey.forEach(fnc => fnc());
      this.state._unregisterStartSettersEventsKey = [];
  
      const is_started = !!this.__isStarted();
  
      if (!is_started) {
        this.setSelected(false);
        return true;
      }
  
      if (!ApplicationState.online) {
        return;
      }

      const service = g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing');
      const layerId = this.state.id;

      // Check if father relation is editing and has commit feature
      const fathersInEditing = service.getLayerById(layerId).getFathers().filter(id => {
        const toolbox = service.getToolBoxById(id);
        if (toolbox && toolbox.inEditing() && toolbox.isDirty()) {
          //get temporary relations object and check if layerId has some changes
          return Object.keys(toolbox.getSession().getCommitItems() || {}).find(id => layerId === id);
        }
      });

      if (fathersInEditing.length > 0) {
        this.stopActiveTool();
        this.state.editing.on = false;
        this.enableTools(false);
        this.clearToolboxMessages();
        // unregister get features event
        if (Layer.LayerTypes.VECTOR === this.state._layerType) {
          GUI.getService('map').getMap().un(this._getFeaturesEvent.event, this._getFeaturesEvent.fnc);
        }
        this._stopSessionChildren(this.state.id);
        this.setSelected(false);
        this.clearLayerUniqueFieldsValues();
        return;
      }

      try {
        await promisify(this._session.stop());
        this._start           = false;
        this.state.editing.on = false;
        this.state.enabled    = false;

        this.stopLoading();
        this.state._getFeaturesOption = {};
        this.stopActiveTool();
        this.enableTools(false);
        this.clearToolboxMessages();
        this.setSelected(false);
        this.emit('stop-editing');
        this.clearLayerUniqueFieldsValues();

        return true;
      } catch (e) {
        console.warn(e);
        return Promise.reject(e);
      } finally {
        this.setSelected(false)
      }
    });
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/session.js@v3.9.1
   * 
   * Commit changes on server (save)
   * 
   * @param opts.ids
   * @param opts.items
   * @param opts.relations
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  save({
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
      commit = this.__commit(ids);
      this.__clearHistory(ids);
      return d.promise();
    }

    commit = items || this.__getCommitItems(this.__commit());

    if (!relations) {
      commit.relations = {};
    }

    this.state.layer.getEditor()
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
          ToolBox
            .get(id)               // get session of relation by id
            .getSession()
            .getEditor()
            .applyCommitResponse({        // apply commit response to current editing relation layer
              response: new_relations[id],
              result: true
            });
        }

        this.__clearHistory();

        this._session.saveChangesOnServer(commit); // dispatch setter event.

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
   * @param filter
   */
  setConstraintFeaturesFilter(filter){
    this.constraintFeatureFilter = filter;
  }

  /**
   * @returns {*|{}}
   */
  getEditingConstraints() {
    return this.state._constraints;
  }

  /**
   * @param type
   * 
   * @returns {*}
   */
  getEditingConstraint(type) {
    return this.getEditingConstraints()[type];
  }

  /**
   * @returns {boolean}
   */
  canEdit() {
    return this.state.editing.canEdit;
  }

  /**
   * @param message
   */
  setMessage(message) {
    this.state.message = message;
  }

  /**
   * @returns {null}
   */
  getMessage() {
    return this.state.message;
  }

  /**
   *
   */
  clearMessage() {
    this.setMessage(null);
  }

  /**
   *
   */
  clearToolboxMessages() {
    this.clearToolMessage();
    this.clearMessage();
  }

  /**
   * @returns {*}
   */
  getId() {
    return this.state.id;
  }

  /**
   * @param id
   */
  setId(id) {
    this.state.id = id;
  }

  /**
   * @returns {string}
   */
  getTitle() {
    return this.state.title;
  }

  /**
   * @param title
   */
  setTitle(title) {
    this.state.customTitle = true;
    this.state.title = title;
  }

  /**
   * @returns {string}
   */
  getColor() {
    return this.state.color;
  }

  /**
   * Enable toolbox
   * 
   * @param bool
   */
  setEditing(bool=true) {
    this.setEnable(bool);
    this.state.editing.on = bool;
    this.enableTools(bool);
  }

  /**
   * @returns {boolean}
   */
  inEditing() {
    return this.state.editing.on;
  }

  /**
   * @returns {boolean}
   */
  isEnabled() {
    return this.state.enabled;
  }

  /**
   * @param bool
   * 
   * @returns {boolean}
   */
  setEnable(bool=false) {
    this.state.enabled = bool;
    return this.state.enabled;
  }

  /**
   * @returns {boolean}
   */
  isLoading() {
    return this.state.loading;
  }

  /**
   * @returns {*}
   */
  isDirty() {
    return this.state.editing.history.commit;
  }

  /**
   * @returns {boolean}
   */
  isSelected() {
    return this.state.selected;
  }

  /**
   * @param bool
   */
  setSelected(bool=false) {
    this.state.selected = bool;
    const selected = !!this.state.selected;

    // can edit
    if (selected && this.state._constraints.scale) {
      const scale = this.state._constraints.scale;
      const message = `${tPlugin('editing.messages.constraints.enable_editing')}${scale}`.toUpperCase();
      this.state.editing.canEdit = getScaleFromResolution(GUI.getService('map').getMap().getView().getResolution()) <= scale;
      GUI.setModal(!this.state.editing.canEdit, message);
      const fnc = (event) => {
        this.state.editing.canEdit = getScaleFromResolution(event.target.getResolution()) <= scale;
        GUI.setModal(!this.state.editing.canEdit, message);
      };
      GUI.getService('map').getMap().getView().on('change:resolution', fnc);
      this.disableCanEditEvent = () => {
        GUI.setModal(false);
        GUI.getService('map').getMap().getView().un('change:resolution', fnc);
      }
    }

    // disable can edit
    if (!selected) {
      this.state.editing.canEdit = true;
    }
    if (!selected && this.disableCanEditEvent) {
      this.disableCanEditEvent();
    }
  }

  /**
   * @returns {*}
   */
  getTools() {
    return this.state._tools;
  }

  /**
   * @param toolId
   * 
   * @returns {*|number|bigint|T|T} tool by id
   */
  getToolById(toolId) {
    return this.state._tools.find(tool => toolId === tool.getId());
  }

  /**
   * @param toolId
   */
  setEnableTool(toolId) {
    this.state._tools.find(tool => tool.getId() === toolId).setEnabled(true)
  }

  /**
   * Set tools bases on add
   * editing_constraints : true // follow the tools related toi editing conttraints configuration
   */
  setAddEnableTools({
    tools={},
    options= {editing_constraints: true }
  } = {}) {
    const { editing_constraints = false } = options;
    const ADDONEFEATUREONLYTOOLSID        = [
      'addfeature',
      'editattributes',
      'movefeature',
      'movevertex'
    ];
    const add_tools = this.state._tools
      .filter(tool => {
        return editing_constraints ?
          tool.getType().find(type => type ==='add_feature') :
          ADDONEFEATUREONLYTOOLSID.indexOf(tool.getId()) !== -1;
      })
      .map(tool => {
        const id = tool.getId();
        return {id, options: tools[id]}
    });

    this.setEnablesDisablesTools({
      enabled: add_tools
    });

    this.enableTools(true);
  }

  /**
   * Set tools bases on update
   */
  setUpdateEnableTools({
    tools={},
    excludetools=[],
    options = { editing_constraints: true }
  }) {
    const { editing_constraints = false } = options;
    const UPDATEONEFEATUREONLYTOOLSID     = [
      'editattributes',
      'movefeature',
      'movevertex'
    ];
    const update_tools = this.state._tools
      .filter(tool => {
        // exclude
        if (-1 !== excludetools.indexOf(tool.getId()) ) {
          return false;
        }
        return editing_constraints
          ? tool.getType().find(type => type ==='change_feature' || type ==='change_attr_feature')
          : -1 !== UPDATEONEFEATUREONLYTOOLSID.indexOf(tool.getId()) ;
      })
      .map(tool => {
        const id = tool.getId();
        return { id, options: tools[id]}
      });

    this.setEnablesDisablesTools({ enabled: update_tools });
    this.enableTools(true);
  }

  /**
   * Set tools bases on delete
   */
  setDeleteEnableTools(options={}){
    //TODO
  }

  /**
   * Set enable tools
   *
   * @param tools
   */
  setEnablesDisablesTools(tools) {
    if (tools) {
      this.state.changingtools = true;
      // Check if tools is an array
      const {
        enabled  : enableTools = [],
        disabled : disableTools = []
      } = tools;

      const toolsId = enableTools.length ? [] : this.state._tools.map(tool => tool.getId());

      enableTools
        .forEach(({id, options={}}) => {
          //check if id of tool passed as argument is right
          const tool =this.getToolById(id);
          if (tool) {
            const {active=false} = options;
            // set tool options
            tool.state.messages       = options.messages || tool.state.messages;
            tool.state.visible        = undefined !== options.visible              ? options.visible              : true;
            tool.state.enabled        = undefined !== options.enabled              ? options.enabled              : false;
            tool.disabledtoolsoftools = undefined !== options.disabledtoolsoftools ? options.disabledtoolsoftools : [];
            if (tool.isVisible()) {
              toolsId.push(id);
            }
            if (active) {
              this.setActiveTool(tool);
            }
            if (this.state._enabledtools === undefined) {
              this.state._enabledtools = [];
            }
            this.state._enabledtools.push(tool);
        }
        });
      //disabled and visible
      disableTools
        .forEach(({id, options}) =>{
          const tool = this.getToolById(id);
          if (tool){
            if (this.state._disabledtools === undefined) {
              this.state._disabledtools = [];
            }
            this.state._disabledtools.push(id);
            //add it toi visible tools
            toolsId.push(id);
          }
        });
      //set not visible all remain
      this.state._tools.forEach(tool => !toolsId.includes(tool.getId()) && tool.setVisible(false));
      this.state.changingtools = false;
    }
  };

  /**
   * @param {*} bool whehter enable all tools
   */
  enableTools(bool = false) {
    const tools = this.state._enabledtools || this.state._tools;
    const disabledtools = this.state._disabledtools || [];
    tools
      .forEach(tool => {
        const { conditions:{enabled=bool} } = tool;
        const enableTool = (bool && disabledtools.length)
          ? disabledtools.indexOf(tool.getId()) === -1
          : toRawType(enabled) === 'Boolean'
            ? enabled
            : enabled({ bool, tool });
      tool.setEnabled(enableTool);
      if (!bool) {
        tool.setActive(bool);
      }
    })
  }

  /**
   * @param tool
   */
  setActiveTool(tool) {
    this.stopActiveTool(tool)
      .then(() => {
        this.clearToolsOfTool();
        this.state.activetool = tool;
        tool.once('settoolsoftool', tools => tools.forEach(tool => this.state.toolsoftool.push(tool)));
        const _activedeactivetooloftools = (activetools, active) => {
          this.state.toolsoftool.forEach(tooloftool => {
            if (activetools.indexOf(tooloftool.type) !== -1) {
              tooloftool.options.active = active;
            }
          });
        };

        tool.on('active', (activetools=[]) => _activedeactivetooloftools(activetools, true));
        tool.on('deactive', (activetools=[]) => _activedeactivetooloftools(activetools, false));
        tool.start(GUI.getService('map').isMapHidden());

        this.setToolMessage(this.getToolMessage());

      });
  }

  /**
   *
   */
  clearToolsOfTool() {
    this.state.toolsoftool.splice(0);
  };

  /**
   * @returns {null}
   */
  getActiveTool() {
    return this.state.activetool;
  }

  /**
   *
   */
  restartActiveTool() {
    const activeTool = this.getActiveTool();
    this.stopActiveTool();
    this.setActiveTool(activeTool);
  }

  /**
   * @param tool
   * 
   * @returns {*}
   */
  stopActiveTool(tool) {
    const d          = $.Deferred();
    const activeTool = this.getActiveTool();
    if (activeTool && tool !== activeTool ) {
      activeTool.removeAllListeners();
      activeTool
        .stop(true)
        .then(() => {
          this.clearToolsOfTool();
          this.clearToolMessage();
          this.state.activetool = null;
          setTimeout(d.resolve);
        })
        .fail(console.warn)
    } else {
      if (tool) {
        tool.removeAllListeners();
      }
      d.resolve()
    }
    return d.promise();
  }

  /**
   *
   */
  clearToolMessage() {
    this.state.toolmessages.help = null;
  }

  /**
   * @returns {*}
   */
  getToolMessage() {
    return this.getActiveTool().getMessage();
  }

  /**
   * @param messages
   */
  setToolMessage(messages = {}) {
    this.state.toolmessages.help = messages && messages.help || null;
  }

  /**
   * @returns {*}
   */
  getSession() {
    return this._session;
  }

  /**
   * @returns {*}
   */
  getEditor() {
    return this.state.layer.getEditor();
  }

  /**
   * @returns {*}
   */
  hasChildren() {
    return this.state.layer.hasChildren();
  }

  /**
   * @returns {*}
   */
  hasFathers() {
    return this.state.layer.hasFathers();
  }

  /**
   * @returns {*}
   */
  hasRelations() {
    return this.state.layer.hasRelations();
  }

  /**
   * Reset default values
   */
  resetDefault() {
    this.state.title            = this.state.originalState.title;
    this.state.toolboxheader    = true;
    this.state.startstopediting = true;
    this.constraints = {
      filter: null,
      show: null,
      tools: []
    };

    if (this.state._enabledtools) {
      this.state._enabledtools = undefined;
      this.enableTools();
      this.state._tools.forEach(tool => tool.resetDefault());
    }
    this.state._disabledtools = null;
    this.setShow(true);
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
    if (null === this.state.editing.session.current) {
      this._states = [{ id: uniqueId, items }]
    } else {
      if (this._states.length > 0 && this.state.editing.session.current < this.__getLastStateId()) {
        this._states = this._states.filter(s => s.id <= this.state.editing.session.current);
      }
      this._states.push({ id: uniqueId, items });
    }

    this.state.editing.session.current = uniqueId;
    // set internal state
    this.__canUndo();
    this.__canCommit();
    this.__canRedo();
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
      if (this.state.editing.session.current < stateId) {
        this.state.editing.session.current = stateId;
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
      this.__insertState(states[i]);
    }
    this.__canCommit();
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
    if (this.state.editing.session.current === this.__getFirstState().id) {
      this.state.editing.session.current = null;
      items = this._states[0].items;
    } else {
      this._states.find((state, idx) => {
        if (state.id === this.state.editing.session.current) {
          items = this._states[idx].items;
          this.state.editing.session.current = this._states[idx-1].id;
          return true;
        }
      })
    }
    items = checkSessionItems(this._history.id, items, 0);
    // set internal state
    this.__canUndo();
    this.__canCommit();
    this.__canRedo();
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
    if (!this.state.editing.session.current) {
      items = this._states[0].items;
      // set current to first
      this.state.editing.session.current = this._states[0].id;
    } else {
      this._states.find((state, idx) => {
        if (this.state.editing.session.current === state.id) {
          this.state.editing.session.current = this._states[idx+1].id;
          items = this._states[idx+1].items;
          return true;
        }
      })
    }
    items = checkSessionItems(this._history.id, items, 1);
    // set internal state
    this.__canUndo();
    this.__canCommit();
    this.__canRedo();
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
    if (this.state.editing.session.current && this._states.length) {
      currentState = this._states.find(s => this.state.editing.session.current === s.id);
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
    if (this.state.editing.session.current && this._states.length) {
      this._states.forEach((state, idx) => {
        if (this.state.editing.session.current === state.id) {
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
    const checkCommitItems = this.__commit();
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
    const steps = (this._states.length - 1) - this.__getCurrentStateIndex();
    this._constrains.undo = (null !== this.state.editing.session.current) && (this.state.editing.session.maxSteps > steps);
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
      (this.__getLastHistoryState() && this.__getLastStateId() != this.state.editing.session.current))
      || (null === this.state.editing.session.current && this._states.length > 0);
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
    const statesToCommit = this._states.filter(s => s.id <= this.state.editing.session.current);
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

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/history.js@v3.9.1
   * 
   * @returns {*|null}
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  __getLastHistoryState() {
    return this._states.length ? this._states[this._states.length -1] : null;
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/session.js@v3.9.1
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  __getLastStateId() {
    return this.__getLastHistoryState().id;
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/session.js@v3.9.1
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  __isStarted() {
    return this.state.editing.session.started;
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/session.js@v3.9.1
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  __getHistory() {
    return this._history;
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/session.js@v3.9.1
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  __getEditor() {
    return this.state.layer.getEditor();
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/session.js@v3.9.1
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  __updateTemporaryChanges(feature) {
    this.state.editing.session.changes.forEach(c => c.feature.setProperties(feature.getProperties()));
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/session.js@v3.9.1
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  __removeChangesFromHistory(stateIds = []) {
    (stateIds || []).forEach(s => this.__deleteState(s));
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/session.js@v3.9.1
   * 
   * Add temporary features that will be added with save method
   * 
   * @param { { layerId: string, feature: * } } NewFeat 
   * @param { { layerId: string, feature: * } } OldFeat
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  __push(newFeat, oldFeat) {
    this.state.editing.session.changes.push(oldFeat ? [oldFeat, newFeat] : newFeat); // check is set old (edit)
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/session.js@v3.9.1
   * 
   * Delete temporary feature
   * 
   * @param layerId
   * @param feature
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  __pushDelete(layerId, feature) {
    this.__push({ layerId, feature: feature.delete() });
    return feature;
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/history.js@v3.9.1
   * 
   * @param stateId
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  __deleteState(stateId) {
    const i = this._states.findIndex(s => s.id === stateId);
    console.assert(i >= 0, `invalid stateId ${stateId}`);
    if (this.state.editing.session.current === stateId) {
      this.state.editing.session.current = this._states.length > 1 ? this._states[i-1].id : null;
    }
    this._states.splice(i, 1);
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/session.js@v3.9.1
   * 
   * Save temporary changes to the layer in history instance and feature store
   * 
   * @param options
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  __save(options={}) {
    // fill history
    return $promisify(async () => {
      // add temporary modify to history
      if (this.state.editing.session.changes.length) {
        const uniqueId = options.id || Date.now();
        await promisify(this.__add(uniqueId, this.state.editing.session.changes));
        // clear to temporary changes
        this.state.editing.session.changes = [];
        // resolve if unique id
        return uniqueId;
      }
      return null;
    });
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/session.js@v3.9.1
   * 
   * Add temporary feature
   * 
   * @param layerId 
   * @param feature 
   * @param removeNotEditableProperties
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  __pushAdd(layerId, feature, removeNotEditableProperties=true) {
    /**
     * @TODO check if it need to deprecate it. All properties are need
     * Please take care of this to understand
     * In case of removeNotEditableProperties true, remove not editable field
     * from feature properties
     */
    const editor = layerId === this.state.layer.getId() ? this.state.layer.getEditor() : ToolBox.get(layerId).getSession().getEditor();

    // remove not editable proprierties from feature
    if (removeNotEditableProperties) {
      (editor.getLayer().getEditingNotEditableFields() || []).forEach(f => feature.unset([f]));
    }

    const newFeature = feature.clone();

    this.__push({ layerId, feature: newFeature.add() });

    return newFeature;
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/session.js@v3.9.1
   * 
   * Add temporary feature changes
   * 
   * @param layerId
   * @param newFeature
   * @param oldFeature
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  __pushUpdate(layerId, newFeature, oldFeature) {
    // get index of temporary changes
    const is_new = newFeature.isNew();
    const i = is_new && this.state.editing.session.changes.findIndex(c => layerId === c.layerId && c.feature.getId() === newFeature.getId());

    // in case of new feature
    if (is_new && i >=0) {
      const feature = newFeature.clone();
      feature.add();
      this.state.editing.session.changes[i].feature = feature;
      return;
    }

    this.__push(
      { layerId, feature: newFeature.update() },
      { layerId, feature: oldFeature.update() }
    )
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/session.js@v3.9.1
   * 
   * @returns { Object } state ids
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  __moveRelationStatesOwnSession() {
    const ids = {};
    const { relations } = this.__getCommitItems();
    for (let id in relations) {
      const states = this.__getRelationStates(id);
      ToolBox.get(id)._history.insertStates(states);
      ids[id] = states.map(s => s.id);
    }
    return ids;
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/session.js@v3.9.1
   *
   * @param changes
   *
   * @since g3w-client-plugin-editing@v3.8.0
   */
  __rollback(changes) {
    // skip when..
    if (changes) {
      return this.state.layer.getEditor().rollback(changes);
    }

    // Handle temporary changes of layer
    return $promisify(async () => {
      const id = this.state.layer.getId();
      changes = { own:[], dependencies: {} };
  
      this.state.editing.session.changes.forEach(c => {
        const change = Array.isArray(c) ? c[0] : c;
        if (change.layerId === id) {
          changes.own.push(change);
        } else {
          changes.dependencies[change.layerId] = changes.dependencies[change.layerId] || [];
          // FILO
          changes.dependencies[change.layerId].unshift(change);
        }
      });

      try {
        await promisify(this.state.layer.getEditor().rollback(changes.own));
        for (const id in changes.dependencies) {
          ToolBox.get(id).getSession().rollback(changes.dependencies[id]);
        }
        return changes.dependencies;
      } catch (e) {
        console.warn(e);
      } finally {
        this.state.editing.session.changes = [];
      }
    });
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/session.js@v3.9.1
   * 
   * Rollback child changes of current session
   * 
   * @param ids [array of child layer id]
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  __rollbackDependecies(ids=[]) {
    ids.forEach(id => {
      const changes = [];
      this.state.editing.session.changes = this.state.editing.session.changes.filter(temporarychange => {
        if (temporarychange.layerId === id) {
          changes.push(temporarychange);
          return false
        }
      });
      if(changes.length) {
        ToolBox.get(id).getSession().rollback(changes);
      }
    });
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/session.js@v3.9.1
   *
   * undo method
   * 
   * @param items
   *
   * @since g3w-client-plugin-editing@v3.8.0
   */
  __undoSession(items) {
    items = items || this.__undo();
    this.state.layer.getEditor().setChanges(items.own, true);
    this.__canCommit();
    return items.dependencies;
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/session.js@v3.9.1
   * 
   * redo method
   * 
   * @param items
   *
   * @since g3w-client-plugin-editing@v3.8.0
   */
  __redoSession(items) {
    items = items || this.__redo();
    this.state.layer.getEditor().setChanges(items.own, true);
    this.__canCommit();
    return items.dependencies;
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/session.js@v3.9.1
   * 
   * Serialize commit
   * 
   * @returns {{ add: *[], update: *[], relations: {}, delete: *[] }} JSON Object for a commit body send to server
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  __getCommitItems() {
    const itemsToCommit = this.__commit();
    const id = this.state.layer.getId();
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
        const sessionRelation = ToolBox.get(key).getSession();
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
          // item needs to be deleted
          if ('delete' === state) {
            //check if is new. If is new mean is not present on server
            //so no need to say to server to delete it
            if (!item.isNew()) {
              layer.delete.push(item.getId());
            }
            return;
          }
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
      .filter(id => undefined === this.state.layer.getEditor().getLayer().getRelations().getArray().find(r => id === r.getChild())) // child relations
      .map(id => {
        commitObj.relations[
          ToolBox
            .get(id)
            .getSession()
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
   * ORIGINAL SOURCE: g3w-client/src/core/editing/session.js@v3.9.1
   * 
   * Set geometry: {type} of geojson to a 3D type if needed
   * 
   * @param layerId
   * @param commitItems
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  __set3DGeometryType({
    layerId = this.state.layer.getId(),
    commitItems,
  } = {}) {
    // check id there is editing layer and if is a vector layer
    const elayer = MapLayersStoresRegistry.getLayerById(layerId).getEditingLayer();
    const type = elayer && Layer.LayerTypes.VECTOR === elayer.getType() && elayer.getGeometryType();
    // if is a 3D layer i set on geoJON before send it to server
    if (type && is3DGeometry(type)) {
      commitItems.add.forEach(f => f.geometry.type = type);
      commitItems.update.forEach(f => f.geometry.type = type);
    }
    // same check for relation layers
    Object.keys(commitItems.relations).forEach(id => this.__set3DGeometryType({ layerId: id, commitItems: commitItems.relations[id] }));
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/session.js@v3.9.1
   * 
   * Clear all things bind to session
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  __clearSession() {
    this._allfeatures                      = false;
    this.state.editing.session.started     = false;
    this.state.editing.session.getfeatures = false;
    this.__clearHistory();
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/history.js@v3.9.1
   * 
   * @param ids since g3w-client-plugin-editing@v3.8.0
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  __clearHistory(ids) {
    if (ids) {
      this._states.forEach((state, idx) => {
        if (ids.indexOf(state.id) !== -1) {
          if (this.state.editing.session.current && this.state.editing.session.current === state.id()) {
            this.__undo();
          }
          this._states.splice(idx, 1);
        }
      });
    } else {
      // clear all
      this._states                       = [];
      this.state.editing.session.current = null;
      this._constrains.commit            = false;
      this._constrains.redo              = false;
      this._constrains.undo              = false;
    }
  }

  /**
   * Start session
   */
  async __startSession(options = {}) {
    try {
      const features = await promisify(this.state.layer.getEditor().start(options));
      this.state.editing.session.started = true;
      return features;
    } catch (e) {
      console.warn(e);
      return Promise.reject(e);
    } finally {
      if (!options.registerEvents) {
        return;
      }
      this._getFeaturesEvent = { event: null, fnc: null };
      this.state._getFeaturesOption = options;
      // register get features event (only in case filter bbox)
      if (Layer.LayerTypes.VECTOR === this.state._layerType && this.state._getFeaturesOption.filter.bbox) {
        const fnc = () => {
          const canEdit = this.state.editing.canEdit;
          this.state.layer.getEditingLayer().setVisible(canEdit);
          //added ApplicationState.online
          if (ApplicationState.online && canEdit && GUI.getContentLength() === 0) {
            this.state._getFeaturesOption.filter.bbox = GUI.getService('map').getMapBBOX();
            this.state.loading = true;
            this._session
              .getFeatures(this.state._getFeaturesOption)
              .then(promise => {
                promise.then(() => this.state.loading = false);
              })
          }
        };
        this._getFeaturesEvent.event = 'moveend';
        this._getFeaturesEvent.fnc   = debounce(fnc, 300);
        GUI.getService('map').getMap().on('moveend', this._getFeaturesEvent.fnc);
      }
      if (Layer.LayerTypes.VECTOR === options.type && GUI.getContentLength()) {
        GUI.once('closecontent', () => {
          setTimeout(() => {
            GUI.getService('map').getMap().dispatchEvent(this._getFeaturesEvent.event)
          })
        });
      }
    }
  }

  /**
   * Stop session
   */
  async __stopSession() {
    try {
      if (this.state.editing.session.started || this.state.editing.session.getfeatures) {
        await promisify(this.state.layer.getEditor().stop());
        this.__clearSession();
      }      
    } catch (e) {
      console.warn(e);
      return Promise.reject(e);
    } finally {
      if (!this.inEditing()) {
        return;
      }
      if (ApplicationState.online) {
        this._stopSessionChildren(this.state.id);
      }
      // unregister get features event
      if (this.state._getFeaturesOption.registerEvents && Layer.LayerTypes.VECTOR === this.state._layerType) {
        GUI.getService('map').getMap().un(this._getFeaturesEvent.event, this._getFeaturesEvent.fnc);
      }
    }
  }

  /**
   * Get features from server (by editor)
   */
  async __getFeatures(options={}) {
    if (!this._allfeatures) {
      this._allfeatures = !options.filter;
      const features = await promisify(this.state.layer.getEditor().getFeatures(options));
      this.state.editing.session.getfeatures = true;
      return features;
    }
    return [];
  }

  /**
   * Hook to get informed that are saved on server
   */
  __saveChangesOnServer(commitItems) {
    if (this._resetOnSaveChangesOnServer) {
      this.getFieldUniqueValuesFromServer({ reset: true });
    }
  }

};

/**
 * ORIGINAL SOURCE: g3w-client/src/store/sessions.js@v3.9.1
 *
 * Store editing sessions
 *
 * @since g3w-client-plugin-editing@v3.8.0
 */
ToolBox._sessions = {};
ToolBox.get       = id => ToolBox._sessions[id];
ToolBox.clear     = () => Object.keys(sessions).forEach(id => delete ToolBox._sessions[id]);