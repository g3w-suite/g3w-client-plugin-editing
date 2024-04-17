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

const RelationService = function(layerId, options = {}) {

  /**
   * layerId is id of the parent of relation
   */
  this._parentLayerId  = layerId;
  this._parentWorkFlow = this.getCurrentWorkflow();
  this._parentLayer    = this._parentWorkFlow.getLayer();

  /**
   * Contain information about relation from parent layer and current relation layer (ex. child, fields, relationid, etc....)
   */
  this.relation = options.relation;

  /**
   * @type { Array } of a relations object id and fields linked to current parent feature (that is in editing)
   */
  this.relations = options.relations;

  /**
   * editing service (main service of plugin)
   */
  this._editingService;

  /**
   * Current relation feature (in editing)
   * 
   * @since g3w-client-plugin*editing@3.8.0
   */
  this.currentRelationFeatureId = null;
  this.currentWorkflow          = null;
  this._isExternalFieldRequired = false;

  /**
   * layer id of relation layer
   */
  this._relationLayerId = this.relation.child === this._parentLayerId
    ? this.relation.father
    : this.relation.child;

  /**
   * layer in relation type
   */ 
  this._layerType = this.getLayer().getType();

  const { ownField: fatherRelationField } = this.getEditingService()._getRelationFieldsFromRelation({ layerId: this._parentLayerId, relation: this.relation });

  /**
   * Father relation fields (editable and pk)
   */
  this._fatherFields    = {
    // get editable fields
    editable: fatherRelationField.filter(fRField => this._parentLayer.isEditingFieldEditable(fRField)),
    // check if father field is a pk and is not editable
    pk:       fatherRelationField.find(fRField => this._parentLayer.isPkField(fRField) && !this._parentLayer.isEditingFieldEditable(fRField)),
  }

  /**
   * @type { boolean } whether has external fields
   */
  this._isExternalFieldRequired = this._checkIfExternalFieldRequired();

  /**
   * Check if the parent field is editable.
   * If not, get the id of parent feature so the server can generate the right value
   * to fill the field with the relation layer feature when commit
   */
  this._currentParentFeatureRelationFieldsValue = fatherRelationField
    .reduce((accumulator, fField) => {
      accumulator[fField] = fField === this._fatherFields.pk //check if isPk
        ? this.getCurrentWorkflowData().feature.getId()
        : this.getCurrentWorkflowData().feature.get(fField);
      return accumulator;
    }, {})

  ///////////////////////////////////////

  this.relationTools = [];
  // this._add_link_workflow = null;

  /**
   * editing constraint type
   */
  this.capabilities = {
    parent:   this._parentLayer.getEditingCapabilities(),
    relation: this._parentLayer.getEditingCapabilities()
  };

  // add tools for each relation
  this.relations.forEach((_, i) => this.addRelationTools(i) );

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

};

const proto = RelationService.prototype;

/**
 * @since 3.8.0
 * Enable/Disable elements
 * @param { Boolean } bool true enabled
 */
proto.enableDOMElements = (bool = true) => {
  document
    .querySelectorAll('.editing-save-all-form, .g3w-editing-relations-add-link-tools, .g3wform_footer')
    .forEach(c => c.classList.toggle('g3w-disabled', !bool))
}

/**
 * Return editing capabilities
 * @returns {*|{parent: *, relation: *}}
 */
proto.getEditingCapabilities = function() {
  return this.capabilities;
};

proto.addRelationTools = function(index) {

  const capabilities = this.capabilities.relation;

  const tools = [

    // edit attributes
    capabilities.some(cap => 'change_attr_feature' === cap) && {
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
    capabilities.some(cap => 'delete_feature' === cap) && {
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
    capabilities.some(cap => 'change_feature' === cap) && Layer.LayerTypes.VECTOR === this._layerType && (
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

  this.relationTools.push(tools);
  return tools;
};

/**
 *
 * @returns {[]}
 */
proto.getRelationTools = function(index) {
  return this.relationTools[index] || this.addRelationTools(index);
};

/**
 *
 * @param relationtool
 * @param index
 * @returns {Promise<unknown>}
 */
proto.startTool = async function(relationtool, index) {
  relationtool.state.active = !relationtool.state.active;
  
  // skip when ..
  if (!relationtool.state.active) {
    return Promise.resolve();
  }

  this.relationTools.forEach(tools => {
    tools.forEach(t => { if (relationtool.state.id !== t.state.id) { t.state.active = false; } })
  });

  await VM.$nextTick();

  // do something with map features

  const d = {};
  const promise = new Promise((resolve, reject) => { Object.assign(d, { resolve, reject }) })

  const is_vector       = Layer.LayerTypes.VECTOR === this._layerType;
  const toolId          = relationtool.state.id.split(`${index}_`)[1];
  const relation        = this.relations[index];
  const relationfeature = this._getRelationFeature(relation.id);
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
        this.getCurrentWorkflowData().session.pushDelete(this._relationLayerId, relationfeature);
        this.relations.splice(index, 1);     // remove feature from relations featues
        this.relationTools.splice(index, 1); // remove tool from relation tools
        this.getEditingService().removeRelationLayerUniqueFieldValuesFromFeature({
          layerId: this._relationLayerId,
          relationLayerId: this._parentLayerId,
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
};

/**
 * force parent workflow form service to update
 */
proto.updateParentWorkflows = function() {
  (WorkflowsStack.getParents() || [this.getCurrentWorkflow()])
    .forEach(workflow => {
      //check if workflow has service (form service)
      if (workflow.getContextService()) {
        workflow
          .getContextService()
          .setUpdate(true, {force: true})
      }
    });
  };

/**
 *
 * @returns {*}
 */
proto.getLayer = function() {
  return this.getEditingService().getLayerById(this._relationLayerId);
};

/**
 *
 * @returns {*}
 */
proto.getEditingLayer = function() {
  return this.getEditingService().getEditingLayer(this._relationLayerId);
};

/**
 *
 * @returns {*|EditingService|{}}
 */
proto.getEditingService = function() {
  this._editingService = this._editingService || require('./editingservice');
  return this._editingService;
};

/**
 * Add Relation from project layer
 * @param layer
 * @param external
 */
proto.addRelationFromOtherLayer = function({ layer, external }){
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
};

/**
 * add relation method
 */
proto.addRelation = function() {

  this.runAddRelationWorkflow({
    workflow: new this._add_link_workflow.add(),
    isVector: Layer.LayerTypes.VECTOR === this._layerType,
  })
};

/**
 * Common method to add a relation
 */
proto.runAddRelationWorkflow = async function({ workflow, isVector = false } = {} ) {

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
      .entries(this._currentParentFeatureRelationFieldsValue)
      .forEach(([field, value]) => {
        setRelationFieldValue({
          oIndex: relationField.findIndex(rField => field === rField),
          value
        });
      });

    //check if parent features are new and if parent layer has editable fields
    if (options.parentFeature.isNew() && this._fatherFields.editable.length > 0) {
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
};

/**
 * Link relation (bind) to parent feature layer
 */
proto.linkRelation = async function() {
  const isVector = Layer.LayerTypes.VECTOR === this._layerType;
  const workflow = new this._add_link_workflow.link();
  const options  = this._createWorkflowOptions();
  const { ownField, relationField } = this.getEditingService()._getRelationFieldsFromRelation({
    layerId:  this._relationLayerId,
    relation: this.relation
  });

  //add options to exclude features from a link
  options.context.excludeFeatures = relationField.reduce((accumulator, rField, index) => {
    accumulator[ownField[index]] = this._currentParentFeatureRelationFieldsValue[rField];
    return accumulator;
  }, {});


  //check if a vector layer
  if (isVector) {
    GUI.setModal(false);
    GUI.hideContent(true);
    options.context.style = this.getUnlinkedStyle();
  }

  const { feature } = this.getCurrentWorkflowData();

  const getRelationFeatures = () => this.getEditingService().getLayersDependencyFeatures(this._parentLayerId, {
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
          .entries(this._currentParentFeatureRelationFieldsValue)
          .forEach(([field, value]) => {
            relation.set(ownField[relationField.findIndex(rField => field === rField)], value);
          })
        this.getCurrentWorkflowData().session.pushUpdate(this._relationLayerId , relation, originalRelation);
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
};

/**
 * Check if relation layer fields have at least one field required
 * @returns {Boolean}
 * @private
 */
proto._checkIfExternalFieldRequired = function() {
  // own Fields is a relation Fields array of Relation Layer
  const { ownField } = this.getEditingService()._getRelationFieldsFromRelation({
    layerId:  this._relationLayerId,
    relation: this.relation,
  });

  //check if at least one filed is required
  return ownField.some(field => this.getEditingService().isFieldRequired(this._relationLayerId, field));
};

/**
 *
 * @returns {boolean|*}
 */
proto.isRequired = function() {
  return this._isExternalFieldRequired;
};

/**
 *
 * @param featureId
 * @returns {*}
 * @private
 */
proto._getRelationFeature = function(featureId) {
  return this.getLayer().getEditingSource().getFeatureById(featureId);
};

/**
 * Get value from feature if layer has key value
 * 
 * @since g3w-client-plugin-editing@v3.7.0
 */
proto.getRelationFeatureValue = function(featureId, property) {
  return this
    .getEditingService()
    .getFeatureTableFieldValue({
      layerId: this._relationLayerId,
      feature: this._getRelationFeature(featureId),
      property,
    });
};

/**
 * Method to unlink relation
 * @param index
 * @param dialog
 * @returns JQuery Promise
 */
proto.unlinkRelation = function(index, dialog= true) {
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

    this.getCurrentWorkflowData().session.pushUpdate(this._relationLayerId, feature, originalRelation);
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
};

/**
 *
 * @returns {*}
 */
proto.getCurrentWorkflow = function() {
  return this.getEditingService().getCurrentWorkflow();
};

/**
 *
 * @returns {*}
 */
proto.getCurrentWorkflowData = function() {
  return this.getEditingService().getCurrentWorkflowData();
};

/**
 *
 * @param options
 * @returns {{parentFeature, inputs: {features: *[], layer: *}, context: {fatherValue: *, session: *, fatherField: *, excludeFields: *[]}}}
 * @private
 */
proto._createWorkflowOptions = function(options = {}) {
  const fields = this.getEditingService()._getRelationFieldsFromRelation({
    layerId:  this._relationLayerId,
    relation: this.relation
  });
  const data   = this.getCurrentWorkflowData();
  const parent = Object.entries(this._currentParentFeatureRelationFieldsValue);
  return  {
    parentFeature: data.feature.parentFeature, // get parent feature
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

};

/**
 *
 * @returns {ol.style.Style}
 */
proto.getUnlinkedStyle = function() {
  let style;
  const type = this.getLayer().getGeometryType();

  // get relation as father style color
  const _getColor = (type) => {
    const fatherLayerStyle = this.getEditingLayer(this._parentLayerId).getStyle();
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
};

/**
 *
 * @param relation
 * @returns {*[]}
 */
proto.relationFields = function(relation) {
  return relation.fields.map(({ label, name, value }) => ({ name, label, value }))
};

module.exports = RelationService;
