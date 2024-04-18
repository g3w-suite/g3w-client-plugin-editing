import { EditingWorkflow }                  from '../g3wsdk/workflow/workflow';
import { setAndUnsetSelectedFeaturesStyle } from '../utils/setAndUnsetSelectedFeaturesStyle';
import { promisify }                        from '../utils/promisify';
import { VM }                               from '../eventbus';

import {
  OpenFormStep,
  LinkRelationStep,
  PickProjectLayerFeaturesStep,
  CopyFeaturesFromOtherProjectLayerStep,
  AddTableFeatureStep,
  OpenTableStep,
  AddFeatureStep,
  ModifyGeometryVertexStep,
  MoveFeatureStep,
}                                           from '../workflows';

const { GUI }            = g3wsdk.gui;
const { tPlugin:t }      = g3wsdk.core.i18n;
const { Layer }          = g3wsdk.core.layer;
const { WorkflowsStack } = g3wsdk.core.workflow;
const { Geometry }       = g3wsdk.core.geometry;

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

    const parentLayer = this.getEditingService().getCurrentWorkflow().getLayer();

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
     * @since g3w-client-plugin*editing@3.8.0
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

    const { ownField: fatherRelationField } = this.getEditingService()._getRelationFieldsFromRelation({ layerId, relation: this.relation });

    const parentPK = fatherRelationField.find(fRField => parentLayer.isPkField(fRField) && !parentLayer.isEditingFieldEditable(fRField))

    /**
     * Father relation fields (editable and pk)
     */
    this.parent    = {
      // layerId is id of the parent of relation
      layerId,
      // get editable fields
      editable: fatherRelationField.filter(fRField => parentLayer.isEditingFieldEditable(fRField)),
      // check if father field is a pk and is not editable
      pk: parentPK,
      // Check if the parent field is editable.
      // If not, get the id of parent feature so the server can generate the right value
      // to fill the field with the relation layer feature when commit
      values:   fatherRelationField
        .reduce((accumulator, fField) => {
          accumulator[fField] = fField === parentPK //check if isPk
            ? this.getEditingService().getCurrentWorkflowData().feature.getId()
            : this.getEditingService().getCurrentWorkflowData().feature.get(fField);
          return accumulator;
        }, {}),
    }

    ///////////////////////////////////////

    /**
     * editing constraint type
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
          return new EditingWorkflow({
            ...options,
            type: 'edittable',
            backbuttonlabel: 'plugins.editing.form.buttons.save_and_back_table',
            steps: [ new OpenTableStep() ],
          });
        },

        /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/addtablefeatureworkflow.js@v3.7.1 */
        add(options = {}) {
          return new EditingWorkflow({
            ...options,
            type: 'addtablefeature',
            steps: [
              new AddTableFeatureStep(),
              new OpenFormStep(),
            ],
          });
        },

      },
      [Layer.LayerTypes.VECTOR]: {

        /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/linkrelationworkflow.js@v3.7.1 */
        link() {
          return new EditingWorkflow({
            type: 'linkrelation',
            steps: [
              new LinkRelationStep()
            ]
          });
        },

        /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/addfeatureworkflow.js@v3.7.1 */
        add(options = {}) {
          const w = new EditingWorkflow({
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
        selectandcopy(options) {
          return new EditingWorkflow({
            type: 'selectandcopyfeaturesfromotherlayer',
            steps: [
              new PickProjectLayerFeaturesStep(options),
              new CopyFeaturesFromOtherProjectLayerStep(options),
              new OpenFormStep(options),
            ],
            registerEscKeyEvent: true,
          });
        },

      },
    })[this._layerType];

    // add tools for each relation
    this.relations.forEach((_, i) => this.addTools(i) );

  }

  /**
   * Enable/Disable elements
   * 
   * @param { Boolean } bool true enabled
   * 
   * @since g3w-client-plugin-editing@3.8.0
   */
  enableDOMElements(bool = true) {
    document
      .querySelectorAll('.editing-save-all-form, .g3w-editing-relations-add-link-tools, .g3wform_footer')
      .forEach(c => c.classList.toggle('g3w-disabled', !bool))
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
  addTools(index) {

    const tools = [

      // edit attributes
      this.capabilities.includes('change_attr_feature') && {
        state: Vue.observable({
          icon:   'editAttributes.png',
          id:     `${index}_editattributes`,
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
          id:     `${index}_deletefeature`,
          name:   'editing.tools.delete_feature',
          enabled: true,
          active:  false,
        }),
        type: 'deletefeature',
      },

      // other vector tools (eg. move feature)
      this.capabilities.includes('change_feature') && Layer.LayerTypes.VECTOR === this._layerType && (
        this
          .getEditingService()
          .getToolBoxById(this._relationLayerId)
          .getTools()
          .filter(t => Geometry.isPointGeometryType(this.getLayer().getGeometryType())
              ? 'movefeature' === t.getId()                       // Point geometry
              : ['movefeature', 'movevertex'].includes(t.getId()) // Line or Polygon
          )
          .map(tool => ({
            state: Vue.observable({ ...tool.state, id: `${index}_${tool.state.id}` }),
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
    return this.tools[index] || this.addTools(index);
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
    const toolId          = relationtool.state.id.split(`${index}_`)[1];
    const relation        = this.relations[index];
    const relationfeature = this.getLayer().getEditingSource().getFeatureById(relation.id);
    const featurestore    = this.getLayer().getEditingSource();
    const selectStyle     = is_vector && SELECTED_STYLES[this.getLayer().getGeometryType()]; // get selected vector style
    const options         = this._createWorkflowOptions({ features: [relationfeature] });

    // DELETE FEATURE RELATION
    if ('deletefeature' === toolId) {

      setAndUnsetSelectedFeaturesStyle({ promise, inputs: { features: [ relationfeature ], layer: this.getLayer() }, style: selectStyle })

      GUI.dialog.confirm(
        t("editing.messages.delete_feature"),
        result => {
          // skip when ..
          if (!result) {
            d.reject(result);
            return;
          }
          this.getEditingService().getCurrentWorkflowData().session.pushDelete(this._relationLayerId, relationfeature);
          this.relations.splice(index, 1); // remove feature from relations featues
          this.tools.splice(index, 1);     // remove tool from relation tools
          this.getEditingService().removeRelationLayerUniqueFieldValuesFromFeature({
            layerId: this._relationLayerId,
            relationLayerId: this.parent.layerId,
            feature: relationfeature
          });
          featurestore.removeFeature(relationfeature);
          this.updateParentWorkflows();
          d.resolve(result);
        }
      );
    }

    // zoom to relation vector feature
    if (['movevertex', 'movefeature'].includes(toolId) && this.currentRelationFeatureId !== relationfeature.getId()) {
      this.currentRelationFeatureId = relationfeature.getId();
      GUI.getService('map').zoomToFeatures([ relationfeature ]);
    }

    // disable modal and buttons (saveAll and back)
    if (['movevertex', 'movefeature'].includes(toolId)) {
      GUI.setModal(false);
      this.enableDOMElements(false);
    }

    // EDIT ATTRIBUTE FEATURE RELATION
    if ('editattributes' === toolId) {
      /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/edittablefeatureworkflow.js@v3.7.1 */
      const workflow = new EditingWorkflow({ type: 'edittablefeature', steps: [ new OpenFormStep({ selectStyle }) ] });

      try {
        await promisify(workflow.start(options));

        //get relation layer fields
        this
          .getLayer()
          .getFieldsWithValues(relationfeature, { relation: true })
          .forEach(_field => {
            relation.fields
              .forEach(field => {
                if (field.name === _field.name) {
                  //in case of sync feature get data value of sync feature
                  field.value = _field.value;
                }
              })
          });
        d.resolve(true);
      } catch (e) {
        console.warn(e);
        d.reject(e);
      }

      workflow.stop();
    }

    // MOVE vertex or MOVE feature tool
    if (['movevertex', 'movefeature'].includes(toolId)) {
      const workflow = new EditingWorkflow({
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

        WorkflowsStack
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
    (WorkflowsStack.getParents() || [this.getEditingService().getCurrentWorkflow()])
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
    return this.getEditingService().getLayerById(this._relationLayerId);
  }

  /**
   * @returns {*}
   */
  getEditingLayer() {
    return this.getEditingService().getEditingLayer(this._relationLayerId);
  }

  /**
   * @returns {*|EditingService|{}}
   */
  getEditingService() {
    return require('./editingservice');
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
    const { ownField, relationField } = this.getEditingService()._getRelationFieldsFromRelation({
      layerId:  this._relationLayerId,
      relation: this.relation
    });

    try {
      const outputs = await promisify(workflow.start(options));

      if (isVector) {
        workflow.bindEscKeyUp();
      }
      
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

      //check if parent features are new and if parent layer has editable fields
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
    const isVector = Layer.LayerTypes.VECTOR === this._layerType;
    const workflow = new this._add_link_workflow.link();
    const options  = this._createWorkflowOptions();
    const { ownField, relationField } = this.getEditingService()._getRelationFieldsFromRelation({
      layerId:  this._relationLayerId,
      relation: this.relation
    });

    //add options to exclude features from a link
    options.context.excludeFeatures = relationField.reduce((accumulator, rField, index) => {
      accumulator[ownField[index]] = this.parent.values[rField];
      return accumulator;
    }, {});


    //check if a vector layer
    if (isVector) {
      GUI.setModal(false);
      GUI.hideContent(true);
      options.context.style = this.getUnlinkedStyle();
    }

    const { feature } = this.getEditingService().getCurrentWorkflowData();

    const getRelationFeatures = () => this.getEditingService().getLayersDependencyFeatures(this.parent.layerId, {
      relations:  [this.relation],
      feature,
      operator:   'not',
      filterType: isVector ? 'bbox' : 'fid'
    });

    let response = {
      promise: undefined,
      showContent: false,
    };

    if (!isVector) {
      await getRelationFeatures();
    } else {
      options.context.beforeRun = async () => {
        const map = this.getEditingService().getMapService();
        map.showMapSpinner();
        await new Promise((resolve) => setTimeout(resolve));
        await getRelationFeatures();
        map.hideMapSpinner();
        GUI.showUserMessage({
          type: 'info',
          size: 'small',
          message: t('editing.messages.press_esc'),
          closable: false
        })
      };

      workflow.bindEscKeyUp();

      response = {
        promise: workflow.start(options),
        showContent: true
      };
    }

    let linked = false;

    try {
      const outputs = promisify(response.promise || workflow.start(options));
      // loop on features selected
      (outputs.features || []).forEach(relation => {
        if (undefined === this.relations.find(rel => rel.id === relation.getId())) {
          linked = linked || true;
          const originalRelation = relation.clone();
          Object
            .entries(this.parent.values)
            .forEach(([field, value]) => {
              relation.set(ownField[relationField.findIndex(rField => field === rField)], value);
            })
          this.getEditingService().getCurrentWorkflowData().session.pushUpdate(this._relationLayerId , relation, originalRelation);
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

    if (response.showContent) {
      GUI.closeUserMessage();
      GUI.hideContent(false);
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
  unlinkRelation(index, dialog= true) {
    const d            = $.Deferred();
    const { ownField } = this.getEditingService()._getRelationFieldsFromRelation({
      layerId:  this._relationLayerId,
      relation: this.relation
    });
    const unlink = () => {
      const relation         = this.relations[index];
      const feature          = this.getLayer().getEditingSource().getFeatureById(relation.id);
      const originalRelation = feature.clone();
      //loop on ownField (Array field child relation)
      ownField.forEach(oField => feature.set(oField, null))

      this.getEditingService().getCurrentWorkflowData().session.pushUpdate(this._relationLayerId, feature, originalRelation);
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
    const fields = this.getEditingService()._getRelationFieldsFromRelation({
      layerId:  this._relationLayerId,
      relation: this.relation
    });
    const data   = this.getEditingService().getCurrentWorkflowData();
    const parent = Object.entries(this.parent.values);
    return  {
      parentFeature: data.feature,               // get parent feature
      context: {
        session: data.session,                   // get parent workflow
        excludeFields: fields.ownField,          // array of fields to be excluded
        fatherValue: parent.map(([_, value]) => value),
        fatherField: parent.map(([field]) => fields.ownField[fields.relationField.findIndex(rField => field === rField)]),
      },
      inputs: {
        features: options.features || [],
        layer:    this.getLayer()
      }
    };
  }

  /**
   * @returns {ol.style.Style}
   */
  getUnlinkedStyle() {
    let style;
    const type = this.getLayer().getGeometryType();

    // get relation as father style color
    const _getColor = (type) => {
      const fatherLayerStyle = this.getEditingLayer(this.parent.layerId).getStyle();
      let style; // father layer style
      switch (type) {
        case 'Point':
          style = fatherLayerStyle.getImage() && fatherLayerStyle.getImage().getFill();
          break;
        case 'Line':
          style = fatherLayerStyle.getStroke() || fatherLayerStyle.getFill();
          break;
        case 'Polygon':
          style = fatherLayerStyle.getFill() || fatherLayerStyle.getStroke();
          break;
      }
      return (style && style.getColor()) || '#000';
    }

    switch (type) {
      case 'Point':
      case 'MultiPoint':
        style = new ol.style.Style({
          image: new ol.style.Circle({
            radius: 8,
            fill:   new ol.style.Fill({ color: _getColor('Point') }),
            stroke: new ol.style.Stroke({ width: 5, color:  'yellow' })
          })
        });
        break;
      case 'Line':
      case 'MultiLine':
        style = new ol.style.Style({
          fill:   new ol.style.Fill({ color: _getColor('Line') }),
          stroke: new ol.style.Stroke({ width: 5, color: 'yellow' })
        });
        break;
      case 'Polygon':
      case 'MultiPolygon':
        style =  new ol.style.Style({
          stroke: new ol.style.Stroke({ width: 5, color: 'yellow' }),
          fill:   new ol.style.Fill({ opacity: 0.5, color: _getColor('Polygon') })
        })
    }

    return style;
  }

};