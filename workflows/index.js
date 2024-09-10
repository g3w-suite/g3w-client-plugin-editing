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
import { promisify, $promisify }                        from '../utils/promisify';
import { PickFeaturesInteraction }                      from '../interactions/pickfeaturesinteraction';

import { Workflow }                                     from '../g3wsdk/workflow/workflow';
import { Step }                                         from '../g3wsdk/workflow/step';

const { G3WObject, ApplicationState }                   = g3wsdk.core;
const { Geometry }                                      = g3wsdk.core.geometry;
const {
  convertSingleMultiGeometry,
  isSameBaseGeometryType,
}                                                       = g3wsdk.core.geoutils;
const { removeZValueToOLFeatureGeometry }               = g3wsdk.core.geoutils.Geometry;
const { Layer }                                         = g3wsdk.core.layer;
const { Feature }                                       = g3wsdk.core.layer.features;
const { GUI }                                           = g3wsdk.gui;
const { Component }                                     = g3wsdk.gui.vue;
const { FormService }                                   = g3wsdk.gui.vue.services;
const { AreaInteraction, LengthInteraction }            = g3wsdk.ol.interactions.measure;
const { createMeasureTooltip, removeMeasureTooltip }    = g3wsdk.ol.utils;

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/addfeaturetask.js@v3.7.1
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/addfeaturestep.js@v3.7.1
 */
export class AddFeatureStep extends Step {

  constructor(options = {}) {
    options.help = "editing.steps.help.draw_new_feature";

    super(options);

    this._add = undefined === options.add ? true : options.add;

    this.drawInteraction;

    this.measeureInteraction;

    this.drawingFeature;

    this._snap = false === options.snap ? false : true;

    /**
     * Handle tasks that stops after `run(inputs, context)` promise (or if ESC key is pressed)
     *
     * @since g3w-client-plugin-editing@v3.8.0
     */
    this._stopPromise;

    /**
     *
     * @param e event
     * @returns {boolean|void}
     * @private
     * callback of pressing esc to remove last point drawed
     */
    this._delKeyRemoveLastPoint  = e => 46 === e.keyCode && this.removeLastPoint();

  }

  run(inputs, context) {

    return $promisify(new Promise((resolve, reject) => {
      //create promise to listen to pass to setAndUnsetSelectedFeaturesStyle
      const promise = new Promise(r => this.resolve = r);

      const layerId = inputs.layer.getId();

      // Skip when a layer type is vector
      if (Layer.LayerTypes.VECTOR !== inputs.layer.getType()) { return  }

      /** @since g3w-client-plugin-editing@v3.8.0 */
      setAndUnsetSelectedFeaturesStyle({ promise: $promisify(promise), inputs, style: this.selectStyle });

      const originalGeometryType = inputs.layer.getEditingGeometryType();

      this.geometryType = Geometry.getOLGeometry(originalGeometryType);

      const source     = inputs.layer.getEditingLayer().getSource();
      const attributes = inputs.layer.getEditingFields();

      this.drawInteraction = this.addInteraction(
        new ol.interaction.Draw({
          type:              this.geometryType,
          source:            new ol.source.Vector(),
          condition:         this._options.condition || (() => true),
          freehandCondition: ol.events.condition.never,
          finishCondition:   this._options.finishCondition || (() => true),
        }), {
          'drawstart': ({ feature }) => {
            this.drawingFeature = feature;
            document.addEventListener('keydown', this._delKeyRemoveLastPoint);
          },
          'drawend': e => {
            let feature;
            if (this._add) {
              attributes.forEach(attr => e.feature.set(attr.name, null));
              feature = new Feature({ feature: e.feature, });
              feature.setTemporaryId();
              source.addFeature(feature);
              context.session.pushAdd(layerId, feature, false);
            } else {
              feature = e.feature;
            }
            // set Z values based on layer Geometry
            if (Geometry.is3DGeometry(originalGeometryType)) {
              feature = Geometry.addZValueToOLFeatureGeometry({ feature, geometryType: originalGeometryType });
            }

            inputs.features.push(feature);
            this.getContext().get_default_value = true;
            this.fireEvent('addfeature', feature); // emit event to get from subscribers
            resolve(inputs);
          },
        });

      this.drawInteraction.setActive(true);
    }))

  }

  /**
   * Method to add Measure
   */
  addMeasureInteraction() {
    const is_line = Geometry.isLineGeometryType(this.geometryType);
    const is_poly = Geometry.isPolygonGeometryType(this.geometryType);

    //Skip in case geometry is not Line or Polygon
    if (!is_line && !is_poly) { return }

    this.measureInteraction = this.addInteraction(
      new (is_line ? LengthInteraction : AreaInteraction)({
        projection: GUI.getService('map').getProjection(),
        drawColor:  'transparent',
        feature:    this.drawingFeature
      })
    );

    this.measureInteraction.setActive(true);
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
   * Removed last point/vertex draw
   */
  removeLastPoint() {
    try {
      if (this.drawInteraction) { this.drawInteraction.removeLastPoint() }
    } catch (e) {
      console.warn(e)
    }
  }

  stop() {
    this.removeInteraction(this.drawInteraction);
    this.removeMeasureInteraction();
    this.resolve(true);

    this.drawInteraction = null;
    this.drawingFeature  = null;
    this.resolve         = null;

    document.removeEventListener('keydown', this._delKeyRemoveLastPoint);

    return true;
  }

}

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/modifygeometryvertextask.js@v3.7.1
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/modifygeometryvertexstep.js@v3.7.1
 */
export class ModifyGeometryVertexStep extends Step {

  constructor(options = {}) {
    options.snap = undefined !== options.snap ? options.snap : true;
    options.help = "editing.steps.help.edit_feature_vertex";

    super(options);

    this._originalStyle = null;

    this._feature       = null;

    this.tooltip;
  }

  run(inputs, context) {
    let newFeature, originalFeature;
    return $promisify(new Promise((resolve, reject) => {
      const layerId       = inputs.layer.getId();
      const feature       = this._feature = inputs.features[0];
      this._originalStyle = inputs.layer.getEditingLayer().getStyle();
      feature.setStyle(() => [
        new ol.style.Style({
          image:    new ol.style.Circle({ radius: 5, fill: null, stroke: new ol.style.Stroke({color: 'orange', width: 2}) }),
          geometry: feature => new ol.geom.MultiPoint(
            ( // in the case of multipolygon geometry
              Geometry.isPolygonGeometryType(inputs.layer.getGeometryType())
              && Geometry.isMultiGeometry(inputs.layer.getGeometryType())
            ) ? feature.getGeometry().getCoordinates()[0][0] : feature.getGeometry().getCoordinates()[0]
          )
        }),
        new ol.style.Style({ stroke: new ol.style.Stroke({ color: 'yellow', width: 4 }) })
      ]);
      this._modifyInteraction = this.addInteraction(
        new ol.interaction.Modify({
          features:        new ol.Collection(inputs.features),
          deleteCondition: this._options.deleteCondition
        }), {
          'modifystart': e => { originalFeature = e.features.getArray()[0].clone(); },
          'modifyend':   e => {
            const feature = e.features.getArray()[0];
            if (feature.getGeometry().getExtent() !== originalFeature.getGeometry().getExtent()) {
              evaluateExpressionFields({ inputs, context, feature }).finally(() => {
                newFeature = feature.clone();
                context.session.pushUpdate(layerId, newFeature, originalFeature);
                inputs.features.push(newFeature);
                resolve(inputs);
              });
            }
          }
        }
      );
    }))
  }

  addMeasureInteraction() {
    this._modifyInteraction.on('modifystart', e => {
      this.tooltip = createMeasureTooltip({ map: this.getMap(), feature: e.features.getArray()[0] });
    });
  }

  removeMeasureInteraction() {
    if (this.tooltip) { removeMeasureTooltip({ map: this.getMap(), ...this.tooltip }) }
    this.tooltip = null;
  }

  stop() {
    this._feature.setStyle(this._originalStyle);
    return true;
  }

}

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/movefeaturetask.js@v3.7.1
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/movefeaturestep.js@v3.7.1
 */
export class MoveFeatureStep extends Step {

  constructor(options = {}) {
    options.help = "editing.steps.help.move";

    super(options);

    this.drawInteraction = null;
    this.promise; // need to be set here in case of picked features
  }

  run(inputs, context) {
    /** Need two different promises: One for stop() method and clean-selected feature,
     * and another one for a run task. If we use the same promise, when stop a task without move feature,
     * this.promise.resolve(), it fires also thenable method listens to resolve promise of a run task,
     * that call stop task method.*/
    return $promisify(new Promise((resolve) => {
      const promise         = new Promise(r => this.resolve = r);
      const layerId        = inputs.layer.getId();
      let originalFeature  = null;
      this.changeKey       = null;
      let isGeometryChange = false; // changed if geometry is changed

      setAndUnsetSelectedFeaturesStyle({ promise: $promisify(promise), inputs, style: this.selectStyle });

      this.addInteraction(
        new ol.interaction.Translate({
          features:     new ol.Collection(inputs.features),
          hitTolerance: (isMobile && isMobile.any) ? 10 : 0 },
        ), {
        'translatestart': e => {
          const feature   = e.features.getArray()[0];
          this.changeKey  = feature.once('change', () => isGeometryChange = true);
          originalFeature = feature.clone();
        },
        'translateend': e => {
          ol.Observable.unByKey(this.changeKey);
          const feature = e.features.getArray()[0];
          if (isGeometryChange) {
            // evaluated geometry expression
            evaluateExpressionFields({ inputs, context, feature }).finally(() => {
              context.session.pushUpdate(layerId, feature.clone(), originalFeature);
              resolve(inputs);
            });
          } else {
            resolve(inputs);
          }
        },
      });

    }))
  }

  stop() {
    this.resolve(true);
    this.resolve   = null;
    this.changeKey = null;
  }
}

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/openformtask.js@v3.7.1
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/openformstep.js@v3.7.1
 */
export class OpenFormStep extends Step {

  constructor(options = {}) {

    options.help = "editing.steps.help.insert_attributes_feature";

    super(options);

    /**
     * Show saveAll button
     *
     * @since v3.7
     */
    this._saveAll = false === options.saveAll ? options.saveAll : async () => {};

    /**
     * Whether it can handle multi edit features
     */
    this._multi = options.multi || false;

    /**
     * @FIXME set a default value + add description
     */
    this.layerId;

    /**
     * whether form is coming from parent table component
     */
    this._isContentChild = false;

    /**
     * @FIXME set a default value + add description
     */
    this._features;

    /**
     * @FIXME set a default value + add description
     */
    this._originalFeatures;

    /**
     * @FIXME set a default value + add description
     */
    this.promise;

    /**
     * @since g3w-client-plugin-editing@v3.7.0
     */
    this._unwatchs = [];

  }

  /**
   * @since v3.7
   * @param bool
   */
  updateMulti(bool = false) {
    this._multi = bool;
  }

  /**
   * @param inputs
   * @param context
   *
   * @returns {*}
   */
  run(inputs, context) {
    const promise = new Promise(async (resolve, reject) => {
      this._isContentChild = Workflow.Stack.getLength() > 1;
      this.layerId         = inputs.layer.getId();

      GUI.setLoadingContent(false);

      GUI.getService('map').disableClickMapControls(true);



      if (!this._multi && Array.isArray(inputs.features[inputs.features.length - 1])) {
        resolve();
        return;
      }

      g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').setCurrentLayout();

      const layerName        = inputs.layer.getName();
      this._features         = this._multi ? inputs.features : [inputs.features[inputs.features.length - 1]];
      this._originalFeatures = this._features.map(f => f.clone());

      // create a child relation feature set a father relation field value
      if (this._isContentChild) {
        context.fatherValue = context.fatherValue || []; // are array
        (context.fatherField || []).forEach((field, i) => {
          this._features[0].set(field, context.fatherValue[i]);
          this._originalFeatures[0].set(field, context.fatherValue[i]);
        });
      }

      const fields = getFormFields({
        inputs,
        context,
        feature: this._features[0],
        isChild: this._isContentChild,
        multi:   this._multi,
      });

      // set fields. Useful getParentFormData
      Workflow.Stack.getCurrent().setInput({ key: 'fields', value: fields });

      // whether disable relations editing (ref: "editmultiattributes")
      const feature = !this._multi && inputs.features && inputs.features[inputs.features.length - 1];
      const layerId = !this._multi && inputs.layer.getId();

      // @since g3w-client-plugin-editing@v3.7.2
      // skip relations that don't have a form structure
      if (feature && !feature.isNew() && inputs.layer.getLayerEditingFormStructure()) {
        await getLayersDependencyFeatures(inputs.layer.getId(), {
          // @since g3w-client-plugin-editin@v3.7.0
          relations: inputs.layer.getRelations().getArray().filter(r =>
            inputs.layer.getId() === r.getFather() && // get only child relation features of current editing layer
            getEditingLayerById(r.getChild()) &&      // child layer is in editing
            'ONE' !== r.getType()                     // exclude ONE relation (Join 1:1)
          ),
          feature,
          filterType: 'fid',
        });
      }

      /** ORIGINAL SOURCE: g3w-client-plugin-editing/form/editingform.js@v3.7.8 */
      /** ORIGINAL SOURCE: g3w-client-plugin-editing/form/editingformservice.js@v3.7.8 */
      const formService = GUI.showForm({
        feature:         this._originalFeatures[0],
        title:           "plugins.editing.editing_attributes",
        name:            layerName,
        crumb:           { title: layerName },
        id:              `form_${layerName}`,
        dataid:          layerName,
        layer:           inputs.layer,
        isnew:           this._originalFeatures.length > 1 ? false : this._originalFeatures[0].isNew(), // specify if is a new feature
        parentData:      getParentFormData(),
        fields,
        context_inputs:  this._multi ? false: { context, inputs },
        formStructure:   inputs.layer.hasFormStructure() && inputs.layer.getLayerEditingFormStructure() || undefined,
        modal:           true,
        push:            this._options.push || this._isContentChild, /** @since v3.7 force push content on top without clear previous content */
        showgoback:      undefined !== this._options.showgoback ? this._options.showgoback : !this._isContentChild, /** @since v3.7 force show back button */
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
                  @click.stop.prevent = "saveAll"
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
          props: { update: { type: Boolean }, valid: { type: Boolean } },
          data() {
            return {
              loading: false,
              enabled: Workflow.Stack._workflows.slice(0, Workflow.Stack.getLength() - 1)
                .every(w => {
                  const valid = ((w.getContext().service instanceof FormService) ? w.getContext().service.getState() : {}).valid;
                  return valid || undefined === valid;
                }),
            };
          },
          computed: {
            /** @returns {boolean} whether disable save all button (eg. when parent or current form is not valid/ updated) */
            disabled() {
              return !this.enabled || !(this.valid && this.update);
            },
          },
          methods: {
            async saveAll() {
              this.loading = true;
              await Promise.allSettled(
                [...Workflow.Stack._workflows]
                  .reverse()
                  .filter(w => "function" === typeof w.getLastStep()._saveAll) // need to filter only workflow that
                  .map( w => new Promise(async (resolve) => {
                    const task   = w.getLastStep();
                    const fields = w.getContext().service.state.fields.filter(f => task._multi ? null !== f.value : true);
                    // skip when no fields
                    if (0 === fields.length) { return }
                    await Workflow.Stack.getCurrent().getContextService().saveDefaultExpressionFieldsNotDependencies();
                    task._features.forEach(f => task.getInputs().layer.setFieldsWithValues(f, fields));
                    const newFeatures = task._features.map(f => f.clone());
                    //Is a relation form
                    if (task._isContentChild) {
                      task.getInputs().relationFeatures = { newFeatures, originalFeatures: task._originalFeatures };
                    }
                    await task.fireEvent('saveform', { newFeatures, originalFeatures: task._originalFeatures });
                    newFeatures.forEach((f, i) => task.getContext().session.pushUpdate(task.layerId, f, task._originalFeatures[i]));
                    await handleRelation1_1LayerFields({ layerId: task.layerId, features: newFeatures, fields, task });
                    task.fireEvent('savedfeature', newFeatures);                 // called after saved
                    task.fireEvent(`savedfeature_${task.layerId}`, newFeatures); // called after saved using layerId
                    task.getContext().session.save();
                    return resolve();
                  }))
              )
              try {
                await promisify(g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').service.commit({ modal: false }));
                [...Workflow.Stack._workflows]
                  .reverse()
                  .filter(w => "function" === typeof w.getLastStep()._saveAll)
                  .forEach(w => {
                  const service = w.getContext().service; //form service
                  //need to set update form false because already saved on server
                  service.setUpdate(false, { force: false });
                  const feature = service.feature;
                  // Check if the feature is new.
                  // In this case, after commit, need to set new to false, and force update to false.
                  if (feature.isNew()) {
                    feature.state.new    = false;
                    service.force.update = false;
                  }
                  Object.entries(
                    w.getInputs().layer.getEditingSource().readFeatures()
                      .find(f => f.getUid() === feature.getUid()) //Find current form editing feature by unique id of feature uid
                      .getProperties() //get properties
                  )
                    .forEach(([k, v]) => {
                      const field = service.getFields().find(f => k === f.name);
                      //if field exists (geometry field is discarded)
                      if (field) {
                        field.value = field._value = v;
                      }
                    })
                })
              } catch(e) {
                console.warn(e);
              }
              this.loading = false;
            },
          },
        },
        buttons:         [
          {
            id:    'save',
            title:  this._isContentChild
              ? Workflow.Stack.getParent().getBackButtonLabel() || "plugins.editing.form.buttons.save_and_back" // get custom back label from parent
              : "plugins.editing.form.buttons.save",
            type:  "save",
            class: "btn-success",
            // save features
            cbk: async (fields) => {
              fields = this._multi ? fields.filter(f => null !== f.value) : fields;

              // skip when no fields
              if (0 === fields.length) {
                GUI.setModal(false);
                resolve(inputs);
                return;
              }

              const newFeatures = [];

              // @since 3.5.15
              GUI.setLoadingContent(true);
              GUI.disableContent(true);

              await Workflow.Stack.getCurrent().getContextService().saveDefaultExpressionFieldsNotDependencies();

              GUI.setLoadingContent(false);
              GUI.disableContent(false);

              this._features.forEach(f => {
                inputs.layer.setFieldsWithValues(f, fields);
                newFeatures.push(f.clone());
              });

              if (this._isContentChild) {
                inputs.relationFeatures = {
                  newFeatures,
                  originalFeatures: this._originalFeatures
                };
              }

              await this.fireEvent('saveform', { newFeatures, originalFeatures: this._originalFeatures});

              newFeatures.forEach((f, i) => context.session.pushUpdate(this.layerId, f, this._originalFeatures[i]));

              // check and handle if layer has relation 1:1
              await handleRelation1_1LayerFields({
                layerId:  this.layerId,
                features: newFeatures,
                fields,
                task:     this,
              });

              GUI.setModal(false);

              this.fireEvent('savedfeature', newFeatures);                 // called after saved
              this.fireEvent(`savedfeature_${this.layerId}`, newFeatures); // called after saved using layerId
              // In case of save of child it means that child is updated so also parent
              if (this._isContentChild) {
                Workflow.Stack.getParents().forEach(w => w.getContextService().setUpdate(true, { force: true }));
              }

              resolve(inputs);
            }
          },
          {
            id:    'cancel',
            title: "plugins.editing.form.buttons.cancel",
            type:  "cancel",
            class: "btn-danger",
            /// buttons in case of change
            eventButtons: {
              update: {
                false : {
                  id:    'close',
                  title: "close",
                  type:  "cancel",
                  class: "btn-danger",
                }
              }
            },
            cbk: () => {
              if (!this._isContentChild) {
                GUI.setModal(false);
                this.fireEvent('cancelform', inputs.features); // fire event cancel form to emit to subscrivers
              }
              reject(inputs);
            }
          }
        ]
      });

      // overwrite click on relation
      formService.handleRelation = async e => {
        // skip when multi editing
        if (this._multi) {
          GUI.showUserMessage({ type: 'info', message: 'plugins.editing.errors.editing_multiple_relations', duration: 3000, autoclose: true });
          return;
        }
        GUI.setLoadingContent(true);
        //set unique values for relation layer based on unique fields
        await setLayerUniqueFieldValues(inputs.layer.getRelationById(e.relation.name).getChild());
        formService.setCurrentComponentById(e.relation.name);
        GUI.setLoadingContent(false);
      }

      formService.addComponents([
        // custom form components
        ...(g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').state.formComponents[layerId] || []),
        // relation components (exlcude ONE relation + layer is the father get relation layers that set in editing on g3w-admin)
        ...getRelationsInEditingByFeature({
          layerId,
          relations: this._multi ? [] : inputs.layer.getRelations().getArray().filter(r => r.getType() !== 'ONE' && r.getFather() === layerId),
          feature:   this._multi ? false : inputs.features[inputs.features.length - 1],
        }).map(({ relation, relations }) => ({
          title:     "plugins.editing.edit_relation",
          name:      relation.name,
          id:        relation.id,
          header:    false,            // hide a header form
          component: Vue.extend({
            mixins: [ require('../components/FormRelation.vue') ],
            name: `relation_${Date.now()}`,
            data() {
              return { layerId, relation, relations };
            },
          }),
        }))
      ]);

      // fire openform event
      this.fireEvent('openform',
        {
          layerId: this.layerId,
          session: context.session,
          feature: this._originalFeature,
          formService
        }
      );

      // set context service to form Service in case of a single task (i.e., no workflow)
      if (Workflow.Stack.getCurrent()) {
        Workflow.Stack.getCurrent().setContextService(formService);
      }

      //listen eventually field relation 1:1 changes value
      listenRelation1_1FieldChange({ layerId: this.layerId, fields }).then(d => this._unwatchs = d);

      this.disableSidebar(true);
    })
    return $promisify(async () => {
      setAndUnsetSelectedFeaturesStyle({ promise: $promisify(promise), inputs, style: this.selectStyle });
      return promise;
    });
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
        2 === Workflow.Stack.getLength() && //open features table
        Workflow.Stack.getParent().isType('edittable')
      );

    // when the last feature of features is Array
    // and is resolved without setting form service
    // Ex. copy multiple features from another layer
    if (is_parent_table) {
      GUI.getService('map').disableClickMapControls(false);
    }

    const contextService = is_parent_table && Workflow.Stack.getCurrent().getContextService();

    // force update parent form update
    if (contextService && false === this._isContentChild) {
      contextService.setUpdate(false, { force: false });
    }

    GUI.closeForm({ pop: this.push || this._isContentChild });

    g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').resetCurrentLayout();

    this.fireEvent('closeform');
    this.fireEvent(`closeform_${this.layerId}`);

    this.layerId = null;
    this._unwatchs.forEach(unwatch => unwatch());
    this._unwatchs = [];

  }

}

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/opentabletask.js@v3.7.1
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/opentablestep.js@v3.7.1
 */
export class OpenTableStep extends Step {

  constructor(options = {}) {
    options.help = "editing.steps.help.edit_table";

    super(options);
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

    return $promisify(new Promise((resolve, reject) => {
      this._isContentChild = Workflow.Stack.getLength() > 1;
      const features       = (inputs.layer.readEditingFeatures() || []);
      const headers        = (inputs.layer.getEditingFields() || []).filter(h => features.length ? Object.keys(features[0].getProperties()).includes(h.name) : true);
      this._isContentChild = Workflow.Stack.getLength() > 1;
      const excludeFields  = this._isContentChild ? (context.excludeFields || []) : [];
      const service        = Object.assign(new G3WObject,
        {
          state: {
            inputs,
            context,
            promise: { resolve, reject },
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
          }
        }
      );

      GUI.showContent({
        content: new Component({
          title:             `${inputs.layer.getName()}`,
          push:              this._isContentChild,
          service,
          state:             service.state,
          internalComponent: new (Vue.extend(require('../components/Table.vue')))({ service }),
        }),
        push:       this._isContentChild,
        showgoback: false,
        closable:   false,
      });
    }))
  }

  /**
   *
   */
  stop() {
    this.disableSidebar(false);
    GUI[this._isContentChild ? 'popContent' : 'closeContent']();
    //reset the current plugin layout (right content) to application
    g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').resetCurrentLayout();
  }

}

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/pickfeaturetask.js@v3.7.1
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/pickfeaturestep.js@v3.7.1
 */
export class PickFeatureStep extends Step {

  constructor(options = {}) {
    options.help      = "editing.steps.help.pick_feature";
    options.highlight = options.highlight || false;
    options.multi     = options.multi || false;
    super(options);
  }

  run(inputs) {
    const promise = new Promise((resolve) => {
      this.addInteraction(
        new PickFeaturesInteraction({ layer: inputs.layer.getEditingLayer() }), {
          'picked': e => {
            if (0 === inputs.features.length) {
              inputs.features   = e.features;
              inputs.coordinate = e.coordinate;
            }
            if (this._steps) { this.setUserMessageStepDone('select') }
            resolve(inputs);
          },
        });
    })
    return $promisify(async () => {
      setAndUnsetSelectedFeaturesStyle({ promise: $promisify(promise), inputs, style: this.selectStyle });
      return promise;
    })
  }

}

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/selectelementstask.js@v3.7.1
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/selectelementsstep.js@v3.7.1
 */
export class SelectElementsStep extends Step {

  constructor(options = {}, chain) {
    options.help = options.help || "editing.steps.help.select_elements";

    super(options);

    this._selectInteractions    = [];
    this.multipleselectfeatures = [];
    this._originalStyle;
    this._vectorLayer;

    if (chain) {
      this.on('run', () => { this.emit('next-step', g3wsdk.core.i18n.tPlugin("editing.steps.help.select_elements")) });
    }
  }

  /**
   *
   * @param inputs
   * @param context
   * @returns {*}
   */
  run(inputs, context) {
    const layer      = inputs.layer;
    const type       = this._options.type || 'bbox'; // 'single' 'bbox' 'multiple';
    const buttonnext = 'multiple' === type && !!this._steps.select.buttonnext;

    return $promisify(new Promise((resolve, reject) => {

      if (buttonnext) {
        //check if it has already done handler function;
        const { done } = this._steps.select.buttonnext;
        this._steps.select.buttonnext.done = () => {
          if (done && done instanceof Function) { done() }
          resolve(inputs);
        }
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

              if (this._steps) { this.setUserMessageStepDone('select') }

              resolve(inputs);
            }
          }
        });
      }

      // add multiple select interactions
      if (['multiple', 'bbox'].includes(type) && ApplicationState.ismobile) {
        this._vectorLayer = new ol.layer.Vector({ source: new ol.source.Vector({}) });
        this.getMap().addLayer(this._vectorLayer);

        interactions.multi = new ol.interaction.Draw({ type: 'Circle', source: this._vectorLayer.getSource(), geometryFunction: ol.interaction.Draw.createBox() });

        interactions.multi.on('drawend', e => {
          const features = layer.getEditingLayer().getSource().getFeaturesInExtent(e.feature.getGeometry().getExtent());
          if (buttonnext) {
            addRemoveToMultipleSelectFeatures(features, inputs, this.multipleselectfeatures, this);
          } else {
            if (features.length > 0) {
              inputs.features     = features;
              this._originalStyle = setFeaturesSelectedStyle(features);
              if (this._steps) { this.setUserMessageStepDone('select') }
              setTimeout(() => resolve(inputs), 500);
            } else { reject() }
          }
        });
      }

      if (['multiple', 'bbox'].includes(type) && !ApplicationState.ismobile) {
        interactions.dragbox = new ol.interaction.DragBox({ condition: ol.events.condition.shiftKeyOnly });

        interactions.dragbox.on('boxend', () => {
          const features = [];
          const extent   = interactions.dragbox.getGeometry().getExtent();

          //https://openlayers.org/en/v5.3.0/apidoc/module-ol_source_Cluster-Cluster.html#forEachFeatureIntersectingExtent
          layer.getEditingLayer().getSource().forEachFeatureIntersectingExtent(extent, f => { features.push(f) });

          if (buttonnext) {
            addRemoveToMultipleSelectFeatures(features, inputs, this.multipleselectfeatures, this);
          } else {
            if (features.length > 0) {
              inputs.features     = features;
              this._originalStyle = setFeaturesSelectedStyle(features);

              if (this._steps) { this.setUserMessageStepDone('select') }

              resolve(inputs);
            } else {
              reject();
            }
          }
        });
      }

      // pick feature from external layer added to map
      if ('external' === type) {
        const geometryType     = layer.getGeometryType();
        const layerId          = layer.getId();
        const source           = layer.getEditingLayer().getSource();
        const { session }      = this.getContext();
        interactions.external  = new PickFeaturesInteraction({
          layers: GUI.getService('map').getExternalLayers()
            // filter external layer only vector - Exclude the
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
            reject();
            return;
          }
          const attributes = layer.getEditingFields();
          const geometry   = e.features[0].getGeometry();
          if (geometryType !== geometry.getType()) {
            e.feature.setGeometry(convertSingleMultiGeometry(geometry, geometryType));
          }
          const feature = new Feature({
            feature:    e.feature,
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
            resolve(inputs);
          });
        });
      }

      Object.values(interactions).forEach(i => this.addInteraction(i));
      this._selectInteractions.push(...Object.values(interactions));
    }));
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