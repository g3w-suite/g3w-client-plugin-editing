import { VM }                                           from '../eventbus';
import { cloneFeature }                                 from '../utils/cloneFeature';
import { areCoordinatesEqual }                          from '../utils/areCoordinatesEqual';
import { evaluateExpressionFields }                     from '../utils/evaluateExpressionFields';
import { getParentFormData }                            from '../utils/getParentFormData';
import { setFeaturesSelectedStyle }                     from '../utils/setFeaturesSelectedStyle';
import { setAndUnsetSelectedFeaturesStyle }             from '../utils/setAndUnsetSelectedFeaturesStyle';
import { getFormFields }                                from '../utils/getFormFields';
import { convertFeaturesGeometryToGeometryTypeOfLayer } from '../utils/convertFeaturesGeometryToGeometryTypeOfLayer';
import { setNullMediaFields }                           from '../utils/setNullMediaFields';
import { getNotEditableFieldsNoPkValues }               from '../utils/getNotEditableFieldsNoPkValues';
import { getFeaturesFromSelectionFeatures }             from '../utils/getFeaturesFromSelectionFeatures';
import { chooseFeatureFromFeatures }                    from '../utils/chooseFeatureFromFeatures';
import { handleRelation1_1LayerFields }                 from '../utils/handleRelation1_1LayerFields';
import { listenRelation1_1FieldChange }                 from '../utils/listenRelation1_1FieldChange';

import CopyFeatureFromOtherLayersComponent              from '../components/CopyFeaturesFromOtherLayers.vue';
import CopyFeatureFromOtherProjectLayersComponent       from '../components/CopyFeaturesFromOtherProjectLayer.vue';
import SaveAll                                          from '../components/SaveAll.vue';
import TableVueObject                                   from '../components/Table.vue';
import { PickFeaturesInteraction }                      from '../interactions/pickfeaturesinteraction';

import { EditingTask }                                  from '../g3wsdk/workflow/task';

Object
  .entries({
    VM,
    cloneFeature,
    CopyFeatureFromOtherLayersComponent,
    CopyFeatureFromOtherProjectLayersComponent,
    SaveAll,
    TableVueObject,
    PickFeaturesInteraction,
  })
  .forEach(([k, v]) => console.assert(undefined !== v, `${k} is undefined`));

const { ApplicationState }                 = g3wsdk.core;
const { Geometry }                         = g3wsdk.core.geometry;
const {
  convertSingleMultiGeometry,
  isSameBaseGeometryType,
  multiGeometryToSingleGeometries,
  singleGeometriesToMultiGeometry,
  dissolve,
  splitFeatures,
}                                          = g3wsdk.core.geoutils;
const { removeZValueToOLFeatureGeometry }  = g3wsdk.core.geoutils.Geometry;
const { Layer }                            = g3wsdk.core.layer;
const { Feature }                          = g3wsdk.core.layer.features;
const { ProjectsRegistry }                 = g3wsdk.core.project;
const { GUI }                              = g3wsdk.gui;
const {
  Step: EditingStep,
  WorkflowsStack,
}                                          = g3wsdk.core.workflow;
const { t, tPlugin }                       = g3wsdk.core.i18n;
const { DataRouterService }                = g3wsdk.core.data;
const {
  AreaInteraction,
  LengthInteraction
}                                          = g3wsdk.ol.interactions.measure;
const {
  PickFeatureInteraction,
  PickCoordinatesInteraction
}                                          = g3wsdk.ol.interactions;
const {
  createMeasureTooltip,
  removeMeasureTooltip
}                                          = g3wsdk.ol.utils;
const { G3W_FID }                          = g3wsdk.constant;
const { CatalogLayersStoresRegistry }      = g3wsdk.core.catalog;
const { Component }                        = g3wsdk.gui.vue;

const EditingFormComponent                 = require('../form/editingform');

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/addfeaturetabletask.js@v3.7.1
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/addtablefeaturestep.js@v3.7.1
 */
export class AddTableFeatureStep extends EditingTask {

  constructor(options = {}) {
    options.help = "editing.steps.help.new";

    super(options);

    options.task = this;
    return new EditingStep(options);
  }

  /**
   * @param { Object } inputs
   * @param inputs.layer
   * @param inputs.features
   * @param { Object } context
   * @param context.session
   * 
   * @returns jQuery promise 
   */
  run(inputs, context) {
    const d = $.Deferred();

    const feature = inputs.features.length > 0 ? inputs.features[inputs.features.length -1 ] : inputs.layer.createNewFeature();

    feature.setTemporaryId();

    inputs.layer.getEditingLayer().getEditingSource().addFeature(feature);

    context.session.pushAdd(inputs.layer.getId(), feature, false);

    inputs.features.push(feature);

    this.setContextGetDefaultValue(true);

    d.resolve(inputs, context);

    return d.promise();
  };

}

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/addfeaturetask.js@v3.7.1
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/addfeaturestep.js@v3.7.1
 */
export class AddFeatureStep extends EditingTask {

  constructor(options = {}) {

    options.help = "editing.steps.help.draw_new_feature";

    super(options);

    this._add = options.add === undefined ? true : options.add;

    this._busy = false;

    this.drawInteraction;

    this.measeureInteraction;

    this.drawingFeature;

    this._snap = false === options.snap ? false : true;

    this._finishCondition = options.finishCondition || (() => true);

    this._condition = options.condition || (() => true);

    /**
     * Handle tasks that stops after `run(inputs, context)` promise (or if ESC key is pressed)
     * 
     * @since g3w-client-plugin-editing@v3.8.0
     */
    this._stopPromise;

    /**
     *
     * @param event
     * @returns {boolean|void}
     * @private
     * callback of pressing esc to remove last point drawed
     */
    this._delKeyRemoveLastPoint  = event => event.keyCode === 46 && this.removeLastPoint();

    options.task = this;
    const step = new EditingStep(options)

    if (options.steps) {
      this.setSteps(options.steps);
    }

    if (options.onRun) {
      this.on('run', options.onRun);
    }

    if (options.onStop) {
      this.on('run', options.onStop);
    }

    return step;
  }

  run(inputs, context) {
    //create promise to listen to pass to setAndUnsetSelectedFeaturesStyle
    this._stopPromise = $.Deferred();

    const d = $.Deferred();
    const originalLayer = inputs.layer;
    const editingLayer = originalLayer.getEditingLayer();
    const session = context.session;
    const layerId = originalLayer.getId();

    // Skin when layer type is vector
    if (Layer.LayerTypes.VECTOR !== originalLayer.getType()) {
      return d.promise();
    }

    /** @since g3w-client-plugin-editing@v3.8.0 */
    setAndUnsetSelectedFeaturesStyle({ promise: this._stopPromise, inputs });

    const originalGeometryType = originalLayer.getEditingGeometryType();

    this.geometryType = Geometry.getOLGeometry(originalGeometryType);

    const source = editingLayer.getSource();
    const attributes = originalLayer.getEditingFields();
    const temporarySource = new ol.source.Vector();

    this.drawInteraction = new ol.interaction.Draw({
      type: this.geometryType,
      source: temporarySource,
      condition: this._condition,
      freehandCondition: ol.events.condition.never,
      finishCondition: this._finishCondition
    });

    this.addInteraction(this.drawInteraction);

    this.drawInteraction.setActive(true);

    this.drawInteraction.on('drawstart', ({feature}) => {
      this.drawingFeature = feature;
      document.addEventListener('keydown', this._delKeyRemoveLastPoint);
    });

    this.drawInteraction.on('drawend', e => {
      let feature;
      if (this._add) {
        attributes.forEach(attribute => { e.feature.set(attribute.name, null); });
        feature = new Feature({ feature: e.feature, });
        feature.setTemporaryId();
        source.addFeature(feature);
        session.pushAdd(layerId, feature, false);
      } else {
        feature = e.feature;
      }
      // set Z values based on layer Geometry
      feature = Geometry.addZValueToOLFeatureGeometry({
        feature,
        geometryType: originalGeometryType
      });

      inputs.features.push(feature);
      this.setContextGetDefaultValue(true);
      this.fireEvent('addfeature', feature); // emit event to get from subscribers
      d.resolve(inputs);
      
    });
    return d.promise();
  }

  /**
   * Method to add Measure
   */
  addMeasureInteraction() {
    const measureOptions = {
      projection: this.getMapService().getProjection(),
      drawColor: 'transparent',
      feature: this.drawingFeature
    };
    if (Geometry.isLineGeometryType(this.geometryType)) {
      this.measureInteraction = new LengthInteraction(measureOptions);
    } else if (Geometry.isPolygonGeometryType(this.geometryType)) {
      this.measureInteraction = new AreaInteraction(measureOptions);
    }
    if (this.measureInteraction){
      this.measureInteraction.setActive(true);
      this.addInteraction(this.measureInteraction);
    }
  }

  /**
   * Remove Measure Interaction
   */
  removeMeasureInteraction() {
    if (this.measureInteraction) {
      this.measureInteraction.clear();
      this.removeInteraction(this.measureInteraction);
      this.measureInteraction = null;
    }
  }

  /**
   * Remove last point/vertex draw
   */
  removeLastPoint() {
    if (this.drawInteraction) {
      try {
        this.drawInteraction.removeLastPoint();
      } catch (err) {
        console.warn(err)
      }
    }
  }

  stop() {
    this.removeInteraction(this.drawInteraction);
    this.removeMeasureInteraction();
    this.drawInteraction = null;
    this.drawingFeature = null;
    document.removeEventListener('keydown', this._delKeyRemoveLastPoint);
    this._stopPromise.resolve(true);
    return true;
  }

}

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/addparttomultigeometriestask.js@v3.7.1
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/addparttomultigeometriesstep.js@v3.7.1
 */
export class AddPartToMultigeometriesStep extends EditingTask {

  constructor(options = {}) {
    super(options);
    options.task = this;
    return new EditingStep(options);
  }

  run(inputs, context) {
    const d               = $.Deferred();
    const layerId         = inputs.layer.getId();
    const feature         = inputs.features[0];
    const geometry        = feature.getGeometry();
    const originalFeature = feature.clone();

    geometry.setCoordinates([...geometry.getCoordinates(), ...inputs.features[1].getGeometry().getCoordinates()]);

    // evaluated geometry expression
    evaluateExpressionFields({ inputs, context, feature })
      .finally(() => {
        context.session.pushUpdate(layerId, feature, originalFeature);
        inputs.features = [feature];
        d.resolve(inputs);
      });

    return d.promise();
  };

}

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/choosefeaturetask.js@v3.7.1
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/choosefeaturestep.js@v3.7.1
 */
export class ChooseFeatureStep extends EditingTask {

  constructor(options = {}) {
    super(options);
    options.task = this;
    return new EditingStep(options);
  }

  run(inputs) {
    const d = $.Deferred();
    if (1 === inputs.features.length) {
      d.resolve(inputs);
    } else {
      chooseFeatureFromFeatures({ features: inputs.features, inputs })
        .then((feature) => { inputs.features = [feature]; d.resolve(inputs) })
        .catch((err) => { d.reject(err); });
    }
    return d.promise();
  }

  stop() {
    return true;
  }

}

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/confirmtask.js@v3.7.1
 */
const Dialogs = {
  delete: {
    fnc(inputs) {
      const EditingService    = require('../services/editingservice');
      let d                   = $.Deferred();
      const layer             = inputs.layer;
      const editingLayer      = layer.getEditingLayer();
      const feature           = inputs.features[0];
      const layerId           = layer.getId();
      const childRelations    = layer.getChildren();
      const relationinediting = childRelations.length && EditingService._filterRelationsInEditing({
        layerId,
        relations: layer.getRelations().getArray()
      }).length > 0;

      GUI
        .dialog
        .confirm(`<h4>${tPlugin('editing.messages.delete_feature')}</h4>
                  <div style="font-size:1.2em;">${ relationinediting ? tPlugin('editing.messages.delete_feature_relations') : ''}</div>`,
          (result) => {
            if (result) {
              editingLayer.getSource().removeFeature(feature);
              EditingService.removeLayerUniqueFieldValuesFromFeature({
                layerId,
                feature
              });
              d.resolve(inputs);
            } else {
              d.reject(inputs);
            }

          }
        );
      return d.promise();
    }
  },
  commit: {
    fnc(inputs) {
      let d         = $.Deferred();
      let close     = inputs.close;
      const buttons = {
        SAVE: {
          label: t("save"),
          className: "btn-success",
          callback() {
            d.resolve(inputs);
          }
        },
        CANCEL: {
          label: close ? t("exitnosave") : t("annul"),
          className: "btn-danger",
          callback() {
            d.reject();
          }
        }
      };
      if (close) {
        buttons.CLOSEMODAL = {
          label:  t("annul"),
          className: "btn-primary",
          callback() {
            dialog.modal('hide');
          }
        }
      }
      // NOW I HAVE TO IMPLEMENT WHAT HAPPEND ID NO ACTION HAPPEND
      const dialog = GUI.dialog.dialog({
        message: inputs.message,
        title: tPlugin("editing.messages.commit_feature") + " " +inputs.layer.getName() + "?",
        buttons
      });
      return d.promise()
    }
  }
};

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/confirmtask.js@v3.7.1
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/confirmstep.js@v3.7.1
 */
export class ConfirmStep extends EditingTask {

  constructor(options = {}) {
    super(options);

    this._dialog = Dialogs[options.type || "default"];

    options.task = this;
    return new EditingStep(options);
  }

  run(inputs, context) {
    const promise = this._dialog.fnc(inputs, context);
    if (inputs.features) {
      setAndUnsetSelectedFeaturesStyle({ promise, inputs });
    }
    return promise;
  }

  stop() {
    return true;
  }
}

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/copyfeaturesfromotherlayertask.js@v3.7.1
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/copyfeaturesfromotherlayerstep.js@v3.7.1
 */
export class CopyFeaturesFromOtherLayerStep extends EditingTask {

  constructor(options = {}) {
    options.help = "editing.steps.help.draw_new_feature";

    super(options);

    this.openFormTask = options.openFormTask;

    options.task = this;
    return new EditingStep(options);
  }

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
    const features         = getFeaturesFromSelectionFeatures({ layerId, geometryType });
    const selectedFeatures = [];

    /**
     * ORIGINAL SOURCE: g3w-client-plugin-editing/g3w-editing-components/selectcopyotherlayersfeatures.js.js@3.6
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
    const Component      = Vue.extend(CopyFeatureFromOtherLayersComponent);
    const vueInstance    = new Component({layers, selectedFeatures, editAttributes});

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
               * check if layer belong to project or not
               */
              if (this.getEditingService().getProjectLayerById(selectedFeature.__layerId)) {
                promisesFeatures.push(this.getEditingService().getProjectLayerFeatureById({
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
              if (editAttributes.state && this.openFormTask) {
                this.openFormTask.updateMulti(true);
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
  }

  stop() {
    return true;
  }

}

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/copyfeaturesfromotherprojectlayertask.js@v3.7.1
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/copyfeaturesfromotherprojectlayerstep.js@v3.7.1
 */
export class CopyFeaturesFromOtherProjectLayerStep extends EditingTask {

  constructor(options={}) {
    options.help = "editing.steps.help.draw_new_feature";

    super(options);

    this.copyLayer = options.copyLayer;
    this.external  = options.external;
    this.isVector  = options.isVector;

    options.task   = this;
    return new EditingStep(options);
  }

  run(inputs, context) {
    const d                = $.Deferred();
    const {
      features,
      layer:originalLayer
    }                      = inputs;
    const layerId          = originalLayer.getId();
    const attributes       = originalLayer.getEditingFields().filter(attribute => !attribute.pk);
    const session          = context.session;
    const editingLayer     = originalLayer.getEditingLayer();
    const source           = editingLayer.getSource();
    const selectedFeatures = [];

    /**
     * ORIGINAL SOURCE: g3w-client-plugin-editing/g3w-editing-components/selectcopyotherprojectlayerfeatures.js.js@3.6
     */
    const Component        = Vue.extend(CopyFeatureFromOtherProjectLayersComponent);
    const vueInstance      = new Component({
      fields:           this.external                  ? null: CatalogLayersStoresRegistry.getLayerById(this.copyLayer.getId()).getFields(),
      features:         undefined !== features         ? features : [],
      selectedFeatures: undefined !== selectedFeatures ? selectedFeatures : [],
    })

    const message          = vueInstance.$mount().$el;
    const dialog           = GUI.showModalDialog({
      title: tPlugin('editing.modal.tools.copyfeaturefromprojectlayer.title'),
      className: 'modal-left',
      closeButton: false,
      message,
      buttons: {
        cancel: {
          label: 'Cancel',
          className: 'btn-danger',
          callback(){d.reject();}
        },
        ok: {
          label: 'Ok',
          className: 'btn-success',
          callback: async () => {
            const features = [];
            let isThereEmptyFieldRequiredNotDefined = false;
            if (selectedFeatures.length) {
              const selectedFeature = selectedFeatures[0];
              const createFeatureWithPropertiesOfSelectedFeature = properties => {
                attributes.forEach(({name, validate: {required=false}}) => {
                  const value = properties[name] || null;
                  isThereEmptyFieldRequiredNotDefined = isThereEmptyFieldRequiredNotDefined || (value === null && required);
                  selectedFeature.set(name, value);
                });
                const feature = new Feature({
                  feature: selectedFeature,
                  properties: attributes.map(attribute => attribute.name)
                });

                originalLayer
                  .getEditingNotEditableFields()
                  .find(field => {
                    if (originalLayer.isPkField(field)){
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
              };
              // case vector layer
              if (this.isVector) {
                if (this.external) {
                  createFeatureWithPropertiesOfSelectedFeature(selectedFeature.getProperties());
                } else {
                  try {
                    const layerProjectFeature = await this.getEditingService().getProjectLayerFeatureById({
                      layerId: this.copyLayer.getId(),
                      fid: selectedFeature.get(G3W_FID)
                    });
                    if (layerProjectFeature) {
                      createFeatureWithPropertiesOfSelectedFeature(layerProjectFeature.properties);
                    }
                  } catch(err) {
                    console.warn(err);
                  }
                }
              } else {
                //TODO case alphanumeric layer
              }
            }
            if (features.length && features.length === 1) {
              inputs.features.push(features[0]);
            } else {
              if (isThereEmptyFieldRequiredNotDefined) {
                GUI.showUserMessage({
                  type: 'warning',
                  message: 'plugins.editing.messages.copy_and_paste_from_other_layer_mandatory_fields',
                  autoclose: true,
                  duration: 2000
                });
              }
              inputs.features.push(features);
            }
            features.forEach(feature => this.fireEvent('addfeature', feature));
            d.resolve(inputs)
          }
        }
      }
    });
    dialog.find('button.btn-success').prop('disabled', true);
    vueInstance.$watch('selectedFeatures', features => dialog.find('button.btn-success').prop('disabled', features.length === 0));
    return d.promise();
  }

  stop() {
    return true;
  }
}

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/deletefeaturetask.js@v3.7.1
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/deletefeaturestep.js@v3.7.1
 */
export class DeleteFeatureStep extends EditingTask {

  constructor(options = {}) {
    options.help = "editing.steps.help.double_click_delete";

    super(options);

    this.drawInteraction = null;
    this._selectInteraction = null;

    options.task = this;
    return new EditingStep(options);
  }

  /**
   *
   * @param inputs
   * @param context
   * @return {*}
   */
  run(inputs, context) {

    const EditingService  = require('../services/editingservice');
    const RelationService = require('../services/relationservice');

    const d               = $.Deferred();
    const originaLayer    = inputs.layer;
    const layerId         = originaLayer.getId();
    const session         = context.session;
    const feature         = inputs.features[0];

    //get all relations of current editing layer that are in editing
    const relations       = EditingService._filterRelationsInEditing({
      layerId,
      relations: originaLayer.getRelations() ?
        originaLayer.getRelations().getArray() :
        []
    })
      //and filter relations
      .filter(relation => {
        //get relation layer id that are in relation with layerId (current layer in editing)
        const relationLayerId = EditingService._getRelationId({
          layerId,
          relation
        });

        //get relation layer
        const relationLayer = EditingService.getLayerById(relationLayerId);

        //get fields of relation layer that are in relation with layerId
        const { ownField } = EditingService._getRelationFieldsFromRelation({
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
      EditingService.getLayersDependencyFeatures(layerId, {feature, relations}) :
      Promise.resolve();

    //promise return features relations and add to relation layer child
    promise.then(() => {

      //get data features
      const relationsInEditing = EditingService.getRelationsInEditing({
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
  }

  stop() {
    return Promise.resolve(true);
  }

}

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/deletepartfrommultigeometriestask.js@v3.7.1
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/deletepartfrommultigeometriesstep.js@v3.7.1
 */
export class DeletePartFromMultigeometriesStep extends EditingTask {

  constructor(options = {}) {

    super(options);
    this.pickFeatureInteraction = null;
    options.task = this;
    return new EditingStep(options);
  }

  run(inputs, context) {
    const d               = $.Deferred();
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
    return d.promise()
  }

}

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/getvertextask.js@v3.7.1
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/getvertexstep.js@v3.7.1
 */
export class GetVertexStep extends EditingTask {

  constructor(options = {}) {
    options.help = "editing.steps.help.select";

    super(options);

    this._drawInteraction;
    this._snapIteraction;

    /** @since g3w-client-plugin-editing@v3.8.0 */
    this._stopPromise;

    options.task = this;
    const step = new EditingStep(options);

    if (options.steps) {
      this.setSteps(options.steps);
    }

    return step;
  }

  run(inputs) {
    const d          = $.Deferred();
    const {features} = inputs;

    if (!features.length) {
      return;
    }

    this._stopPromise = $.Deferred();

    /** @since g3w-client-plugin-editing@v3.8.0 */
    setAndUnsetSelectedFeaturesStyle({ promise: this._stopPromise, inputs });

    this._snapIteraction = new ol.interaction.Snap({
      features: new ol.Collection(features),
      edge: false
    });
    this._drawIteraction = new ol.interaction.Draw({
      type: 'Point',
      condition: evt => {
        const coordinates = evt.coordinate;
        return !!features.find(feature => areCoordinatesEqual({feature, coordinates}));
      }
    });
    this._drawIteraction.on('drawend', (evt) => {
      inputs.coordinates = evt.feature.getGeometry().getCoordinates();
      this.setUserMessageStepDone('from');
      d.resolve(inputs);
    });
  
    this.addInteraction(this._drawIteraction);
    this.addInteraction(this._snapIteraction);
  
    return d.promise();
  }
  
  stop() {
    this.removeInteraction(this._drawIteraction);
    this.removeInteraction(this._snapIteraction);
    this._snapIteraction = null;
    this._drawIteraction = null;
    /** @since g3w-client-plugin-editing@v3.8.0 */
    this._stopPromise.resolve(true);
  }

}

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/linkrelationtask.js@v3.7.1
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/linkrelationstep.js@v3.7.1
 */
export class LinkRelationStep extends EditingTask {

  constructor(options = {}) {
    options.help = "editing.steps.help.select_feature_to_relation";

    super(options);

    options.task = this;
    return new EditingStep(options);
  }

  run(inputs, context) {
    GUI.setModal(false);
    const d                   = $.Deferred();
    const editingLayer        = inputs.layer.getEditingLayer();
    this._originalLayerStyle  = editingLayer.getStyle();
    const beforeRun           = context.beforeRun;
    const promise             = beforeRun && typeof beforeRun === 'function' ? beforeRun() : Promise.resolve();

    const { excludeFeatures } = context;

    const style               = context.style;

    this._features            = editingLayer.getSource().getFeatures();

    if (excludeFeatures) {
      this._features = this._features
        .filter(feature => Object
          .entries(excludeFeatures)
          .reduce((bool, [field, value]) => bool && feature.get(field) != value, true)
        )
    }

    if (style) {
      this._features.forEach(feature => feature.setStyle(style));
    }
    promise
      .then(() => {
        this.pickFeatureInteraction = new PickFeatureInteraction({
          layers: [editingLayer],
          features: this._features
        });
        this.addInteraction(this.pickFeatureInteraction);
        this.pickFeatureInteraction.on('picked', evt => {
          const relation = evt.feature;
          inputs.features.push(relation);
          GUI.setModal(true);
          d.resolve(inputs);
        });
      })
      .catch(err => d.reject(err));
    return d.promise()
  }

  stop() {
    GUI.setModal(true);
    this.removeInteraction(this.pickFeatureInteraction);
    this._features.forEach(feature => feature.setStyle(this._originalLayerStyle));
    this.pickFeatureInteraction = null;
    this._features = null;
    this._originalLayerStyle = null;
    return true;
  }
}

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/mergefeaturestask.js@v3.7.1
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/mergefeaturesstep.js@v3.7.1
 */
export class MergeFeaturesStep extends EditingTask {

  constructor(options = {}) {
    options.help = "editing.steps.help.merge";

    super(options);

    options.task = this;
    const step = new EditingStep(options);

    if (options.steps) {
      this.setSteps(options.steps);
    }

    return step;
  }

  run(inputs, context) {
    const d            = $.Deferred();
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
    return d.promise();
  }

  stop() {
    this.removeInteraction(this._pickInteraction);
  }

}

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/modifygeometryvertexTask.js@v3.7.1
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/modifygeometryvertexstep.js@v3.7.1
 */
export class ModifyGeometryVertexStep extends EditingTask {

  constructor(options = {}) {
    options.snap = undefined !== options.snap ? options.snap : true;
    options.help = "editing.steps.help.edit_feature_vertex";

    super(options);

    this.drawInteraction  = null;

    this._originalStyle   = null;

    this._feature         = null;

    this._deleteCondition = options.deleteCondition;

    this.tooltip;

    options.task = this;

    return new EditingStep(options);
  }

  run(inputs, context) {
    let newFeature, originalFeature;
    const d             = $.Deferred();
    const originalLayer = inputs.layer;
    const editingLayer  = originalLayer.getEditingLayer() ;
    const session       = context.session;
    const layerId       = originalLayer.getId();
    const feature       = this._feature = inputs.features[0];
    this._originalStyle = editingLayer.getStyle();

    this.deleteVertexKey;
    const style = function() {
      const image = new ol.style.Circle({
        radius: 5,
        fill: null,
        stroke: new ol.style.Stroke({color: 'orange', width: 2})
      });
      return [
        new ol.style.Style({
          image,
          geometry(feature) {
            const coordinates = feature.getGeometry().getCoordinates()[0];
            return new ol.geom.MultiPoint(coordinates);
          }
        }),
        new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: 'yellow',
            width: 4
          })
        })
      ];
    };
    feature.setStyle(style);
    const features = new ol.Collection(inputs.features);
    this._modifyInteraction = new ol.interaction.Modify({
      features,
      deleteCondition: this._deleteCondition
    });
    this._modifyInteraction.on('modifystart', evt => {
      const feature = evt.features.getArray()[0];
      originalFeature = feature.clone();
    });
    this.addInteraction(this._modifyInteraction);
    this._modifyInteraction.on('modifyend', evt => {
      const feature = evt.features.getArray()[0];
      if (feature.getGeometry().getExtent() !== originalFeature.getGeometry().getExtent()) {
        /*
        * evaluate expression geometry check
        */
        evaluateExpressionFields({
          inputs,
          context,
          feature
        }).finally(()=>{
          newFeature = feature.clone();
          session.pushUpdate(layerId, newFeature, originalFeature);
          inputs.features.push(newFeature);
          d.resolve(inputs);
        });
        /**
         *
         * end of evaluate
         */
      }
    });
    return d.promise();
  }

  addMeasureInteraction() {
    const map = this.getMap();
    this._modifyInteraction.on('modifystart', evt => {
      const feature = evt.features.getArray()[0];
      this.tooltip = createMeasureTooltip({
        map,
        feature
      });
    });
  }

  removeMeasureInteraction() {
    const map = this.getMap();
    this.tooltip && removeMeasureTooltip({
      map,
      ...this.tooltip
    });
    this.tooltip = null;
  }


  stop() {
    this._feature.setStyle(this._originalStyle);
    this.removeInteraction(this._modifyInteraction);
    return true;
  }

}

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/moveelementstask.js@v3.7.1
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/movelementsstep.js@v3.7.1
 */
export class MoveElementsStep extends EditingTask {

  constructor(options = {}) {
    options.help = "editing.steps.help.select_vertex_to_paste";

    super(options);

    options.task = this;
    const step = new EditingStep(options);

    if (options.steps) {
      this.setSteps(options.steps);
    }

    return step;
  }

  /**
   * @param { Object } delta
   * @param delta.x
   * @param delta.y
   * @param delta.coordinates
   * 
   * @returns {{ x: number, y: number }}
   */
  getDeltaXY({x, y, coordinates} = {}) {
    const getCoordinates = (coordinates) => {
      if (Array.isArray(coordinates[0])) {
        return getCoordinates(coordinates[0])
      } else {
        return {
          x: coordinates[0],
          y: coordinates[1]
        };
      }
    };
    const xy = getCoordinates(coordinates);
    return {
      x: x - xy.x,
      y: y - xy.y
    }
  }

  /**
   * @param inputs
   * @param context
   * 
   * @returns jQuery Promise
   */
  run(inputs, context) {
    const d       = $.Deferred();
    const {
      layer,
      features,
      coordinates
    }             = inputs;
    const source  = layer.getEditingLayer().getSource();
    const layerId = layer.getId();
    const session = context.session;

    /** @since g3w-client-plugin-editing@v3.8.0 */
    setAndUnsetSelectedFeaturesStyle({ promise: d, inputs });

    this._snapIteraction = new ol.interaction.Snap({source, edge: false});

    this._drawInteraction = new ol.interaction.Draw({type: 'Point', features: new ol.Collection(),});

    this._drawInteraction.on('drawend', evt => {
      const [x, y]                    = evt.feature.getGeometry().getCoordinates();
      const deltaXY                   = coordinates ? this.getDeltaXY({x, y, coordinates}) : null;
      const featuresLength            = features.length;
      const promisesDefaultEvaluation = [];

      for (let i = 0; i < featuresLength; i++) {
        const feature = cloneFeature(features[i], layer);
        if (deltaXY) {
          feature.getGeometry().translate(deltaXY.x, deltaXY.y);
        }
        else {
          const coordinates = feature.getGeometry().getCoordinates();
          const deltaXY = this.getDeltaXY({
            x, y, coordinates
          });
          feature.getGeometry().translate(deltaXY.x, deltaXY.y)
        }
        setNullMediaFields({ feature, layer });
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
    return d.promise();
  }

  stop() {
    this.removeInteraction(this._drawInteraction);
    this.removeInteraction(this._snapIteraction);
    this._drawInteraction = null;
    this._snapIteraction = null;
    return true;
  }

}

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/movefeaturetask.js@v3.7.1
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/movefeaturestep.js@v3.7.1
 */
export class MoveFeatureStep extends EditingTask {

  constructor(options = {}) {
    options.help = "editing.steps.help.move";

    super(options);

    this.drawInteraction = null;
    this.promise; // need to be set here in case of picked features

    options.task = this;
    return new EditingStep(options);
  }

  run(inputs, context) {
    /** Need two different promise: One for stop() method and clean selected feature,
     * and other one for run task. If we use the same promise, when stop task without move feature,
     * this.promise.resolve(), it fires also thenable method listen resolve promise of run task,
     * that call stop task method.*/
    this.promise         = $.Deferred();
    const d              = $.Deferred();
    const originalLayer  = inputs.layer;
    const session        = context.session;
    const layerId        = originalLayer.getId();
    const features       = new ol.Collection(inputs.features);
    let originalFeature  = null;
    this.changeKey       = null; //
    let isGeometryChange = false; // changed if geometry is changed

    setAndUnsetSelectedFeaturesStyle({ promise: this.promise, inputs });

    this._translateInteraction = new ol.interaction.Translate({
      features,
      hitTolerance: (isMobile && isMobile.any) ? 10 : 0
    });

    this.addInteraction(this._translateInteraction);

    this._translateInteraction.on('translatestart', evt => {
      const feature = evt.features.getArray()[0];
      this.changeKey = feature.once('change', () => isGeometryChange = true);
      originalFeature = feature.clone();
    });

    this._translateInteraction.on('translateend', evt => {
      ol.Observable.unByKey(this.changeKey);
      const feature = evt.features.getArray()[0];
      if (isGeometryChange) {
        // evaluated geometry expression
        evaluateExpressionFields({ inputs, context, feature })
        .finally(() => {
          const newFeature = feature.clone();
          session.pushUpdate(layerId, newFeature, originalFeature);
          d.resolve(inputs);
        });
      } else {
        d.resolve(inputs);
      }
    });

    return d.promise()
  }

  stop() {
    this.promise.resolve();
    this.removeInteraction(this._translateInteraction);
    this._translateInteraction = null;
    this.changeKey = null;
  }
}

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/openformtask.js@v3.7.1
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/openformstep.js@v3.7.1
 */
export class OpenFormStep extends EditingTask {

  constructor(options = {}) {

    options.help = "editing.steps.help.insert_attributes_feature";

    const {
      push    = false,
      saveAll = true,
      multi   = false,
      showgoback,
    } = options;

    super(options);

    /**
     * Used to force show back button
     * @since v3.7
     * @type {boolean}
     */
    this.showgoback = showgoback;
    /**
     * @since v3.7
     * to force to push content on top without clear previous content
     */
    this.push = push;

    /**
     * Show saveAll button
     * @since v3.7
     */
    this._saveAll = saveAll;

    /**
     * Whether it can handle multi edit features
     */
    this._multi = multi;

    /**
     * @FIXME add description
     */
    this._edit_relations = undefined === options.edit_relations || options._edit_relations;

    /**
     * @FIXME add description
     */
    this._formIdPrefix = 'form_';

    /**
     * @FIXME set a default value + add description
     */
    this.layerId;

    /**
     * @FIXME add description
     */
    this._isContentChild = false;

    /**
     * @FIXME set a default value + add description
     */
    this._features;

    /**
     * @FIXME set a default value + add description
     */
    this._originalLayer;

    /**
     * @FIXME set a default value + add description
     */
    this._editingLayer;

    /**
     * @FIXME set a default value + add description
     */
    this._layerName;

    /**
     * @FIXME set a default value + add description
     */
    this._originalFeatures;

    /**
     * @FIXME set a default value + add description
     */
    this._fields;

    /**
     * @FIXME set a default value + add description
     */
    this._session;

    /**
     * @FIXME set a default value + add description
     */
    this._editorFormStructure;

    /**
     * @FIXME set a default value + add description
     */
    this.promise;


    /**
     * @since g3w-client-plugin-editing@v3.7.0
     */
    this._unwatchs = [];

    options.task = this;
    return new EditingStep(options);
  }

  /**
   * @since v3.7
   * @param bool
   */
  updateMulti(bool=false) {
    this._multi = bool;
  }

  /**
   * @param inputs
   * @param context
   * 
   * @returns {Promise<*>}
   * 
   * @private
   */
  async _getForm(inputs, context) {
    this._session          = context.session;
    this._originalLayer    = inputs.layer;
    this._editingLayer     = this._originalLayer.getEditingLayer();
    this._layerName        = this._originalLayer.getName();
    this._features         = this._multi ? inputs.features : [inputs.features[inputs.features.length - 1]];
    this._originalFeatures = this._features.map(feature => feature.clone());
    const feature          = this._features[0];
    /**
     * In case of create a child relation feature set a father relation field value
     */
    if (this._isContentChild) {
      //Are array
      const {fatherValue=[], fatherField=[]} = context;
      fatherField.forEach((fField, index) => {
        feature.set(fField, fatherValue[index]);
        this._originalFeatures[0].set(fField, fatherValue[index]);
      })
    }

    this._fields = await getFormFields({ inputs, context, feature, isChild: this._isContentChild });
    // in case of multi editing set all field to null //
    this._fields = this._multi
      ? this._fields
          .map(field => {
            const _field = JSON.parse(JSON.stringify(field));
            _field.value = null;
            _field.forceNull = true;
            _field.validate.required = false;
            return _field;
          })
          .filter(field => !field.pk)
      : this._fields;

    if (this._originalLayer.hasFormStructure()) {
      const editorFormStructure = this._originalLayer.getEditorFormStructure();
      this._editorFormStructure = editorFormStructure.length ? editorFormStructure : null;
    }

    return GUI.showContentFactory('form');
  }

  /**
   * @param fields
   * @param fields Array of fields
   * 
   * @returns {Promise<unknown>}
   */
  saveAll(fields) {
    return new Promise(async (resolve, reject) => {
      const {session} = this.getContext();
      const inputs    = this.getInputs();
      fields = this._multi ? fields.filter(field => field.value !== null) : fields;

      if (fields.length) {
        await WorkflowsStack.getCurrent().getContextService().saveDefaultExpressionFieldsNotDependencies();
        const newFeatures = [];
        this._features
          .forEach(feature => {
            this._originalLayer.setFieldsWithValues(feature, fields);
            newFeatures.push(feature.clone());
          });

        if (this._isContentChild) {
          inputs.relationFeatures = { newFeatures, originalFeatures: this._originalFeatures };
        }

        this.fireEvent('saveform', {
          newFeatures,
          originalFeatures: this._originalFeatures
        }).then(() => {
          newFeatures
            .forEach((newFeature, index) => {
              session.pushUpdate(this.layerId, newFeature, this._originalFeatures[index]);
            });

          //check and handle if layer has relation 1:1
          handleRelation1_1LayerFields({
            layerId: this.layerId,
            features: newFeatures,
            fields,
            task: this,
          }).then(() => {
            this.fireEvent('savedfeature', newFeatures); // called after saved
            this.fireEvent(`savedfeature_${this.layerId}`, newFeatures); // called after saved using layerId
            session.save();
            resolve({ promise: this.promise });
          })
        })
      }
    })
  }

  /**
   * @param fields
   * @param promise
   * @param session
   * @param inputs
   * 
   * @returns {Promise<void>}
   * 
   * @private
   */
  async _saveFeatures({fields, promise, session, inputs}) {
    fields = this._multi ? fields.filter(field => field.value !== null) : fields;
    if (fields.length) {
      const newFeatures = [];

      // @since 3.5.15
      GUI.setLoadingContent(true);
      GUI.disableContent(true);

      await WorkflowsStack.getCurrent().getContextService().saveDefaultExpressionFieldsNotDependencies();

      GUI.setLoadingContent(false);
      GUI.disableContent(false);

      this._features.forEach(feature => {
        this._originalLayer.setFieldsWithValues(feature, fields);
        newFeatures.push(feature.clone());
      });
      if (this._isContentChild) {
        inputs.relationFeatures = {
          newFeatures,
          originalFeatures: this._originalFeatures
        };
      }
      this.fireEvent('saveform', {
        newFeatures,
        originalFeatures: this._originalFeatures
      }).then(() => {
        newFeatures
          .forEach((newFeature, index) => session.pushUpdate(this.layerId, newFeature, this._originalFeatures[index]));

        //check and handle if layer has relation 1:1
        //async
        handleRelation1_1LayerFields({
          layerId: this.layerId,
          features: newFeatures,
          fields,
          task: this,
        }).then(() => {
          GUI.setModal(false);
          this.fireEvent('savedfeature', newFeatures); // called after saved
          this.fireEvent(`savedfeature_${this.layerId}`, newFeatures); // called after saved using layerId
          // In case of save of child it means that child is updated so also parent
          if (this._isContentChild) {
            WorkflowsStack
              .getParents()
              .forEach(workflow => workflow.getContextService().setUpdate(true, {force: true}));
          }
          promise.resolve(inputs);
        })
      })
    } else {

      GUI.setModal(false);

      promise.resolve(inputs);
    }
  }

  /**
   * Build form
   * 
   * @param options
   * 
   * @returns {Promise<void>}
   */
  async startForm(options = {}) {
    this.getEditingService().setCurrentLayout();
    const {
      inputs,
      context,
      promise
    }                   = options;
    const { session }   = context;
    const formComponent = options.formComponent || EditingFormComponent;
    const Form          = await this._getForm(inputs, context);
    const feature       = this._originalFeatures[0];

    /**
     * set fields. Useful getParentFormData
     */
    WorkflowsStack
      .getCurrent()
      .setInput({key: 'fields', value: this._fields});

    const formService = Form({
      formComponent,
      title: "plugins.editing.editing_attributes",
      name: this._layerName,
      crumb: {title: this._layerName},
      id: this._generateFormId(this._layerName),
      dataid: this._layerName,
      layer: this._originalLayer,
      isnew: this._originalFeatures.length > 1 ? false : feature.isNew(), // specify if is a new feature
      feature,
      parentData: getParentFormData(),
      fields: this._fields,
      context_inputs: !this._multi && this._edit_relations && {context, inputs},
      formStructure: this._editorFormStructure,
      modal: true,
      push: this.push || this._isContentChild, //@since v3.7 need to take in account this.push value
      showgoback: undefined !== this.showgoback ? this.showgoback : !this._isContentChild,
      headerComponent: this._saveAll && SaveAll,
      buttons: [
        {
          id: 'save',
          title: this._isContentChild ?
            (
              //check if parent has custom back label set
              WorkflowsStack.getParent().getBackButtonLabel() ||
              "plugins.editing.form.buttons.save_and_back"
            ) :
            "plugins.editing.form.buttons.save",
          type: "save",
          class: "btn-success",
          cbk: (fields) => {
            this._saveFeatures({ fields, promise, inputs, session: context.session });
          } 
        },
        {
          id: 'cancel',
          title: "plugins.editing.form.buttons.cancel",
          type: "cancel",
          class: "btn-danger",
          /// buttons in case of change
          eventButtons: {
            update: {
              false : {
                id: 'close',
                title: "close",
                type: "cancel",
                class: "btn-danger",
              }
            }
          },
          cbk: () => {
            if (!this._isContentChild){
              GUI.setModal(false);
              this.fireEvent('cancelform', inputs.features); // fire event cancel form to emit to subscrivers
            }
            promise.reject(inputs);
          }
        }
      ]
    });
    //fire openform event
    this.fireEvent('openform',
      {
        layerId:this.layerId,
        session,
        feature: this._originalFeature,
        formService
      }
    );

    const currentWorkflow = WorkflowsStack.getCurrent();
    // in case of called single task no workflow is set
    if (currentWorkflow) {
      //set context service to form Service
      currentWorkflow.setContextService(formService);
    }

    //listen eventually field relation 1:1 changes value
    this._unwatchs = await listenRelation1_1FieldChange({
      layerId: this.layerId,
      fields: this._fields,
    })
  }

  /**
   * @param inputs
   * @param context
   * 
   * @returns {*}
   */
  run(inputs, context) {
    const d              = $.Deferred();
    const {
      layer,
      features
    } = inputs;

    this.promise         = d;
    this._isContentChild = WorkflowsStack.getLength() > 1;
    this.layerId         = layer.getId();

    GUI.setLoadingContent(false);

    this.getEditingService().disableMapControlsConflict(true);

    setAndUnsetSelectedFeaturesStyle({ promise: d, inputs });

    if (!this._multi && Array.isArray(features[features.length -1])) {
      d.resolve();
    } else {
      this.startForm({
        inputs,
        context,
        promise: d
      });
      this.disableSidebar(true);
    }

    return d.promise();
  }

  /**
   * @param layerName
   * @returns {string}
   * 
   * @private
   */
  _generateFormId(layerName) {
    return this._formIdPrefix + layerName;
  }

  /**
   *
   */
  stop() {
    this.disableSidebar(false);

    const service = this.getEditingService();
    let contextService;

    // when the last feature of features is Array
    // and is resolved without setting form service
    // Ex. copy multiple feature from other layer
    if (
      false === this._isContentChild || // no child workflow
      (
        //case edit feature of a table (edit layer alphanumeric)
        2 === WorkflowsStack.getLength() && //open features table
        WorkflowsStack.getParent().isType('edittable')
      )
    ) {
      service.disableMapControlsConflict(false);
      contextService = WorkflowsStack.getCurrent().getContextService();
    }

    // force update parent form update
    if (contextService && false === this._isContentChild) {
      contextService.setUpdate(false, { force: false });
    }

    GUI.closeForm({ pop: this.push || this._isContentChild });

    service.resetCurrentLayout();

    this.fireEvent('closeform');
    this.fireEvent(`closeform_${this.layerId}`); // need to check layerId

    this.layerId = null;
    this.promise = null;
    // class unwatch
    this._unwatchs.forEach(unwatch => unwatch());
    //reset to Empty Array
    this._unwatchs = [];
  }

}

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/opentabletask.js@v3.7.1
 */
const InternalComponent = Vue.extend(TableVueObject);
const TableComponent = function(options={}) {
  const TableService = require('../services/tableservice');
  g3wsdk.core.utils.base(this);
  const service = options.service || new TableService({ ...options });
  this.setService(service);
  const internalComponent = new InternalComponent({ service });
  this.setInternalComponent(internalComponent);
  internalComponent.state = service.state;
  service.once('ready', () => this.emit('ready'));
  this.unmount = function() {
    service.cancel();
    return g3wsdk.core.utils.base(this, 'unmount');
  };
};
g3wsdk.core.utils.inherit(TableComponent, Component);

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/opentabletask.js@v3.7.1
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/opentablestep.js@v3.7.1
 */
export class OpenTableStep extends EditingTask {

  constructor(options = {}) {
    options.help = "editing.steps.help.edit_table";

    super(options);

    this._formIdPrefix = 'form_';

    options.task = this;
    return new EditingStep(options);
  }

  /**
   * @param inputs
   * @param context
   * 
   * @returns {*}
   */
  run(inputs, context) {
    //set current plugin layout (right content)
    this.getEditingService().setCurrentLayout();

    const d              = $.Deferred();
    const originalLayer  = inputs.layer;
    const layerName      = originalLayer.getName();
    const headers        = originalLayer.getEditingFields();
    this._isContentChild = WorkflowsStack.getLength() > 1;
    const foreignKey     = this._isContentChild && context.excludeFields ? context.excludeFields[0] :  null;
    const exclude        = this._isContentChild && context.exclude;
    const capabilities   = originalLayer.getEditingCapabilities();
    const editingLayer   = originalLayer.getEditingLayer();
    //get editing features
    let features         = editingLayer.readEditingFeatures();

    if (exclude && features.length > 0) {
      const {value} = exclude;
      features = features.filter(feature => feature.get(foreignKey) != value);
    }

    const content = new TableComponent({
      title: `${layerName}`,
      features,
      promise: d,
      push: this._isContentChild,
      headers,
      context,
      inputs,
      capabilities,
      fatherValue: context.fatherValue,
      foreignKey
    });

    GUI.disableSideBar(true);

    GUI.showUserMessage({
      type: 'loading',
      message: 'plugins.editing.messages.loading_table_data',
      autoclose: false,
      closable: false
    });

    setTimeout(() => {
      content.once('ready', () => setTimeout(()=> {
        GUI.closeUserMessage();
      }));

      GUI.showContent({
        content,
        //perc: 100,
        push: this._isContentChild,
        showgoback: false,
        closable: false
      });
    }, 300);

    return d.promise();
  }

  /**
   *
   */
  stop() {
    this.disableSidebar(false);
    GUI[this._isContentChild ? 'popContent' : 'closeContent']();
    //reset current plugin layout (right content) to application
    this.getEditingService().resetCurrentLayout();
  }

}

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/pickfeaturetask.js@v3.7.1
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/pickfeaturestep.js@v3.7.1
 */
export class PickFeatureStep extends EditingTask {

  constructor(options = {}) {
    options.help = "editing.steps.help.pick_feature";

    super(options);

    this._options = {
      highlight: options.highlight || false,
      multi: options.multi || false
    };

    this.pickFeatureInteraction = null;

    this._busy = false;

    this._tools = options.tools || [];

    options.task = this;

    const step = new EditingStep(options);

    if (options.steps) {
      this.setSteps(options.steps);
    }

    return step;
  }

  run(inputs, context) {
    const d                     = $.Deferred();
    const editingLayer          = inputs.layer.getEditingLayer();

    this.pickFeatureInteraction = new PickFeaturesInteraction({
      layer: editingLayer,
    });

    this.addInteraction(this.pickFeatureInteraction);

    this.pickFeatureInteraction.on('picked', evt => {
      const {features, coordinate} = evt;
      if (inputs.features.length === 0) {
        inputs.features = features;
        inputs.coordinate = coordinate;
      }
      setAndUnsetSelectedFeaturesStyle({ promise: d, inputs });

      if (this._steps) {
        this.setUserMessageStepDone('select');
      }

      d.resolve(inputs);
    });

    return d.promise()
  }

  stop() {
    this.removeInteraction(this.pickFeatureInteraction);
    this.pickFeatureInteraction = null;
    return true;
  }

}

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/pickprojectlayerfeaturestask.js@v3.7.1
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/pickprojectlayerfeaturesstep.js@v3.7.1
 */
export class PickProjectLayerFeaturesStep extends EditingTask {

  constructor(options = {}) {
    options.help = "editing.steps.help.pick_feature";

    super(options);

    this.copyLayer       = options.copyLayer;
    this.external        = options.external;
    this.isVector        = options.isVector;
    this.pickInteraction = null;

    options.task = this;

    return new EditingStep(options);
  }

  run(inputs, context) {
    const d = $.Deferred();
    if (this.copyLayer) {
      this.getFeaturesFromLayer({
        inputs,
        promise: d
      })
    } else {
      //TO DO  Create a component that ask which project layer would like to query
    }
    return d.promise()
  }

  /**
   *
   * @param inputs
   * @param promise
   * @return {Promise<void>}
   */
  async getFeaturesFromLayer({
    inputs,
    promise
  }={}) {
    let features             = [];
    const geometryType       = inputs.layer.getGeometryType();
    const interactionPromise = new Promise(async (resolve, reject) => {
      if (this.isVector) {
        //In case of external layer
        if (this.external) {
          this.pickInteraction = new PickFeaturesInteraction({
            layer: this.copyLayer
          });
          this.addInteraction(this.pickInteraction);
          this.pickInteraction.on('picked', evt => {
            const {features:_features} = evt;
            features = convertFeaturesGeometryToGeometryTypeOfLayer({ features: _features, geometryType });
            resolve();
          });
        } else {   //In case of TOC/PROJECT layer
          this.pickInteraction = new PickCoordinatesInteraction();
          this.addInteraction(this.pickInteraction);
          const project = ProjectsRegistry.getCurrentProject();
          this.pickInteraction.once('picked', async evt => {
            const coordinates = evt.coordinate;
            try {
              const {data=[]} = await DataRouterService.getData('query:coordinates', {
                inputs: {
                  coordinates,
                  query_point_tolerance: project.getQueryPointTolerance(),
                  layerIds: [this.copyLayer.getId()],
                  multilayers: false
                },
                outputs: null
              });
              if (data.length) {
                features = convertFeaturesGeometryToGeometryTypeOfLayer({ features: data[0].features, geometryType });
              }
            } catch(error) {
              console.warn(error);
              promise.reject(error);
            } finally {
              resolve();
            }
          })
        }
      } else {
        //TO DO NO VECTOR LAYER
      }
    });
    await interactionPromise;
    if (features.length) {
      inputs.features = features;
      promise.resolve(inputs);
    } else {
      GUI.showUserMessage({
        type: 'warning',
        message: 'plugins.editing.messages.no_feature_selected',
        closable: false,
        autoclose: true
      });
      promise.reject();
    }
  };

  stop() {
    this.removeInteraction(this.pickInteraction);
    this.pickInteraction = null;
    return true;
  }

}

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/selectelementstask.js@v3.7.1
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/selectelementsstep.js@v3.7.1
 */
export class SelectElementsStep extends EditingTask {
  
  constructor(options = {}, chain) {
    options.help = options.help || "editing.steps.help.select_elements";

    super(options);

    this._type = options.type || 'bbox'; // 'single' 'bbox' 'multiple'
    this._selectInteractions    = [];
    this.multipleselectfeatures = [];
    this._originalStyle;
    this._vectorLayer;

    options.task = this;

    const step = new EditingStep(options);

    if (chain) {
      step.on('run', () => { step.emit('next-step', g3wsdk.core.i18n.tPlugin("editing.steps.help.select_elements")) });
    }

    if (options.steps) {
      this.setSteps(options.steps);
    }

    return step;
  }

  /**
   *
   * @param layer
   * @param inputs
   * @param promise
   * @param buttonnext
   */
  addSingleSelectInteraction({
    layer,
    inputs,
    promise,
    buttonnext=false
  }= {}) {

    const singleInteraction = new PickFeaturesInteraction({
      layer: layer.getEditingLayer()
    });

    singleInteraction.on('picked', async ({features}) => {
      let feature;
      if (features.length > 1) {
        try {
          feature = await chooseFeatureFromFeatures({ features, inputs: this.getInputs() });
        } catch(err) {
          console.warn(err);
        }
      } else {
        feature = features[0];
      }
      if (feature) {
        const features  = [feature];
        inputs.features = features;

        if (buttonnext) {
          this.addRemoveToMultipleSelectFeatures([feature], inputs);
        } else {
          this._originalStyle = setFeaturesSelectedStyle(features);
          this._steps && this.setUserMessageStepDone('select');
          promise.resolve(inputs);
        }
      }
    });
    this._selectInteractions.push(singleInteraction);
    this.addInteraction(singleInteraction);
  }

  /**
   * Pick to add feature from external layer added to map
   * @param layer
   * @param inputs
   * @param promise
   * @param buttonnext
   */
  addExternalSelectInteraction({layer, inputs, context, promise, buttonnext=false}= {}) {
    const layerGeometryType = layer.getGeometryType();
    const layerId           = layer.getId();
    const source            = layer.getEditingLayer().getSource();
    const {session}         = this.getContext();
    // filter external layer only vector - Exclude WMS
    const layers = this.getMapService()
      .getExternalLayers()
      .filter(externaLayer => {
        let sameBaseGeometry = true;
        const type = externaLayer.getType();
        if ('VECTOR' == type) {
          const features = externaLayer.getSource().getFeatures();
          if (features.length > 0) {
            const feature = features[0];
            const geometryType = feature.getGeometry().getType();
            sameBaseGeometry = isSameBaseGeometryType(geometryType, layerGeometryType)
          }
        }
        return sameBaseGeometry;
      });

    const singleInteraction = new PickFeaturesInteraction({ layers });

    singleInteraction.on('picked', evt => {
      if (evt.features.length > 0) {
        const attributes = layer.getEditingFields();
        const geometry = evt.features[0].getGeometry();
        if (geometry.getType() !== layerGeometryType) {
          evt.feature.setGeometry(convertSingleMultiGeometry(geometry, layerGeometryType));
        }
        const feature = new Feature({
          feature: evt.feature,
          properties: attributes.map(attribute => {
            //set media attribute to null or attribute belong to layer but not present o feature copied
            if (
              attribute.input.type === 'media'
              || undefined === evt.feature.get(attribute.name)
              || attribute.pk
            ) {
              evt.feature.set(attribute.name, null);
            }
            return attribute.name
          })
        });

        // evaluate Geometry Expression
        evaluateExpressionFields({ inputs, context, feature })
          .finally(() => {
            //remove eventually Z Values
            removeZValueToOLFeatureGeometry({ feature });

            feature.setTemporaryId();
            source.addFeature(feature);
            session.pushAdd(layerId, feature, false);
            inputs.features.push(feature);
            promise.resolve(inputs);
          })

      } else {
        promise.reject();
      }
    });
    this._selectInteractions.push(singleInteraction);
    this.addInteraction(singleInteraction);
  }

  /**
   *
   * @param features
   * @param inputs
   */
  addRemoveToMultipleSelectFeatures(features=[], inputs) {
    features
      .forEach(feature => {
        const selIndex = this.multipleselectfeatures.indexOf(feature);
        if (selIndex < 0) {
          this._originalStyle = setFeaturesSelectedStyle([feature]);
          this.multipleselectfeatures.push(feature);
        } else {
          this.multipleselectfeatures.splice(selIndex, 1);
          feature.setStyle(this._originalStyle);
        }
        inputs.features = this.multipleselectfeatures;
      });

    this._steps.select.buttonnext.disabled = this._steps.select.buttonnext.condition
      ? this._steps.select.buttonnext.condition({features:this.multipleselectfeatures})
      : this.multipleselectfeatures.length === 0;

    if (this._steps.select.dynamic !== undefined) {
      this._steps.select.dynamic = this.multipleselectfeatures.length;
    }
  }

  /**
   * Multiple interaction for select features
   * @param layer
   * @param inputs
   * @param promise
   * @param buttonnext
   */
  addMultipleSelectInteraction({
    layer,
    inputs,
    promise,
    buttonnext=false
  }={}) {

    let selectInteractionMultiple;
    if (ApplicationState.ismobile) {
      const geometryFunction = ol.interaction.Draw.createBox();
      const source = new ol.source.Vector({});
      this._vectorLayer = new ol.layer.Vector({
        source
      });
      
      this.getMap().addLayer(this._vectorLayer);

      selectInteractionMultiple = new ol.interaction.Draw({
        type: 'Circle',
        source,
        geometryFunction
      });

      selectInteractionMultiple.on('drawend', evt => {
        const feature = evt.feature;
        const bboxExtent = feature.getGeometry().getExtent();
        const layerSource = layer.getEditingLayer().getSource();
        const features = layerSource.getFeaturesInExtent(bboxExtent);
        if (buttonnext) {
          this.addRemoveToMultipleSelectFeatures(features, inputs);
        } else {
          if (features.length > 0) {
            inputs.features = features;
            this._originalStyle = setFeaturesSelectedStyle(features);
            if (this._steps) {
              this.setUserMessageStepDone('select');
            }
            setTimeout(() => promise.resolve(inputs), 500);
          } else {
            promise.reject();
          }
        }
      });
    } else {
      selectInteractionMultiple = new ol.interaction.DragBox({
        condition: ol.events.condition.shiftKeyOnly
      });

      selectInteractionMultiple.on('boxend', evt => {
        const features = [];
        const extent = selectInteractionMultiple.getGeometry().getExtent();
        const layerSource = layer.getEditingLayer().getSource();

        layerSource
          .forEachFeatureIntersectingExtent(extent, feature => features.push(feature));

        if (buttonnext) {
          this.addRemoveToMultipleSelectFeatures(features, inputs);
        } else {
          if (features.length > 0) {
            inputs.features = features;
            this._originalStyle = setFeaturesSelectedStyle(features);
            if (this._steps) {
              this.setUserMessageStepDone('select');
            }
            promise.resolve(inputs);
          } else {
            promise.reject();
          }
        }
      });
    }
    this._selectInteractions.push(selectInteractionMultiple);

    this.addInteraction(selectInteractionMultiple);
  }

  /**
   *
   * @param inputs
   * @param context
   * @returns {*}
   */
  run(inputs, context) {
    const layer   = inputs.layer;
    const promise = $.Deferred();
    switch(this._type) {
      case 'single':
        this.addSingleSelectInteraction({layer, inputs, promise});
        break;
      case 'multiple':
        const buttonnext = !!this._steps.select.buttonnext;
        if (buttonnext) {
          this._steps.select.buttonnext.done = () => promise.resolve(inputs);
        }
        this.addSingleSelectInteraction({layer, inputs, promise, buttonnext});
        this.addMultipleSelectInteraction({layer, inputs, promise, buttonnext});
        break;
      case 'bbox':
        this.addMultipleSelectInteraction({layer, inputs, promise});
        break;
      case 'external':
        this.addExternalSelectInteraction({layer, inputs, context, promise});
        break;
    }

    return promise.promise();
  }

  stop() {
    this._selectInteractions
      .forEach(interaction => this.removeInteraction(interaction));

    if (this._vectorLayer) {
      this.getMap().removeLayer(this._vectorLayer);
    }
    //need to reset selected
    this.getInputs()
      .features
      .forEach((feature => feature.setStyle(this._originalStyle)));

    this._originalStyle         = null;
    this._vectorLayer           = null;
    this._selectInteractions    = [];
    this.multipleselectfeatures = [];
  }

}

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/splitfeaturetask.js@v3.7.1
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/splitfeaturestep.js@v3.7.1
 */
export class SplitFeatureStep extends EditingTask {

  constructor(options = {}) {
    options.help = '';

    super(options);

    /** @since g3w-client-plugin-editing@v3.8.0 */
    this._stopPromise;

    options.task = this;
    const step = new EditingStep(options);

    if (options.steps) {
      this.setSteps(options.steps);
    }

    return step;
  }

  run(inputs, context) {
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
    setAndUnsetSelectedFeaturesStyle({ promise: this._stopPromise, inputs });


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
          await this._handleSplitFeature({
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
  }

  /**
   *
   * @param feature
   * @param inputs
   * @param context
   * @param splittedGeometries
   * @return {Promise<*[]>}
   * @private
   */
  async _handleSplitFeature({
    feature,
    inputs,
    context,
    splittedGeometries = []
  }={}) {
    const newFeatures              = [];
    const { layer }                = inputs;
    const session                  = context.session;
    const source                   = layer.getEditingLayer().getSource();
    const layerId                  = layer.getId();
    const oriFeature               = feature.clone();
    inputs.features                = splittedGeometries.length ? [] : inputs.features;
    const splittedGeometriesLength = splittedGeometries.length;

    for (let index = 0; index < splittedGeometriesLength; index++) {
      const splittedGeometry = splittedGeometries[index];
      if (0 === index) {
        /**
         * check geometry evaluated expression
         */
        feature.setGeometry(splittedGeometry);
        try {
          await evaluateExpressionFields({ inputs, context, feature });
        } catch(err) {
          console.warn(err);
        }

        session.pushUpdate(layerId, feature, oriFeature);

      } else {
        const newFeature = cloneFeature(oriFeature, layer);
        newFeature.setGeometry(splittedGeometry);

        setNullMediaFields({ layer, feature: newFeature });

        feature = new Feature({ feature: newFeature });

        feature.setTemporaryId();

        // evaluate geometry expression
        try {
          await evaluateExpressionFields({ inputs, context, feature });
        } catch(err) {
          console.warn(err);
        }

        /**
         * @todo improve client core to handle this situation on sesssion.pushAdd not copy pk field not editable only
         */
        const noteditablefieldsvalues = getNotEditableFieldsNoPkValues({ layer, feature });

        if (Object.entries(noteditablefieldsvalues).length) {
          const newFeature = session.pushAdd(layerId, feature);
          Object.entries(noteditablefieldsvalues)
            .forEach(([field, value]) => newFeature.set(field, value));

          newFeatures.push(newFeature);
          //need to add features with no editable fields on layers source
          source.addFeature(newFeature);
        } else {
          newFeatures.push(session.pushAdd(layerId, feature));
          //add feature to source
          source.addFeature(feature);
        }
      }
      inputs.features.push(feature);
    }

    return newFeatures;
  }

  stop() {
    this.removeInteraction(this._drawInteraction);
    this.removeInteraction(this._snapIteraction);
    this._drawInteraction = null;
    this._snapIteraction = null;
    /** @since g3w-client-plugin-editing@v3.8.0 */
    this._stopPromise.resolve(true);
  }

}
