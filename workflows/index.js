import { evaluateExpressionFields }                     from '../utils/evaluateExpressionFields';
import { getParentFormData }                            from '../utils/getParentFormData';
import { setFeaturesSelectedStyle }                     from '../utils/setFeaturesSelectedStyle';
import { setAndUnsetSelectedFeaturesStyle }             from '../utils/setAndUnsetSelectedFeaturesStyle';
import { getFormFields }                                from '../utils/getFormFields';
import { chooseFeatureFromFeatures }                    from '../utils/chooseFeatureFromFeatures';
import { handleRelation1_1LayerFields }                 from '../utils/handleRelation1_1LayerFields';
import { listenRelation1_1FieldChange }                 from '../utils/listenRelation1_1FieldChange';
import { getLayersDependencyFeatures }                  from '../utils/getLayersDependencyFeatures';
import { getEditingLayerById }                          from '../utils/getEditingLayerById';
import { setLayerUniqueFieldValues }                    from '../utils/setLayerUniqueFieldValues';
import { getRelationsInEditingByFeature }               from '../utils/getRelationsInEditingByFeature';
import { getFeatureTableFieldValue }                    from '../utils/getFeatureTableFieldValue';
import { addRemoveToMultipleSelectFeatures }            from '../utils/addRemoveToMultipleSelectFeatures';
import { PickFeaturesInteraction }                      from '../interactions/pickfeaturesinteraction';

import WorkflowsStack                                   from '../g3wsdk/workflow/stack'
import { EditingTask }                                  from '../g3wsdk/workflow/task';
import Step                                             from '../g3wsdk/workflow/step';

const { G3WObject, ApplicationState }                        = g3wsdk.core;
const { Geometry }                                           = g3wsdk.core.geometry;
const {
  convertSingleMultiGeometry,
  isSameBaseGeometryType,
}                                                            = g3wsdk.core.geoutils;
const { removeZValueToOLFeatureGeometry }                    = g3wsdk.core.geoutils.Geometry;
const { Layer }                                              = g3wsdk.core.layer;
const { Feature }                                            = g3wsdk.core.layer.features;
const { GUI }                                                = g3wsdk.gui;
const { Component, FormComponent }                           = g3wsdk.gui.vue;
const { FormService }                                        = g3wsdk.gui.vue.services;
const { AreaInteraction, LengthInteraction }                 = g3wsdk.ol.interactions.measure;
const { createMeasureTooltip, removeMeasureTooltip }         = g3wsdk.ol.utils;

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/addfeaturetask.js@v3.7.1
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/addfeaturestep.js@v3.7.1
 */
export class AddFeatureStep extends EditingTask {

  constructor(options = {}) {
    options.help = "editing.steps.help.draw_new_feature";

    super(options);

    this._add = options.add === undefined ? true : options.add;

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
    this._delKeyRemoveLastPoint  = e => e.keyCode === 46 && this.removeLastPoint();

    options.task = this;
    const step = new Step(options)

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
    if (this.measureInteraction) {
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
    try {
      if (this.drawInteraction) {
        this.drawInteraction.removeLastPoint();
      }
    } catch (e) {
      console.warn(e)
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

    return new Step(options);
  }

  run(inputs, context) {
    let newFeature, originalFeature;
    const d             = $.Deferred();
    const layerId       = inputs.layer.getId();
    const feature       = this._feature = inputs.features[0];
    this._originalStyle = inputs.layer.getEditingLayer().getStyle();
    this.deleteVertexKey;
    feature.setStyle(() => [
      new ol.style.Style({
        image:    new ol.style.Circle({ radius: 5, fill: null, stroke: new ol.style.Stroke({color: 'orange', width: 2}) }),
        geometry: feature => new ol.geom.MultiPoint(
          ( // in the case of multipolygon geometry
            Geometry.isPolygonGeometryType(inputs.layer.getGeometryType()) &&
            Geometry.isMultiGeometry(inputs.layer.getGeometryType())
          ) ? feature.getGeometry().getCoordinates()[0][0] : feature.getGeometry().getCoordinates()[0]
        )
      }),
      new ol.style.Style({ stroke: new ol.style.Stroke({ color: 'yellow', width: 4 }) })
    ]);
    const features = new ol.Collection(inputs.features);
    this._modifyInteraction = new ol.interaction.Modify({ features, deleteCondition: this._deleteCondition });
    this._modifyInteraction.on('modifystart', e => { originalFeature = e.features.getArray()[0].clone(); });
    this.addInteraction(this._modifyInteraction);
    this._modifyInteraction.on('modifyend', e => {
      const feature = e.features.getArray()[0];
      if (feature.getGeometry().getExtent() !== originalFeature.getGeometry().getExtent()) {
        evaluateExpressionFields({ inputs, context, feature }).finally(()=>{
          newFeature = feature.clone();
          context.session.pushUpdate(layerId, newFeature, originalFeature);
          inputs.features.push(newFeature);
          d.resolve(inputs);
        });
      }
    });
    return d.promise();
  }

  addMeasureInteraction() {
    this._modifyInteraction.on('modifystart', e => {
      this.tooltip = createMeasureTooltip({ map: this.getMap(), feature: e.features.getArray()[0] });
    });
  }

  removeMeasureInteraction() {
    if (this.tooltip) {
      removeMeasureTooltip({ map: this.getMap(), ...this.tooltip });
    }
    this.tooltip = null;
  }

  stop() {
    this._feature.setStyle(this._originalStyle);
    this.removeInteraction(this._modifyInteraction);
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
    return new Step(options);
  }

  run(inputs, context) {
    /** Need two different promises: One for stop() method and clean-selected feature,
     * and another one for a run task. If we use the same promise, when stop a task without move feature,
     * this.promise.resolve(), it fires also thenable method listens to resolve promise of a run task,
     * that call stop task method.*/
    this.promise         = $.Deferred();
    return $.Deferred(d => {
      const session        = context.session;
      const layerId        = inputs.layer.getId();
      const features       = new ol.Collection(inputs.features);
      let originalFeature  = null;
      this.changeKey       = null; //
      let isGeometryChange = false; // changed if geometry is changed
      setAndUnsetSelectedFeaturesStyle({ promise: this.promise, inputs, style: this.selectStyle });
  
      this._translateInteraction = new ol.interaction.Translate({ features, hitTolerance: (isMobile && isMobile.any) ? 10 : 0 });
  
      this.addInteraction(this._translateInteraction);
  
      this._translateInteraction.on('translatestart', e => {
        const feature = e.features.getArray()[0];
        this.changeKey = feature.once('change', () => isGeometryChange = true);
        originalFeature = feature.clone();
      });
  
      this._translateInteraction.on('translateend', e => {
        ol.Observable.unByKey(this.changeKey);
        const feature = e.features.getArray()[0];
        if (isGeometryChange) {
          // evaluated geometry expression
          evaluateExpressionFields({ inputs, context, feature }).finally(() => {
            session.pushUpdate(layerId, feature.clone(), originalFeature);
            d.resolve(inputs);
          });
        } else {
          d.resolve(inputs);
        }
      });
    }).promise();
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
     * 
     * @type {boolean}
     * 
     * @since v3.7
     */
    this.showgoback = showgoback;

    /**
     * to force to push content on top without clear previous content
     * 
     * @since v3.7
     */
    this.push = push;

    /**
     * Show saveAll button
     * 
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
    return new Step(options);
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
    $.Deferred(async d => {
      this.promise         = d;
      this._isContentChild = WorkflowsStack.getLength() > 1;
      this.layerId         = inputs.layer.getId();
  
      GUI.setLoadingContent(false);
  
      GUI.getService('map').disableClickMapControls(true);
      setAndUnsetSelectedFeaturesStyle({ promise: d, inputs, style: this.selectStyle });
  
      if (!this._multi && Array.isArray(inputs.features[inputs.features.length -1])) {
        d.resolve();
        return;
      }

      const promise = d;

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
    }).promise();
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
    return new Step(options);
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

    this._tools = options.tools || [];

    options.task = this;

    const step = new Step(options);

    if (options.steps) {
      this.setSteps(options.steps);
    }

    return step;
  }

  run(inputs) {
    return $.Deferred(d => {
      this.pickFeatureInteraction = new PickFeaturesInteraction({ layer: inputs.layer.getEditingLayer() });
  
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
    });
  }

  stop() {
    this.removeInteraction(this.pickFeatureInteraction);
    this.pickFeatureInteraction = null;
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

    const step = new Step(options);

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
   * @param inputs
   * @param context
   * @returns {*}
   */
  run(inputs, context) {
    const layer = inputs.layer;
    const type = this._type;

    return $.Deferred(d => {
      const promise = d;

      const buttonnext = 'multiple' === type ? !!this._steps.select.buttonnext : false;

      if (buttonnext) {
        this._steps.select.buttonnext.done = () => promise.resolve(inputs);
      }

      const interactions = {};

      // add single select interaction
      if (['single', 'multiple'].includes(type)) {
        interactions.single = new PickFeaturesInteraction({ layer: layer.getEditingLayer() });
        interactions.single.on('picked', async ({ features }) => {
          let feature;
          if (features.length > 1) {
            try { feature = await chooseFeatureFromFeatures({ features, inputs: this.getInputs() }); }
            catch(e) { console.warn(e);}
          } else {
            feature = features[0];
          }
          if (feature) {
            inputs.features = [feature];
            if (buttonnext) {
              addRemoveToMultipleSelectFeatures([feature], inputs, this.multipleselectfeatures, this);
            } else {
              this._originalStyle = setFeaturesSelectedStyle(inputs.features);
              if (this._steps) {
                this.setUserMessageStepDone('select');
              }
              promise.resolve(inputs);
            }
          }
        });
      }

      // add multiple select interactions
      if (['multiple', 'bbox'].includes(type) && ApplicationState.ismobile) {
        const source      = new ol.source.Vector({});
        this._vectorLayer = new ol.layer.Vector({ source });
        this.getMap().addLayer(this._vectorLayer);
        interactions.multi = new ol.interaction.Draw({ type: 'Circle', source, geometryFunction: ol.interaction.Draw.createBox() });
        interactions.multi.on('drawend', e => {
          const features = layer.getEditingLayer().getSource().getFeaturesInExtent(e.feature.getGeometry().getExtent());
          if (buttonnext) {
            addRemoveToMultipleSelectFeatures(features, inputs, this.multipleselectfeatures, this);
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
      }
  
      if (['multiple', 'bbox'].includes(type) && !ApplicationState.ismobile) {
        interactions.dragbox = new ol.interaction.DragBox({ condition: ol.events.condition.shiftKeyOnly });
        interactions.dragbox.on('boxend', () => {
          const features = [];
          const extent = interactions.dragbox.getGeometry().getExtent();
  
          //https://openlayers.org/en/v5.3.0/apidoc/module-ol_source_Cluster-Cluster.html#forEachFeatureIntersectingExtent
          layer.getEditingLayer().getSource().forEachFeatureIntersectingExtent(extent, f => { features.push(f) });
  
          if (buttonnext) {
            addRemoveToMultipleSelectFeatures(features, inputs, this.multipleselectfeatures, this);
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

      // pick feature from external layer added to map
      if ('external' === type) {
        const geometryType = layer.getGeometryType();
        const layerId      = layer.getId();
        const source       = layer.getEditingLayer().getSource();
        const { session }  = this.getContext();
        interactions.external  = new PickFeaturesInteraction({
          layers: GUI.getService('map').getExternalLayers()
            // filter external layer only vector - Exclude WMS
            // same base geometry
            .filter(l => {
              const features = 'VECTOR' == l.getType() && l.getSource().getFeatures();
              if (features.length > 0) {
                return isSameBaseGeometryType(features[0].getGeometry().getType(), geometryType)
              }
              return true;
            })
        });
        interactions.external.on('picked', e => {
          if (!(e.features.length > 0)) {
            promise.reject();
            return;
          }
          const attributes = layer.getEditingFields();
          const geometry = e.features[0].getGeometry();
          if (geometry.getType() !== geometryType) {
            e.feature.setGeometry(convertSingleMultiGeometry(geometry, geometryType));
          }
          const feature = new Feature({
            feature: e.feature,
            properties: attributes.map(attr => {
              // set media attribute to null or attribute belong to layer but not present o feature copied
              if (attr.pk || 'media' === attr.input.type || undefined === e.feature.get(attr.name)) {
                e.feature.set(attr.name, null);
              }
              return attr.name
            })
          });
    
          // evaluate Geometry Expression
          evaluateExpressionFields({ inputs, context, feature }).finally(() => {
            removeZValueToOLFeatureGeometry({ feature }); // remove eventually Z Values
            feature.setTemporaryId();
            source.addFeature(feature);
            session.pushAdd(layerId, feature, false);
            inputs.features.push(feature);
            promise.resolve(inputs);
          });
        });
      }

      Object.values(interactions).forEach(i => this.addInteraction(i));
      this._selectInteractions = this._selectInteractions.push(...Object.values(interactions));
    }).promise();
  }

  stop() {
    this._selectInteractions.forEach(i => this.removeInteraction(i));

    if (this._vectorLayer) {
      this.getMap().removeLayer(this._vectorLayer);
    }
    // reset selected
    this.getInputs().features.forEach(f => f.setStyle(this._originalStyle));

    this._originalStyle         = null;
    this._vectorLayer           = null;
    this._selectInteractions    = [];
    this.multipleselectfeatures = [];
  }

}