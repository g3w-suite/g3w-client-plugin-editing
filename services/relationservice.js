import { Workflow }                                     from '../g3wsdk/workflow/workflow';
import { Step }                                         from '../g3wsdk/workflow/step';
import { setAndUnsetSelectedFeaturesStyle }             from '../utils/setAndUnsetSelectedFeaturesStyle';
import { promisify }                                    from '../utils/promisify';
import { getRelationFieldsFromRelation }                from '../utils/getRelationFieldsFromRelation';
import { getLayersDependencyFeatures }                  from '../utils/getLayersDependencyFeatures';
import { getEditingLayerById }                          from '../utils/getEditingLayerById';
import { convertFeaturesGeometryToGeometryTypeOfLayer } from '../utils/convertFeaturesGeometryToGeometryTypeOfLayer';
import { addTableFeature }                              from '../utils/addTableFeature';
import { PickFeaturesInteraction }                      from '../interactions/pickfeaturesinteraction';
import { VM }                                           from '../eventbus';

import {
  OpenFormStep,
  OpenTableStep,
  AddFeatureStep,
  ModifyGeometryVertexStep,
  MoveFeatureStep,
}                                           from '../workflows';

const { DataRouterService } = g3wsdk.core.data;
const { GUI }               = g3wsdk.gui;
const { tPlugin:t }         = g3wsdk.core.i18n;
const {
  PickFeatureInteraction,
  PickCoordinatesInteraction
}                           = g3wsdk.ol.interactions;
const { Layer }             = g3wsdk.core.layer;
const { Geometry }          = g3wsdk.core.geometry;
const { FormService }       = g3wsdk.gui.vue.services;


const color = 'rgb(255,89,0)';
// Vector styles for selected relation
const SELECTED_STYLES = {
  'Point':           new ol.style.Style({ image:  new ol.style.Circle({ radius: 8, fill: new ol.style.Fill({ color }) }) }),
  'MultiPoint':      new ol.style.Style({ image:  new ol.style.Circle({ radius: 8, fill: new ol.style.Fill({ color }) }) }),
  'Linestring':      new ol.style.Style({ stroke: new ol.style.Stroke({ width: 8, color }) }),
  'MultiLinestring': new ol.style.Style({ stroke: new ol.style.Stroke({ width: 8, color }) }),
  'Polygon':         new ol.style.Style({ stroke: new ol.style.Stroke({ width: 8, color }), fill: new ol.style.Fill({ color }) }),
  'MultiPolygon':    new ol.style.Style({ stroke: new ol.style.Stroke({ width: 8, color }), fill: new ol.style.Fill({ color }) }),
}

module.exports = class RelationService {

  constructor(layerId, options = {}) {

    const parentLayer = Workflow.Stack.getCurrent().getLayer();

    /**
     * Contain information about relation from parent layer and current relation layer (ex. child, fields, relationid, etc....)
     */
    this.relation = options.relation;

    /**
     * @type { Array } of a relations object id and fields linked to current parent feature (that is in editing)
     */
    this.relations = options.relations;

    /**
     * Current relation feature (in editing)
     * 
     * @since g3w-client-plugin*editing@v3.8.0
     */
    this.currentRelationFeatureId = null;

    /**
     * layer id of relation layer
     */
    this._relationLayerId = this.relation.child === layerId ? this.relation.father : this.relation.child;

    /**
     * layer in relation type
     */ 
    this._layerType = this.getLayer().getType();

    const { ownField: fatherRelationField } = getRelationFieldsFromRelation({ layerId, relation: this.relation });

    const pk = fatherRelationField.find(fRField => parentLayer.isPkField(fRField))

    /**
     * Father relation fields (editable and pk)
     */
    this.parent    = {
      // layerId is id of the parent of relation
      layerId,
      // get editable fields
      editable: fatherRelationField.filter(fRField => parentLayer.isEditingFieldEditable(fRField)),
      // check if father field is a pk and is not editable
      pk,
      // Check if the parent field is editable.
      // If not, get the id of parent feature so the server can generate the right value
      // to fill the field with the relation layer feature when commit
      values: fatherRelationField
        .reduce((accumulator, fField) => {
          //get feature
          const feature = Workflow.Stack.getCurrent().getCurrentFeature();
          //get fields of form because contains values that have temporary changes not yet saved
          // in case of form fields
          const fields  = Workflow.Stack.getCurrent().getInputs().fields;
          accumulator[fField] = (fField === pk && feature.isNew()) //check if isPk and parent feature isNew
            ? feature.getId()
              //check if fields are set (parent workflow is a form)
              // or for example, for feature property field value
            : fields ? fields.find(f => fField === f.name).value: feature.get(fField);
          return accumulator;
        }, {}),
    }

    ///////////////////////////////////////

    /**
     * editing a constraint type
     */
    this.capabilities = parentLayer.getEditingCapabilities();

    /**
     * relation tools
     */
    this.tools = [];

    this._add_link_workflow = ({
      [Layer.LayerTypes.TABLE]: {

        /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/edittableworkflow.js@v3.7.1 */
        link(options = {}) {
          return new Workflow({
            ...options,
            type: 'edittable',
            backbuttonlabel: 'plugins.editing.form.buttons.save_and_back_table',
            steps: [ new OpenTableStep() ],
          });
        },

        /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/addtablefeatureworkflow.js@v3.7.1 */
        add(options = {}) {
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
      [Layer.LayerTypes.VECTOR]: {

        /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/linkrelationworkflow.js@v3.7.1 */
        link(options = {}) {
          return new Workflow({
            type: 'linkrelation',
            steps: [
              new Step({
                ...options,
                help: "editing.steps.help.select_feature_to_relation",
                run(inputs, context) {
                  return $.Deferred(async d => {
                    GUI.setModal(false);
                    const editingLayer        = inputs.layer.getEditingLayer();
                    this._originalLayerStyle  = editingLayer.getStyle();

                    try {

                      if (context.beforeRun && 'function' === typeof context.beforeRun) {
                        await promisify(context.beforeRun());
                      }

                      let features = editingLayer.getSource().getFeatures();

                      if (context.excludeFeatures) {
                        features = features
                          .filter(feature => Object
                            .entries(context.excludeFeatures)
                            .reduce((bool, [field, value]) => bool && feature.get(field) != value, true)
                          )
                      }
                      this._stopPromise = $.Deferred();

                      setAndUnsetSelectedFeaturesStyle({
                        promise: this._stopPromise.promise(),
                        inputs: { layer: inputs.layer, features },
                        style: this.selectStyle
                      });

                      this.addInteraction(
                        new PickFeatureInteraction({ layers: [editingLayer], features }), {
                        'picked': e => {
                          inputs.features.push(e.feature); // push relation
                          GUI.setModal(true);
                          d.resolve(inputs);
                        }
                      });
                    } catch (e) {
                      console.warn(e);
                      d.reject(e);
                    }
                  }).promise();
                },
                stop() {
                  GUI.setModal(true);
                  this._originalLayerStyle    = null;
                  if (this._stopPromise) {
                    this._stopPromise.resolve(true);
                  }
                  return true;
                },
              })
            ]
          });
        },

        /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/addfeatureworkflow.js@v3.7.1 */
        add(options = {}) {
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

        /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/selectandcopyfeaturesfromotherlayerworkflow.js@v3.7.1 */
        selectandcopy(options = {}) {
          return new Workflow({
            type: 'selectandcopyfeaturesfromotherlayer',
            steps: [
              // pick project layer features
              new Step({
                ...options,
                help: "editing.steps.help.pick_feature",
                run(inputs, context) {
                  /** @TODO Create a component that ask which project layer would like to query */
                  if (!options.copyLayer) {
                    return $.Deferred(d => d.resolve()).promise();
                  }
                  return $.Deferred(async d => {
                    // get features from copyLayer
                    let features             = [];
                    const geometryType       = inputs.layer.getGeometryType();
                    // interaction promise
                    await (new Promise(async resolve => {
                      /** @TODO NO VECTOR LAYER */
                      if (!options.isVector) {
                        return resolve();
                      }
                      this.addInteraction(
                        options.external
                          ? new PickFeaturesInteraction({ layer: options.copyLayer })
                          : new PickCoordinatesInteraction(), {
                        'picked': async e => {
                          try {
                            features = convertFeaturesGeometryToGeometryTypeOfLayer({
                              geometryType,
                              features: (options.external
                                ? [{ features: e.features }]                             // external layer
                                : await DataRouterService.getData('query:coordinates', { // TOC/PROJECT layer
                                  inputs: {
                                    coordinates: e.coordinate,
                                    query_point_tolerance: ProjectsRegistry.getCurrentProject().getQueryPointTolerance(),
                                    layerIds: [options.copyLayer.getId()],
                                    multilayers: false
                                  },
                                  outputs: null
                                }))[0].features,
                            });
                          } catch(e) {
                            console.warn(e);
                            d.reject(e);
                          } finally {
                            resolve();
                          }
                        }
                      });
                    }));
                    if (features.length) {
                      inputs.features = features;
                      d.resolve(inputs);
                    } else {
                      GUI.showUserMessage({
                        type: 'warning',
                        message: 'plugins.editing.messages.no_feature_selected',
                        closable: false,
                        autoclose: true
                      });
                      d.reject();
                    }
                  }).promise();
                },
              }),
              // copy features from other project layer
              new Step({
                ...options,
                help: "editing.steps.help.draw_new_feature",
                run(inputs, context) {
                  return $.Deferred(d => new (Vue.extend(require('../components/CopyFeaturesFromOtherProjectLayer.vue')))({
                    inputs,
                    context,
                    promise: d,
                    service: this,
                    copyLayer: options.copyLayer,
                    external:  options.external,
                    isVector:  options.isVector,
                  })).promise();
                }
              }),
              new OpenFormStep(options),
            ],
            registerEscKeyEvent: true,
          });
        },

      },
    })[this._layerType];

    // add tools for each relation
    this.relations.forEach((r) => this.addTools(r.id) );

  }

  /**
   * Enable/Disable elements
   * 
   * @param { Boolean } bool true enabled
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  enableDOMElements(bool = true) {

    document.querySelectorAll('.editing-save-all-form').forEach(c => {

      if (bool && c.classList.contains('g3w-disabled')) { c.classList.remove('g3w-disabled'); }

      if (!bool && !c.querySelector('.save-all-icon').classList.contains('g3w-disabled')) { c.classList.add('g3w-disabled'); }

    });

    document.querySelectorAll('.g3w-editing-relations-add-link-tools, .g3wform_footer').forEach(c => c.classList.toggle('g3w-disabled', !bool))

  }

  /**
   * Return editing capabilities
   * @returns {*|{parent: *, relation: *}}
   */
  getEditingCapabilities() {
    return this.capabilities;
  }

  /**
   * Add relation tools
   */
  addTools(id) {

    const tools = [

      // edit attributes
      this.capabilities.includes('change_attr_feature') && {
        state: Vue.observable({
          icon:   'editAttributes.png',
          id:     `${id}_editattributes`,
          name:   'editing.tools.update_feature',
          enabled: true,
          active:  false,
        }),
        type: 'editfeatureattributes',
      },

      // delete feature
      this.capabilities.includes('delete_feature') && {
        state: Vue.observable({
          icon:   'deleteTableRow.png',
          id:     `${id}_deletefeature`,
          name:   'editing.tools.delete_feature',
          enabled: true,
          active:  false,
        }),
        type: 'deletefeature',
      },

      // other vector tools (e.g., move feature)
      this.capabilities.includes('change_feature') && Layer.LayerTypes.VECTOR === this._layerType && (
        g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing')
          .getToolBoxById(this._relationLayerId)
          .getTools()
          .filter(t => Geometry.isPointGeometryType(this.getLayer().getGeometryType())
              ? 'movefeature' === t.getId()                       // Point geometry
              : ['movefeature', 'movevertex'].includes(t.getId()) // Line or Polygon
          )
          .map(tool => ({
            state: Vue.observable({ ...tool.state, id: `${id}_${tool.state.id}` }),
            type: tool.getOperator().type,
          }))
      )

    ].flat().filter(Boolean);

    this.tools.push(tools);
    return tools;
  }

  /**
   * @returns {[]}
   */
  getTools(index) {
    return this.tools[index] || this.addTools(this.relations[index].id);
  }

  /**
   * @param relationtool
   * @param index
   * 
   * @returns {Promise<unknown>}
   */
  async startTool(relationtool, index) {
    relationtool.state.active = !relationtool.state.active;
    
    // skip when ..
    if (!relationtool.state.active) {
      return Promise.resolve();
    }

    this.tools.forEach(tools => {
      tools.forEach(t => { if (relationtool.state.id !== t.state.id) { t.state.active = false; } })
    });

    await VM.$nextTick();

    // do something with map features

    const d = {};
    const promise = new Promise((resolve, reject) => { Object.assign(d, { resolve, reject }) })

    const is_vector       = Layer.LayerTypes.VECTOR === this._layerType;
    const relation        = this.relations[index];
    const toolId          = relationtool.state.id.split(`${relation.id}_`)[1];
    const relationfeature = this.getLayer().getEditingSource().getFeatureById(relation.id);
    const featurestore    = this.getLayer().getEditingSource();
    const selectStyle     = is_vector && SELECTED_STYLES[this.getLayer().getGeometryType()]; // get selected vector style
    const options         = this._createWorkflowOptions({ features: [relationfeature] });

    // DELETE FEATURE RELATION
    if ('deletefeature' === toolId) {

      setAndUnsetSelectedFeaturesStyle({ promise, inputs: { features: [ relationfeature ], layer: this.getLayer() }, style: selectStyle })

      GUI.dialog.confirm(
        t("editing.messages.delete_feature"),
          res => {
            //confirm to delete
            if (res) {
              Workflow.Stack.getCurrent().getSession().pushDelete(this._relationLayerId, relationfeature);
              this.relations.splice(index, 1); // remove feature from relation features
              this.tools.splice(index, 1);     // remove tool from relation tools
              // remove relation layer unique field values from feature
              let layerId          = this._relationLayerId;
              let relationLayerId  = this.parent.layerId;
              let feature          = relationfeature;
              const layer          = g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').state.uniqueFieldsValues[relationLayerId];
              const fields         = g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').state.uniqueFieldsValues[layerId];

              /** @FIXME add description */
              if (undefined === layer || undefined === fields) {
                return;
              }

              /** @FIXME add description */
              if (undefined === layer.__uniqueFieldsValuesRelations) {
                layer.__uniqueFieldsValuesRelations = {};
              }

              Object
                .keys(feature.getProperties())
                .forEach(property => {
                  /** @FIXME add description */
                  if (undefined === layer.__uniqueFieldsValuesRelations[layerId]) {
                    layer.__uniqueFieldsValuesRelations[layerId] = {};
                  }
                  /** @FIXME add description */
                  if (undefined !== fields[property]) {
                    const values = new Set(fields[property]);
                    values.delete(feature.get(property));
                    layer.__uniqueFieldsValuesRelations[layerId][property] = values;
                  }
                });

              featurestore.removeFeature(relationfeature);
              // check if relation feature delete is new.
              // In this case, we need to check if there are temporary changes not related to this current feature
              if (
                  relationfeature.isNew()
                  && undefined === Workflow.Stack
                    ._workflows
                    .find(w => w.getSession()._temporarychanges.filter(({ feature }) => relationfeature.getUid() !== feature.getUid()).length > 0)
              ) {
                Workflow.Stack._workflows
                  .filter(w => w.getContextService() instanceof FormService)
                  .forEach(w => setTimeout(() => w.getContextService().state.update = false));
              } else {
                //set parent workflow update
                this.updateParentWorkflows();
              }
              d.resolve(res);
            }

            if (!res) {
              d.reject();
            }

          }
      );
    }

    // EDIT ATTRIBUTE FEATURE RELATION
    if ('editattributes' === toolId) {
      /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/edittablefeatureworkflow.js@v3.7.1 */
      const workflow = new Workflow({ type: 'edittablefeature', steps: [ new OpenFormStep({ selectStyle }) ] });

      try {
        await promisify(workflow.start(options));

        //get relation layer fields
        this
          .getLayer()
          .getFieldsWithValues(relationfeature, { relation: true })
          .forEach(f => {
            relation.fields
              .forEach(rf => {
                //in case of sync feature get data value of sync feature
                if (rf.name === f.name) { rf.value = f.value; }
              })
          });
        d.resolve(true);
      } catch(e) {
        console.warn(e);
        d.reject(e);
      }

      workflow.stop();
    }

    // zoom to relation vector feature
    if (['movevertex', 'movefeature'].includes(toolId) && this.currentRelationFeatureId !== relationfeature.getId()) {
      this.currentRelationFeatureId = relationfeature.getId();
      GUI.getService('map').zoomToFeatures([ relationfeature ]);
    }

    // MOVE vertex or MOVE feature tool
    if (['movevertex', 'movefeature'].includes(toolId)) {
      // disable modal and buttons (saveAll and back)
      GUI.setModal(false);
      this.enableDOMElements(false);
      const workflow = new Workflow({
        type: relationtool.type,
        steps: [ new {
          'movevertex':  ModifyGeometryVertexStep,
          'movefeature': MoveFeatureStep,
        }[toolId]({ selectStyle }) ]
      });

      // watch eventually deactive when another tool is activated
      const unwatch = VM.$watch(
        () => relationtool.state.active,
        bool => {
          if (!bool) {
            //need to enable saveAll and back
            this.enableDOMElements(true);
            GUI.setModal(true);
            workflow.unbindEscKeyUp();
            workflow.stop();
            unwatch();
            d.reject(false);
          }
        }
      )
      // bind listen esc key
      workflow.bindEscKeyUp(() => {
        GUI.setModal(true);
        unwatch();
        d.reject(false);
      });

      try {
        await promisify(workflow.start(options));

        Workflow.Stack
          .getParents()
          .filter(w => w.getContextService().setUpdate)
          .forEach(w => w.getContextService().setUpdate(true, { force: true }));
        d.resolve(true);
        setTimeout(() => this.startTool(relationtool, index));
      } catch(e) {
        console.warn(e);
        d.reject(e);
      }

      workflow.unbindEscKeyUp();
      workflow.stop();
      unwatch();
    }

    try {
      await promise;
    } catch (e) {
      console.trace('START TOOL FAILED', e);
      return Promise.reject(e);
    } finally {
      relationtool.state.active = false;
    }
  }

  /**
   * force parent workflow form service to update
   */
  updateParentWorkflows() {
    (Workflow.Stack.getParents() || [Workflow.Stack.getCurrent()])
      .forEach(workflow => {
        //check if workflow has service (form service)
        if (workflow.getContextService()) {
          workflow
            .getContextService()
            .setUpdate(true, {force: true})
        }
      });
  }

  /**
   * @returns {*}
   */
  getLayer() {
    return getEditingLayerById(this._relationLayerId);
  }

  /**
   * @returns {*}
   */
  getEditingLayer() {
    return g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').getEditingLayer(this._relationLayerId);
  }

  /**
   * Add Relation from project layer
   * 
   * @param layer
   * @param external
   */
  addRelationFromOtherLayer({ layer, external }) {
    let workflow;
    let isVector = false;
    if (external || layer.isGeoLayer() ) {
      isVector = true;
      workflow = new this._add_link_workflow.selectandcopy({
        copyLayer: layer,
        isVector,
        external,
        help: 'editing.steps.help.copy',
      });
    }

    this.runAddRelationWorkflow({
      workflow,
      isVector
    })
  }

  /**
   * add relation method
   */
  addRelation() {
    this.runAddRelationWorkflow({
      workflow: new this._add_link_workflow.add(),
      isVector: Layer.LayerTypes.VECTOR === this._layerType,
    })
  }

  /**
   * Common method to add a relation
   */
  async runAddRelationWorkflow({ workflow, isVector = false } = {} ) {

    if (isVector) {
      GUI.setModal(false);
      GUI.hideContent(true);
    }

    const options = this._createWorkflowOptions();

    const { ownField, relationField } = getRelationFieldsFromRelation({
      layerId:  this._relationLayerId,
      relation: this.relation
    });

    try {
      const outputs = await promisify(workflow.start(options));

      if (isVector) { workflow.bindEscKeyUp(); }
      
      const { newFeatures, originalFeatures } = outputs.relationFeatures;

      // Set Relation child feature value
      const setRelationFieldValue = ({ oIndex, value }) => {
        newFeatures.forEach((newFeature, i) => {
          newFeature.set(ownField[oIndex], value);
          if (options.parentFeature.isNew()) {
            originalFeatures[i].set(ownField[oIndex], value);
          }
          this.getLayer().getEditingSource().updateFeature(newFeature);
          options.context.session.pushUpdate(this._relationLayerId, newFeature, originalFeatures[i]);
        })
      };

      Object
        .entries(this.parent.values)
        .forEach(([field, value]) => {
          setRelationFieldValue({
            oIndex: relationField.findIndex(rField => field === rField),
            value
          });
        });

      //check if parent feature is new and if parent layer has editable fields
      if (options.parentFeature.isNew() && this.parent.editable.length > 0) {
        const keyRelationFeatureChange = options.parentFeature.on('propertychange', evt => {
          if (options.parentFeature.isNew()) {
            //check if input is relation field
            if (relationField.find(evt.key)) {
              //set value to relation field
              setRelationFieldValue({
                oIndex: relationField.findIndex(rField => evt.key === rField),
                value:  evt.target.get(evt.key)
              });
            }
          } else {
            ol.Observable.unByKey(keyRelationFeatureChange);
          }
        })
      }

      this.relations.push(
        ...(newFeatures || []).map(f => ({ id: f.getId(), fields: this.getLayer().getFieldsWithValues(f, { relation: true }) }))
      )

    } catch(inputs) {
      console.warn(inputs);

      // in case of save all pressed on openformtask
      if (inputs && inputs.relationFeatures) {
        this.relations.push(
          ...(inputs.relationFeatures.newFeatures || []).map(f => ({ id: f.getId(), fields: this.getLayer().getFieldsWithValues(f, { relation: true }) }))
        )
      }

      options.context.session.rollbackDependecies([this._relationLayerId])
    }
    
    workflow.stop();

    if (isVector) {
      workflow.unbindEscKeyUp();
      GUI.hideContent(false);
      GUI.setModal(true);
    }
  }

  /**
   * Link relation (bind) to parent feature layer
   */
  async linkRelation() {
    const is_vector = Layer.LayerTypes.VECTOR === this._layerType;
    const workflow = new this._add_link_workflow.link( is_vector ? {
      selectStyle: SELECTED_STYLES[this.getLayer().getGeometryType()]
    } : {});
    const options  = this._createWorkflowOptions();
    const { ownField, relationField } = getRelationFieldsFromRelation({
      layerId:  this._relationLayerId,
      relation: this.relation
    });

    //add options to exclude features from a link
    options.context.excludeFeatures = relationField.reduce((accumulator, rField, index) => {
      accumulator[ownField[index]] = this.parent.values[rField];
      return accumulator;
    }, {});


    //check if a vector layer
    if (is_vector) {
      GUI.setModal(false);
    }

    const feature = Workflow.Stack.getCurrent().getCurrentFeature();

    const getRelationFeatures = () => getLayersDependencyFeatures(this.parent.layerId, {
      relations:  [this.relation],
      feature,
      operator:   'not',
      filterType: is_vector ? 'bbox' : 'fid'
    });

    let response = {
      promise: undefined,
      showContent: false,
    };

    if (is_vector) {
      options.context.beforeRun = async () => {
        await new Promise((resolve) => setTimeout(resolve));
        await getRelationFeatures();
      };

      workflow.bindEscKeyUp();

      response = {
        promise:     workflow.start(options),
        showContent: true
      };

      this.enableDOMElements(false);

    } else {
      await getRelationFeatures();
    }

    let linked = false;

    try {
      const outputs = await promisify(response.promise || workflow.start(options));
      // loop on features selected
      (outputs.features || []).forEach(relation => {
        if (undefined === this.relations.find(rel => rel.id === relation.getId())) {
          linked = linked || true;
          const originalRelation = relation.clone();
          Object
            .entries(this.parent.values)
            .forEach(([field, value]) => {
              relation.set(ownField[relationField.findIndex(rF => field === rF)], value);
            })
            Workflow.Stack.getCurrent().getSession().pushUpdate(this._relationLayerId , relation, originalRelation);
          this.relations.push({
            fields: this.getLayer().getFieldsWithValues(relation, { relation: true }),
            id:     relation.getId()
          });
        } else {
          // in case already present
          GUI.notify.warning(t("editing.relation_already_added"));
        }
      });
    } catch (e) {
      console.warn(e);
      options.context.session.rollbackDependecies([this._relationLayerId]);
    }

    if (is_vector) {
      this.enableDOMElements(true);
    }

    if (response.showContent) {
      GUI.closeUserMessage();
      workflow.unbindEscKeyUp();
    }

    if (linked) {
      this.updateParentWorkflows();
    }

    workflow.stop();
  }

  /**
   * Method to unlink relation
   * @param index
   * @param dialog
   * @returns JQuery Promise
   */
  unlinkRelation(index, dialog = true) {
    const d            = $.Deferred();
    const { ownField } = getRelationFieldsFromRelation({
      layerId:  this._relationLayerId,
      relation: this.relation
    });
    const unlink = () => {
      const relation         = this.relations[index];
      const feature          = this.getLayer().getEditingSource().getFeatureById(relation.id);
      const originalRelation = feature.clone();
      //loop on ownField (Array field child relation)
      ownField.forEach(oField => feature.set(oField, null))

      Workflow.Stack.getCurrent().getSession().pushUpdate(this._relationLayerId, feature, originalRelation);
      this.relations.splice(index, 1);
      this.updateParentWorkflows();
      d.resolve(true);
    };
    if (dialog) {

      GUI.dialog.confirm(
        t("editing.messages.unlink_relation"),
        result => {
          if (result) { unlink() }
          else { d.reject(false) }
        }
      )
    } else { unlink() }

    return d.promise();
  }


  /**
   * @param options
   * 
   * @returns {{parentFeature, inputs: {features: *[], layer: *}, context: {fatherValue: *, session: *, fatherField: *, excludeFields: *[]}}}
   * 
   * @private
   */
  _createWorkflowOptions(options = {}) {
    const fields = getRelationFieldsFromRelation({
      layerId:  this._relationLayerId,
      relation: this.relation
    });
    const parent = Object.entries(this.parent.values);
    return  {
      parentFeature:   Workflow.Stack.getCurrent().getCurrentFeature(), // get parent feature
      context: {
        session:       Workflow.Stack.getCurrent().getSession(),        // get parent workflow
        excludeFields: fields.ownField,                                 // array of fields to be excluded
        fatherValue:   parent.map(([_, value]) => value),
        fatherField:   parent.map(([field]) => fields.ownField[fields.relationField.findIndex(rField => field === rField)]),
      },
      inputs: {
        features: options.features || [],
        layer:    this.getLayer()
      }
    };
  }
};