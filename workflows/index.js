import { cloneFeature }                                 from '../utils/cloneFeature';
import { areCoordinatesEqual }                          from '../utils/areCoordinatesEqual';
import { evaluateExpressionFields }                     from '../utils/evaluateExpressionFields';
import { getParentFormData }                            from '../utils/getParentFormData';
import { setFeaturesSelectedStyle }                     from '../utils/setFeaturesSelectedStyle';
import { setAndUnsetSelectedFeaturesStyle }             from '../utils/setAndUnsetSelectedFeaturesStyle';
import { getFormFields }                                from '../utils/getFormFields';
import { convertFeaturesGeometryToGeometryTypeOfLayer } from '../utils/convertFeaturesGeometryToGeometryTypeOfLayer';
import { getNotEditableFieldsNoPkValues }               from '../utils/getNotEditableFieldsNoPkValues';
import { chooseFeatureFromFeatures }                    from '../utils/chooseFeatureFromFeatures';
import { handleRelation1_1LayerFields }                 from '../utils/handleRelation1_1LayerFields';
import { listenRelation1_1FieldChange }                 from '../utils/listenRelation1_1FieldChange';
import { getRelationFieldsFromRelation }                from '../utils/getRelationFieldsFromRelation';
import { getRelationId }                                from '../utils/getRelationId';
import { getRelationsInEditing }                        from '../utils/getRelationsInEditing';
import { getLayersDependencyFeatures }                  from '../utils/getLayersDependencyFeatures';
import { getProjectLayerFeatureById }                   from '../utils/getProjectLayerFeatureById';
import { getEditingLayerById }                          from '../utils/getEditingLayerById';
import { setLayerUniqueFieldValues }                    from '../utils/setLayerUniqueFieldValues';
import { getRelationsInEditingByFeature }               from '../utils/getRelationsInEditingByFeature';
import { getFeatureTableFieldValue }                    from '../utils/getFeatureTableFieldValue';

import CopyFeatureFromOtherLayersComponent              from '../components/CopyFeaturesFromOtherLayers.vue';
import CopyFeatureFromOtherProjectLayersComponent       from '../components/CopyFeaturesFromOtherProjectLayer.vue';
import { PickFeaturesInteraction }                      from '../interactions/pickfeaturesinteraction';

import WorkflowsStack                                   from '../g3wsdk/workflow/stack'
import { EditingTask }                                  from '../g3wsdk/workflow/task';
import EditingStep                                      from '../g3wsdk/workflow/step';

const { G3W_FID }                                            = g3wsdk.constant;
const { G3WObject, ApplicationState }                        = g3wsdk.core;
const { CatalogLayersStoresRegistry }                        = g3wsdk.core.catalog;
const { DataRouterService }                                  = g3wsdk.core.data;
const { Geometry }                                           = g3wsdk.core.geometry;
const {
  convertSingleMultiGeometry,
  isSameBaseGeometryType,
  multiGeometryToSingleGeometries,
  singleGeometriesToMultiGeometry,
  dissolve,
  splitFeatures,
}                                                            = g3wsdk.core.geoutils;
const { removeZValueToOLFeatureGeometry }                    = g3wsdk.core.geoutils.Geometry;
const { t, tPlugin }                                         = g3wsdk.core.i18n;
const { Layer }                                              = g3wsdk.core.layer;
const { Feature }                                            = g3wsdk.core.layer.features;
const { ProjectsRegistry }                                   = g3wsdk.core.project;
const { GUI }                                                = g3wsdk.gui;
const { Component, FormComponent }                           = g3wsdk.gui.vue;
const { FormService }                                        = g3wsdk.gui.vue.services;
const { AreaInteraction, LengthInteraction }                 = g3wsdk.ol.interactions.measure;
const { PickFeatureInteraction, PickCoordinatesInteraction } = g3wsdk.ol.interactions;
const { createMeasureTooltip, removeMeasureTooltip }         = g3wsdk.ol.utils;

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
    setAndUnsetSelectedFeaturesStyle({ promise: this._stopPromise, inputs, style: this.selectStyle });

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
      projection: GUI.getService('map').getProjection(),
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
    const d       = $.Deferred();
    const layerId = inputs.layer.getId();
    let feature;
    let originalFeature;

    // add part
    if (inputs.features.length > 1) {
      feature         =  inputs.features[0];
      const geometry  = feature.getGeometry();
      originalFeature = feature.clone();
      geometry.setCoordinates([...geometry.getCoordinates(), ...inputs.features[1].getGeometry().getCoordinates()]);
    } else {
      feature         = inputs.layer.getEditingLayer().getSource().getFeatures()[0];
      originalFeature = feature.clone();
      feature.setGeometry(inputs.features[0].getGeometry());
    }

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
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/confirmstep.js@v3.7.1
 */
export class ConfirmStep extends EditingTask {

  constructor(options = {}) {
    super(options);
    this._dialog = options.dialog;
    options.task = this;
    return new EditingStep(options);
  }

  run(inputs, context) {
    return this._dialog(inputs, context);
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
     * ORIGINAL SOURCE: g3w-client-plugin-editing/g3w-editing-components/selectcopyotherprojectlayerfeatures.js.js@v3.6
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
                    const layerProjectFeature = await getProjectLayerFeatureById({
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
    setAndUnsetSelectedFeaturesStyle({ promise: this._stopPromise, inputs, style: this.selectStyle });

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

  /**
   *
   *
   * @param inputs
   * @param context
   * @return { JQuery Promise }
   */
  run(inputs, context) {
    GUI.setModal(false);
    const d                   = $.Deferred();
    const editingLayer        = inputs.layer.getEditingLayer();
    this._originalLayerStyle  = editingLayer.getStyle();
    const promise             = context.beforeRun && typeof context.beforeRun === 'function' ? context.beforeRun() : Promise.resolve();

    const { excludeFeatures } = context;

    promise
      .then(() => {
        let features = editingLayer.getSource().getFeatures();

        if (excludeFeatures) {
          features = features
            .filter(feature => Object
              .entries(excludeFeatures)
              .reduce((bool, [field, value]) => bool && feature.get(field) != value, true)
            )
        }
        this._stopPromise = $.Deferred();

        setAndUnsetSelectedFeaturesStyle({
          promise: this._stopPromise.promise(),
          inputs: { layer: inputs.layer, features },
          style: this.selectStyle
        });

        this.pickFeatureInteraction = new PickFeatureInteraction({
          layers: [editingLayer],
          features
        });
        this.addInteraction(this.pickFeatureInteraction);
        this.pickFeatureInteraction.on('picked', evt => {
          const relation = evt.feature;
          inputs.features.push(relation);
          GUI.setModal(true);
          d.resolve(inputs);
        });
      })
      .catch(e => {
        console.warn(e);
        d.reject(e);
      });

    return d.promise();
  }

  stop() {
    GUI.setModal(true);
    this.removeInteraction(this.pickFeatureInteraction);
    this.pickFeatureInteraction = null;
    this._originalLayerStyle    = null;
    if (this._stopPromise) { this._stopPromise.resolve(true)}
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
            return new ol
              .geom
              .MultiPoint(
                ( // in the case of multipolygon geometry
                  Geometry.isPolygonGeometryType(originalLayer.getGeometryType()) &&
                  Geometry.isMultiGeometry(originalLayer.getGeometryType())
                ) ? feature.getGeometry().getCoordinates()[0][0] : feature.getGeometry().getCoordinates()[0]
              )
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
         * end of evaluating
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
    setAndUnsetSelectedFeaturesStyle({ promise: d, inputs, style: this.selectStyle });

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
    /** Need two different promises: One for stop() method and clean-selected feature,
     * and another one for a run task. If we use the same promise, when stop a task without move feature,
     * this.promise.resolve(), it fires also thenable method listens to resolve promise of a run task,
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
    setAndUnsetSelectedFeaturesStyle({ promise: this.promise, inputs, style: this.selectStyle });

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
   * @param fields
   * @param fields Array of fields
   * 
   * @returns {Promise<unknown>}
   */
  async saveAll(fields) {
    const { session } = this.getContext();
    fields = this._multi ? fields.filter(field => null !== field.value) : fields;

    // skip when ..
    if (!fields.length) {
      return;
    }

    await WorkflowsStack.getCurrent().getContextService().saveDefaultExpressionFieldsNotDependencies();

    const newFeatures = [];

    this._features.forEach(f => {
      this._originalLayer.setFieldsWithValues(f, fields);
      newFeatures.push(f.clone());
    });

    if (this._isContentChild) {
      this.getInputs().relationFeatures = { newFeatures, originalFeatures: this._originalFeatures };
    }

    await this.fireEvent('saveform', { newFeatures, originalFeatures: this._originalFeatures });

    newFeatures.forEach((f, i) => session.pushUpdate(this.layerId, f, this._originalFeatures[i]));

    //check and handle if layer has relation 1:1
    await handleRelation1_1LayerFields({
      layerId: this.layerId,
      features: newFeatures,
      fields,
      task: this,
    })

    this.fireEvent('savedfeature', newFeatures);                 // called after saved
    this.fireEvent(`savedfeature_${this.layerId}`, newFeatures); // called after saved using layerId

    session.save();

    return { promise: this.promise };
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

    GUI.getService('map').disableClickMapControls(true);
    setAndUnsetSelectedFeaturesStyle({ promise: d, inputs, style: this.selectStyle });

    if (!this._multi && Array.isArray(features[features.length -1])) {
      d.resolve();
    } else {
      this.startForm({ inputs, context, promise: d });
    }

    return d.promise();
  }

  /**
   * Build form
   */
  async startForm({ inputs, context, promise }) {

    g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').setCurrentLayout();

    this._originalLayer    = inputs.layer;
    this._editingLayer     = this._originalLayer.getEditingLayer();
    this._layerName        = this._originalLayer.getName();
    this._features         = this._multi ? inputs.features : [inputs.features[inputs.features.length - 1]];
    this._originalFeatures = this._features.map(f => f.clone());
    let feature            = this._features[0];

    // create a child relation feature set a father relation field value
    if (this._isContentChild) {
      //Are array
      const { fatherValue=[], fatherField=[] } = context;
      fatherField.forEach((fField, index) => {
        feature.set(fField, fatherValue[index]);
        this._originalFeatures[0].set(fField, fatherValue[index]);
      })
    }

    this._fields = await getFormFields({ inputs, context, feature, isChild: this._isContentChild });

    // in the case of multi editing set all fields to null
    if (this._multi) {
      this._fields = this._fields
        .map(field => {
          const f = JSON.parse(JSON.stringify(field));
          f.value = null;
          f.forceNull = true;
          f.validate.required = false;
          return f;
        })
        .filter(field => !field.pk)
    }

    // set fields. Useful getParentFormData
    WorkflowsStack.getCurrent().setInput({ key: 'fields', value: this._fields });

    const formService = GUI.showForm({
      feature:         this._originalFeatures[0],
      /** ORIGINAL SOURCE: g3w-client-plugin-editing/form/editingform.js@v3.7.8 */
      /** ORIGINAL SOURCE: g3w-client-plugin-editing/form/editingformservice.js@v3.7.8 */
      formComponent:   class extends FormComponent {
        constructor(options = {}) {
          super(options);
      
          const relationsOptions = options.context_inputs || {};
          const layerId          = options.layer.getId();
          const hasFormStructure = options.layer.getLayerEditingFormStructure(); // @since g3w-client-plugin-editing@v3.7.2
          const feature          = ((relationsOptions.inputs || {}).features && relationsOptions.inputs.features[relationsOptions.inputs.features.length - 1]);
      
          // skip relations that doesn't have form structure
          if (!hasFormStructure || !feature) {
            return;
          }
      
          (
            feature.isNew()
              ? Promise.resolve()
              : getLayersDependencyFeatures(layerId, {
                // @since g3w-client-plugin-editin@v3.7.0
                relations: options.layer.getRelations().getArray().filter(r =>
                  layerId === r.getFather()         && // get only child relation features of current editing layer
                  getEditingLayerById(r.getChild()) && // child layer is in editing
                  'ONE' !== r.getType()                // is not a ONE relation (Join 1:1)
                ),
                feature,
                filterType: 'fid',
              })
          ).then(() => {

            const { layer, features } = relationsOptions.inputs || {};
            const layerId = layer.getId();
            const formeventbus = this.service.getEventBus() || null;

            this.addFormComponents([
              // custom form components
              ...(g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').state.formComponents[layerId] || []),
              // relation components
              // get only relation with type not ONE and layer is the father
              // get relation layers that set in editing on g3w-admin
              ...getRelationsInEditingByFeature({
                  layerId,
                  relations: layer.getRelations().getArray().filter(r => r.getType() !== 'ONE' && r.getFather() === layerId),
                  feature: features[features.length - 1],
                }).map(({ relation, relations }) => ({
                  title:     "plugins.editing.edit_relation",
                  name:      relation.name,
                  id:        relation.id,
                  header:    false,            // hide header form
                  component: Vue.extend({
                    mixins: [ require('../components/FormRelation.vue') ],
                    name: `relation_${Date.now()}`,
                    data() {
                      return {
                        layerId,
                        relation,
                        relations,
                        resourcesurl: GUI.getResourcesUrl(),
                        formeventbus,
                      };
                    },
                  }),
                }))
            ]);
      
            // overwrite click on relation handler
            this.service.handleRelation = async function({ relation }) {
              GUI.setLoadingContent(true);
              await setLayerUniqueFieldValues(options.layer.getRelationById(relation.name).getChild());
              this.setCurrentComponentById(relation.name);
              GUI.setLoadingContent(false);
            };
          });
        }
      },
      title:           "plugins.editing.editing_attributes",
      name:            this._layerName,
      crumb:           { title: this._layerName },
      id:              'form_' + this._layerName,
      dataid:          this._layerName,
      layer:           this._originalLayer,
      isnew:           this._originalFeatures.length > 1 ? false : this._originalFeatures[0].isNew(), // specify if is a new feature
      parentData:      getParentFormData(),
      fields:          this._fields,
      context_inputs:  !this._multi && this._edit_relations && { context, inputs },
      formStructure:   this._originalLayer.hasFormStructure() && this._originalLayer.getLayerEditingFormStructure().length ? this._originalLayer.getLayerEditingFormStructure() : undefined,
      modal:           true,
      push:            this.push || this._isContentChild, //@since v3.7 need to take in account this.push value
      showgoback:      undefined !== this.showgoback ? this.showgoback : !this._isContentChild,
      /** @TODO make it straightforward: `headerComponent` vs `buttons` ? */
      headerComponent: this._saveAll && {
        template: /* html */ `
          <section class="editing-save-all-form">
            <bar-loader :loading="loading"/>
            <div
              class = "editing-button"
              style = "background-color: #fff; display: flex; justify-content: flex-end; width: 100%;"
            >
              <span
                class               = "save-all-icon"
                v-disabled          = "disabled"
                @click.stop.prevent = "save"
              >
                <i
                  class  = "skin-color"
                  :class = "g3wtemplate.font['save']"
                  style  = "font-size: 1.8em; padding: 5px; border-radius: 5px; cursor: pointer; box-shadow: 0 3px 5px rgba(0,0,0,0.5); margin: 5px;"
                ></i>
              </span>
            </div>
          </section>`,

          name: 'Saveall',

          /** @TODO figure out who populate these props (ie. core client code?) */
          props: {
            update: { type: Boolean },
            valid: { type: Boolean },
          },

          data() {
            return {
              loading: false,
              enabled: true,
            };
          },

          computed: {
            /**
             * Disable save all buttons when it is not enabled (a case of parent form is not valid,
             * or when current form is not valid or valid but not updated)
             * @return {boolean}
             */
            disabled() {
              return !this.enabled || !(this.valid && this.update);
            },

          },

          methods: {

            async save() {
              this.loading = true;

              await Promise.allSettled(
                [...WorkflowsStack._workflows]
                  .reverse()
                  .filter( w => "function" === typeof w.getLastStep().getTask().saveAll) // need to filter only workflow that
                  .map(w => w.getLastStep().getTask().saveAll(w.getContext().service.state.fields))
              )

              g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing')
                .commit({ modal: false })
                .then(()   => { WorkflowsStack._workflows.forEach(w => w.getContext().service.setUpdate(false, { force: false })); })
                .fail((e)  => console.warn(e))
                .always(() => { this.loading = false });
            },

          },

          created() {
            // set enabled to true as default value;
            // this.enabled = true;

            // skip when workflow tasks are less than 2
            if (WorkflowsStack.getLength() < 2) {
              return;
            }

            this.enabled = WorkflowsStack
              ._workflows
              .slice(0, WorkflowsStack.getLength() - 1)
              .reduce((bool, w) => {
                const { service } = w.getContext();
                const { valid = true } = (service instanceof FormService) ? service.getState() : {};
                return bool && valid;
                }, true);
          },

      },
      buttons:         [
        {
          id: 'save',
          title: this._isContentChild
            ? WorkflowsStack.getParent().getBackButtonLabel() || "plugins.editing.form.buttons.save_and_back" // get custom back label from parent
            : "plugins.editing.form.buttons.save",
          type: "save",
          class: "btn-success",
          // save features
          cbk: async (fields) => {
            fields = this._multi ? fields.filter(field => null !== field.value) : fields;

            // skip when ..
            if (!fields.length) {
              GUI.setModal(false);
              promise.resolve(inputs);
              return;
            }

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

            this
              .fireEvent('saveform', { newFeatures, originalFeatures: this._originalFeatures})
              .then(async () => {
                newFeatures.forEach((f, i) => context.session.pushUpdate(this.layerId, f, this._originalFeatures[i]));

                // check and handle if layer has relation 1:1
                await handleRelation1_1LayerFields({
                  layerId: this.layerId,
                  features: newFeatures,
                  fields,
                  task: this,
                });

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
              });
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

    // fire openform event
    this.fireEvent('openform',
      {
        layerId: this.layerId,
        session: context.session,
        feature: this._originalFeature,
        formService
      }
    );

    // set context service to form Service in case of single task (ie. no workflow)
    if (WorkflowsStack.getCurrent()) {
      WorkflowsStack.getCurrent().setContextService(formService);
    }

    //listen eventually field relation 1:1 changes value
    this._unwatchs = await listenRelation1_1FieldChange({
      layerId: this.layerId,
      fields: this._fields,
    });

    this.disableSidebar(true);
  }

  /**
   *
   */
  stop() {
    this.disableSidebar(false);

    //Check if form coming from the parent table component
    const is_parent_table = false === this._isContentChild || // no child workflow
      (
        // case edit feature of a table (edit layer alphanumeric)
        2 === WorkflowsStack.getLength() && //open features table
        WorkflowsStack.getParent().isType('edittable')
      );

    // when the last feature of features is Array
    // and is resolved without setting form service
    // Ex. copy multiple features from another layer
    if (is_parent_table) {
      GUI.getService('map').disableClickMapControls(false);
    }

    const contextService = is_parent_table && WorkflowsStack.getCurrent().getContextService();

    // force update parent form update
    if (contextService && false === this._isContentChild) {
      contextService.setUpdate(false, { force: false });
    }

    GUI.closeForm({ pop: this.push || this._isContentChild });

    g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').resetCurrentLayout();

    this.fireEvent('closeform');
    this.fireEvent(`closeform_${this.layerId}`);

    this.layerId = null;
    this.promise = null;
    this._unwatchs.forEach(unwatch => unwatch());
    this._unwatchs = [];
  }

}

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/opentabletask.js@v3.7.1
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/opentablestep.js@v3.7.1
 */
export class OpenTableStep extends EditingTask {

  constructor(options = {}) {
    options.help = "editing.steps.help.edit_table";

    super(options);

    options.task = this;
    return new EditingStep(options);
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/opentabletask.js@v3.7.1
   * ORIGINAL SOURCE: g3w-client-plugin-editing/services/tableservice.js@v3.7.8
   * 
   * @param inputs
   * @param context
   * 
   * @returns {*}
   */
  run(inputs, context) {
    // set current plugin layout (right content)
    g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').setCurrentLayout();

    const d              = $.Deferred();
    this._isContentChild = WorkflowsStack.getLength() > 1;

    const features = (inputs.layer.readEditingFeatures() || []);
    const headers  = (inputs.layer.getEditingFields() || []).filter(h => features.length ? Object.keys(features[0].getProperties()).includes(h.name) : true);
    this._isContentChild = WorkflowsStack.getLength() > 1;
    const excludeFields = this._isContentChild ? (context.excludeFields || []) : [];
    const service = Object.assign(new G3WObject, { state: {
      inputs,
      context,
      promise: d,
      headers, // column names
      features,
      rows: features.length > 0
        // ordered properties
        ? (
          excludeFields.length > 0
            ? features.filter(feat => !excludeFields.reduce((a, f, i) => a && context.fatherValue[i] === `${feat.get(f)}` , true))
            : features
        )
          .map(f => headers.map(h => h.name).reduce((props, header) => Object.assign(props, {
            [header]: getFeatureTableFieldValue({ layerId: inputs.layer.getId(), feature: f, property: header }),
            '__gis3w_feature_uid': f.getUid(), // private attribute unique value
          }), {}))
        // features already bind to parent feature
        : features,
      title:        `${inputs.layer.getName()}` || 'Link relation',
      isrelation:   this._isContentChild,
      capabilities: inputs.layer.getEditingCapabilities(),
      layerId:      inputs.layer.getId(),
      workflow:     null,
    } });

    GUI.showContent({
      content: new Component({
        title: `${inputs.layer.getName()}`,
        push: this._isContentChild,
        service,
        state: service.state,
        internalComponent: new (Vue.extend(require('../components/Table.vue')))({ service }),
      }),
      push: this._isContentChild,
      showgoback: false,
      closable: false
    });

    return d.promise();
  }

  /**
   *
   */
  stop() {
    this.disableSidebar(false);
    GUI[this._isContentChild ? 'popContent' : 'closeContent']();
    //reset current plugin layout (right content) to application
    g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').resetCurrentLayout();
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
      setAndUnsetSelectedFeaturesStyle({ promise: d, inputs, style: this.selectStyle });

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

    this._type                  = options.type || 'bbox'; // 'single' 'bbox' 'multiple'
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
          if (this._steps) {
            this.setUserMessageStepDone('select');
          }
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
  addExternalSelectInteraction({
    layer,
    inputs,
    context,
    promise,
    buttonnext = false
  }= {}) {
    const layerGeometryType = layer.getGeometryType();
    const layerId           = layer.getId();
    const source            = layer.getEditingLayer().getSource();
    const {session}         = this.getContext();
    // filter external layer only vector - Exclude WMS
    const layers = GUI
      .getService('map')
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
              'media' === attribute.input.type
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

        //https://openlayers.org/en/v5.3.0/apidoc/module-ol_source_Cluster-Cluster.html#forEachFeatureIntersectingExtent
        layerSource
          .forEachFeatureIntersectingExtent(extent, feature => { features.push(feature) });

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

        // set media fields to null
        layer.getEditingMediaFields({}).forEach(f => newFeature.set(f, null));

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
