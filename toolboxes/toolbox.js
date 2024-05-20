import { Workflow }                                     from '../g3wsdk/workflow/workflow';
import Session                                          from '../g3wsdk/editing/session';
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
const { removeZValueToOLFeatureGeometry } = g3wsdk.core.geoutils.Geometry;
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

    this._start             = false;
    this.uniqueFields       = this.getUniqueFieldsType(layer.getEditingFields());

    // is used to constraint loading features to a filter set
    this.constraints        = { filter: null, show: null, tools: []};
    this._session           = new Session({ id: layer.getId(), editor: layer.getEditor()});

    this.state = {
      layer,
      id               : layer.getId(),
      changingtools    : false, // used to show or not tools during change phase
      show             : true, // used to show or not the toolbox if we need to filtered
      color            : layer.getColor() || 'blue',
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
        session      : this._session.state,
        history      : this._session.getHistory().state,
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
                    this.drawInteraction    = this.drawInteraction || null;
                    this._selectInteraction = this._selectInteraction || null;
  
                    const RelationService = require('../services/relationservice');
  
                    const d               = $.Deferred();
                    const originaLayer    = inputs.layer;
                    const layerId         = originaLayer.getId();
                    const session         = context.session;
                    const feature         = inputs.features[0];
  
                    //get all relations of the current editing layer that are in editing
                    const relations       = getRelationsInEditing({
                      layerId,
                      relations: originaLayer.getRelations() ?
                        originaLayer.getRelations().getArray() :
                        []
                    })
                      //and filter relations
                      .filter(relation => {
                        //get relation layer id that are in relation with layerId (current layer in editing)
                        const relationLayerId = getRelationId({ layerId, relation });
  
                        //get relation layer
                        const relationLayer = getEditingLayerById(relationLayerId);
  
                        //get fields of relation layer that are in relation with layerId
                        const { ownField } = getRelationFieldsFromRelation({
                          layerId: relationLayerId,
                          relation
                        });
  
                        // Exclude relation child layer that has at least one
                        // editing field required because when unlink relation feature from
                        // delete father, when try to commit update relation, we receive an error
                        // due missing value /null to required field.
                        return relationLayer
                          .getEditingFields() //get editing field of relation layer
                          .filter(f => ownField.includes(f.name)) //filter only relation fields
                          .every(f => !f.validate.required) //check required
  
                      });
  
                    const promise = relations.length > 0 ?
                      getLayersDependencyFeatures(layerId, {feature, relations}) :
                      Promise.resolve();
  
                    //promise return features relations and add to relation layer child
                    promise.then(() => {
  
                      //get data features
                      const relationsInEditing = getRelationsInEditingByFeature({
                        layerId,
                        relations,
                        feature,
                      });
  
                      inputs.features = [feature];
  
                      relationsInEditing
                        .forEach(relationInEditing => {
                          //relation is an instance of Relation.
                          //relations are relations features
                          const {relation, relations} = relationInEditing;
  
                          const relationService = new RelationService(layerId, {
                            relation,
                            relations
                          });
  
                          const relationsLength = relations.length;
  
                          //Unlink relation features related to layer id
                          for (let index = 0; index < relationsLength ; index++) {
                            //unlink
                            relationService.unlinkRelation(0, false)
                          }
                        });
  
                      session.pushDelete(layerId, feature);
  
                      d.resolve(inputs);
  
                    });
  
                    return d.promise();
                  },
                  stop() {
                    return Promise.resolve(true);
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
            return new Workflow({
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
                        done: () => {}
                      },
                      directive: 't-plugin',
                      dynamic: 0,
                      done: false
                    }
                  }
                }),
                new OpenFormStep({ multi: true }),
              ],
            });
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
                      directive: 't-plugin',
                      done: false
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
                      directive: 't-plugin',
                      done: false
                    }
                  },
                  run(inputs) {
                    this._drawInteraction = this._drawInteraction;
                    this._snapIteraction = this._snapIteraction;
                    /** @since g3w-client-plugin-editing@v3.8.0 */
                    this._stopPromise = this._stopPromise;
                    return $.Deferred(d => {
                      if (!inputs.features.length) {
                        return d.reject('no feature');
                      }
                      this._stopPromise = $.Deferred();

                      /** @since g3w-client-plugin-editing@v3.8.0 */
                      setAndUnsetSelectedFeaturesStyle({ promise: this._stopPromise, inputs, style: this.selectStyle });

                      this._snapIteraction = new ol.interaction.Snap({ edge: false,   features: new ol.Collection(inputs.features) });
                      this._drawIteraction = new ol.interaction.Draw({ type: 'Point', condition: e => inputs.features.some(f => isPointOnVertex({ feature: f, coordinates: e.coordinate}))});
                      this._drawIteraction.on('drawend', e => {
                        inputs.coordinates = e.feature.getGeometry().getCoordinates();
                        this.setUserMessageStepDone('from');
                        d.resolve(inputs);
                      });

                      this.addInteraction(this._drawIteraction);
                      this.addInteraction(this._snapIteraction);
                    }).promise();
                  },
                  stop() {
                    this.removeInteraction(this._drawIteraction);
                    this.removeInteraction(this._snapIteraction);
                    this._snapIteraction = null;
                    this._drawIteraction = null;
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
                      directive: 't-plugin',
                      done: false
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
  
                      this._snapIteraction = new ol.interaction.Snap({source, edge: false});
  
                      this._drawInteraction = new ol.interaction.Draw({type: 'Point', features: new ol.Collection(),});
  
                      this._drawInteraction.on('drawend', evt => {
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
                      });
  
                      this.addInteraction(this._drawInteraction);
                      this.addInteraction(this._snapIteraction);
                    }).promise();
                  },
                  stop() {
                    this.removeInteraction(this._drawInteraction);
                    this.removeInteraction(this._snapIteraction);
                    this._drawInteraction = null;
                    this._snapIteraction = null;
                    return true;
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
                      directive: 't-plugin',
                      done: false
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
                      directive: 't-plugin',
                      done: false
                    }
                  },
                  onRun: ({inputs, context}) => {
                    w.emit('settoolsoftool', [{
                      type: 'snap',
                      options: {
                        layerId: inputs.layer.getId(),
                        source: inputs.layer.getEditingLayer().getSource(),
                        active: true
                      }
                    }]);
                    w.emit('active', ['snap']);
                  },
                  onStop: () => {
                    w.emit('deactive', ['snap']);
                  }
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
                    this.pickFeatureInteraction = this.pickFeatureInteraction || null;
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
                      directive: 't-plugin',
                      done: false,
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
                      directive: 't-plugin',
                      done: false,
                    }
                  },
                  run(inputs, context) {
                    /** @since g3w-client-plugin-editing@v3.8.0 */
                    this._stopPromise = this._stopPromise;
  
                    const d               = $.Deferred();
                    const {
                      layer,
                      features
                    }                     = inputs;
                    const source          = layer.getEditingLayer().getSource();
                    const session         = context.session;
                    this._snapIteraction  = new ol.interaction.Snap({
                      source,
                      edge: true
                    });
  
                    /** @since g3w-client-plugin-editing@v3.8.0 */
                    this._stopPromise     = $.Deferred();
                    setAndUnsetSelectedFeaturesStyle({ promise: this._stopPromise, inputs, style: this.selectStyle });
  
  
                    this._drawInteraction = new ol.interaction.Draw({
                      type: 'LineString',
                      features: new ol.Collection(),
                      freehandCondition: ol.events.condition.never
                    });
  
                    this._drawInteraction.on('drawend', async evt => {
                      const splitfeature = evt.feature;
                      let isSplitted = false;
                      const splittedGeometries = splitFeatures({
                        splitfeature,
                        features
                      });
                      const splittedGeometriesLength = splittedGeometries.length;
  
                      for (let i = 0; i < splittedGeometriesLength; i++) {
                        const {uid, geometries} = splittedGeometries[i];
                        if (geometries.length > 1) {
                          isSplitted = true;
                          const feature = features.find(feature => feature.getUid() === uid);
                          await handleSplitFeature({
                            feature,
                            context,
                            splittedGeometries: geometries,
                            inputs,
                            session
                          });
                        }
                      }
  
                      if (isSplitted) {
                        GUI.showUserMessage({
                          type: 'success',
                          message: 'plugins.editing.messages.splitted',
                          autoclose: true
                        });
  
                        d.resolve(inputs);
  
                      } else {
                        GUI.showUserMessage({
                          type: 'warning',
                          message: 'plugins.editing.messages.nosplittedfeature',
                          autoclose: true
                        });
                        d.reject();
                      }
                    });
                    this.addInteraction(this._drawInteraction);
                    this.addInteraction(this._snapIteraction);
                    return d.promise();
                  },
                  stop() {
                    this.removeInteraction(this._drawInteraction);
                    this.removeInteraction(this._snapIteraction);
                    this._drawInteraction = null;
                    this._snapIteraction = null;
                    /** @since g3w-client-plugin-editing@v3.8.0 */
                    this._stopPromise.resolve(true);
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
                      directive: 't-plugin',
                      done: false,
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
                      directive: 't-plugin',
                      done: false,
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
                  stop() {
                    this.removeInteraction(this._pickInteraction);
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
      tools: this.state._tools.map(tool => tool.getState()),
      /** original value of state in case of custom changes */
      originalState: {
        title: this.state.title,
        toolsoftool: [...this.state.toolsoftool]
      },
    })

    // BACKOMP v3.x
    this.originalState = this.state.originalState;

    this.state._tools.forEach(tool => tool.setSession(this._session));

    // get informed when save on server
    if (this.uniqueFields) {
      this.getFieldUniqueValuesFromServer();
      this._session.onafter('saveChangesOnServer', () => this.getFieldUniqueValuesFromServer({ reset: true }));
    }

    this._session.onafter('stop', () => {
      if (!this.inEditing()) {
        return;
      }
      if (ApplicationState.online) {
        this._stopSessionChildren(this.state.id);
      }
      // unregister get features event
      if(this.state._getFeaturesOption.registerEvents && Layer.LayerTypes.VECTOR === this.state._layerType) {
        GUI.getService('map').getMap().un(this._getFeaturesEvent.event, this._getFeaturesEvent.fnc);
      }
    });

    this._session.onafter('start', options => {
      if (!options.registerEvents) {
        return;
      }
      this._getFeaturesEvent = {
        event: null,
        fnc: null
      };
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
    });
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
    const relations = getRelationsInEditing({
      relations: layer.getRelations() ? layer.getRelations().getArray() : [],
      layerId
    });
    relations
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
   * @returns {*}
   */
  revert() {
    return this._session.revert();
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
    Object
      .keys(constraints)
      .forEach(constraint => this.constraints[constraint] = constraints[constraint]);
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
    const EventName             = 'start-editing';

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
    const lockSetter = 'featuresLockedByOtherUser';
    const unKeyLock = this.state.layer.getFeaturesStore().onceafter(
      lockSetter, //setters name
      () => {                      //handler
        GUI.showUserMessage({
          type: 'warning',
          subtitle: this.state.layer.getName().toUpperCase(),
          message: 'plugins.editing.messages.featureslockbyotheruser'
        })
      }
    )
    //add featuresLockedByOtherUser setter
    this.state._unregisterStartSettersEventsKey.push(
      () => this.state.layer.getFeaturesStore().un(lockSetter, unKeyLock)
    );

    const handlerAfterSessionGetFeatures = promise => {
      this.emit(EventName);
      setLayerUniqueFieldValues(this.getId())
        .then(async () => {
          await g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').runEventHandler({
            type: EventName,
            id
          });
          promise
            .then(async features => {
              this.stopLoading();
              this.setEditing(true);
              await g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').runEventHandler({
                type: 'get-features-editing',
                id,
                options: {
                  features
                }
              });

              d.resolve({features})
            })
            .fail(async error => {
              GUI.notify.error(error.message);
              await g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').runEventHandler({
                type: 'error-editing',
                id,
                error
              });
              this.stop();
              this.stopLoading();
              d.reject(error);
            })
        });
    }

    if (this._session) {
      if (!this._session.isStarted()) {
        //added case of mobile
        if (
          ApplicationState.ismobile
          && GUI.getService('map').isMapHidden()
          && Layer.LayerTypes.VECTOR === this.state._layerType
        ) {
          this.setEditing(true);
          GUI
            .getService('map')
            .onceafter('setHidden', () =>{
              setTimeout(() => {
                this._start = true;
                this.startLoading();
                this.setFeaturesOptions({ filter });
                this._session
                  .start(this.state._getFeaturesOption)
                  .then(handlerAfterSessionGetFeatures)
                  .fail(()=>this.setEditing(false));
              }, 300);
          })
        } else {
          this._start = true;
          this.startLoading();
          this._session
            .start(this.state._getFeaturesOption)
            .then(handlerAfterSessionGetFeatures)
        }
      } else {
        if (!this._start) {
          this.startLoading();
          this._session
            .getFeatures(this.state._getFeaturesOption)
            .then(handlerAfterSessionGetFeatures);
          this._start = true;
        }
        this.setEditing(true);
      }
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
    const EventName  = 'stop-editing';
    const d          = $.Deferred();
    if (this.disableCanEditEvent) {
      this.disableCanEditEvent();
    }
    this.state._unregisterStartSettersEventsKey.forEach(fnc => fnc());

    this.state._unregisterStartSettersEventsKey = [];

    if (this._session && this._session.isStarted()) {
      if (ApplicationState.online) {
        const service = g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing');
        const layerId = this.state.id;
        // Check if father relation is editing and has commit feature
        const fathersInEditing = service.getLayerById(layerId).getFathers().filter(id => {
          const toolbox = service.getToolBoxById(id);
          if (toolbox && toolbox.inEditing() && toolbox.isDirty()) {
            //get temporary relations object
            const {relations={}} = toolbox.getSession().getCommitItems();
            //check if layerId has some changes
            return Object
              .keys(relations)
              .find(relationLayerId => layerId === relationLayerId);
          }
        });

        if (fathersInEditing.length > 0) {
          this.stopActiveTool();
          this.state.editing.on = false;
          this.enableTools(false);
          this.clearToolboxMessages();
          // unregister get features event
          if(Layer.LayerTypes.VECTOR === this.state._layerType) {
            GUI.getService('map').getMap().un(this._getFeaturesEvent.event, this._getFeaturesEvent.fnc);
          }
          this._stopSessionChildren(this.state.id);
          this.setSelected(false);
          this.clearLayerUniqueFieldsValues();
        } else {
          this._session.stop()
            .then(promise => {
              promise.then(() => {
                this._start           = false;
                this.state.editing.on = false;
                this.state.enabled    = false;

                this.stopLoading();
                this.state._getFeaturesOption = {};
                this.stopActiveTool();
                this.enableTools(false);
                this.clearToolboxMessages();
                this.setSelected(false);
                this.emit(EventName);
                this.clearLayerUniqueFieldsValues();
                d.resolve(true)
              })
            })
            .fail(err => d.reject(err))
            .always(() => this.setSelected(false))
        }
      }
    } else {
      this.setSelected(false);
      d.resolve(true)
    }
    return d.promise();
  }

  /**
   *
   */
  save() {
    this._session.commit();
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
            tool.setOptions(options);
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
    return this._editor;
  }

  /**
   * @param editor
   */
  setEditor(editor) {
    this._editor = editor;
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
};
