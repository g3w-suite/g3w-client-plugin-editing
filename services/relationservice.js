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

//Vector style for selected relation
const SELECTED_STYLE = {
  'Point':  new ol.style.Style({
    image: new ol.style.Circle({
      radius: 8,
      fill: new ol.style.Fill({
        color: 'rgb(255,89,0)'
      })
    })
  }),
  'MultiPoint': new ol.style.Style({
    image: new ol.style.Circle({
      radius: 8,
      fill: new ol.style.Fill({
        color: 'rgb(255,89,0)'
      })
    })
  }),
  'Linestring': new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: 'rgb(255,89,0)',
      width: 8
    })
  }),
  'MultiLinestring': new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: 'rgb(255,89,0)',
      width: 8
    })
  }),
  'Polygon': new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: 'rgb(255,89,0)',
      width: 8
    }),
    fill: new ol.style.Fill({
      color: 'rgb(255,89,0)'
    })
  }),
  'MultiPolygon': new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: 'rgb(255,89,0)',
      width: 8
    }),
    fill: new ol.style.Fill({
      color: 'rgb(255,89,0)'
    })
  })
}

const RelationService = function(layerId, options = {}) {
  // layerId is id of the parent of relation
  this._parentLayerId                     = layerId;
  this._parentWorkFlow                    = this.getCurrentWorkflow();
  this._parentLayer                       = this._parentWorkFlow.getLayer();
  /**
   * relation: contain information about relation from parent layer and current relation layer (ex. child, fields, relationid, etc....)
   * relations: Array of a relations object id and fields linked to current parent feature that is in editing
   *
   */
  const { relation, relations }           = options;
  this.relation                           = relation;
  // relation feature link to current parent feature
  this.relations                          = relations;
  //editing service (main service of plugin)
  this._editingService;
  this.currentRelationFeatureId           = null; // @since 3.8.0 get current relation feature on editing
  this.currentWorkflow                    = null;
  this._isExternalFieldRequired           = false;
  // this._relationLayerId is layer id of relation layer
  this._relationLayerId                   = this.relation.child === this._parentLayerId
    ? this.relation.father
    : this.relation.child;
  // layer in relation type
  this._layerType                         = this.getLayer().getType();

  const { ownField: fatherRelationField } = this.getEditingService()._getRelationFieldsFromRelation({ layerId: this._parentLayerId, relation: this.relation });

  // Store father relation fields editable and pk
  this._fatherRelationFields    = {
    //get editable fields
    editable: fatherRelationField.filter(fRField => this._parentLayer.isEditingFieldEditable(fRField)),
    //check if father field is a pk and is not editable
    pk:       fatherRelationField.find(fRField => this._parentLayer.isPkField(fRField) && !this._parentLayer.isEditingFieldEditable(fRField)),
  }
  //check if external fields
  this._isExternalFieldRequired = this._checkIfExternalFieldRequired();
  // Check if the parent field is editable.
  // If not, get the id of parent feature so the server can generate the right value
  // to fill the field with the relation layer feature when commit

  this._currentParentFeatureRelationFieldsValue = fatherRelationField
    .reduce((accumulator, fField) => {
      accumulator[fField] = fField === this._fatherRelationFields.pk //check if isPk
        ? this.getCurrentWorkflowData().feature.getId()
        : this.getCurrentWorkflowData().feature.get(fField);
      return accumulator;
    }, {})

  ///////////////////////////////////////

  this.relationTools      = [];
  this._add_link_workflow = null;
  //get editing constraint type
  this.capabilities       = {
    parent:   this._parentLayer.getEditingCapabilities(),
    relation: this._parentLayer.getEditingCapabilities()
  };

  //add tools for each relation
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
  document.querySelectorAll('.editing-save-all-form').forEach(c => {
      if (bool && c.classList.contains('g3w-disabled')) {
        c.classList.remove('g3w-disabled');
      }

      if (!bool && !c.querySelector('.save-all-icon').classList.contains('g3w-disabled')) {
        c.classList.add('g3w-disabled');
      }

  });
  document.querySelectorAll('.g3w-editing-relations-add-link-tools').forEach(c => c.classList[bool ? 'remove' : 'add']('g3w-disabled'));
  document.querySelectorAll('.g3wform_footer').forEach(c => c.classList[bool ? 'remove' : 'add']('g3w-disabled'))
}

/**
 * Return editing capabilities
 * @returns {*|{parent: *, relation: *}}
 */
proto.getEditingCapabilities = function() {
  return this.capabilities;
};

proto.addRelationTools = function(index) {

  const tools = [];

  if (undefined !== this.capabilities.relation.find(capability => 'change_attr_feature' === capability)) {
    tools.push({
      state: Vue.observable({
        icon:   'editAttributes.png',
        id:     `${index}_editattributes`,
        name:   "editing.tools.update_feature",
        enabled: true,
        active:  false,
      }),
      type: 'editfeatureattributes',
    })
  }

  if (undefined !== this.capabilities.relation.find(capability => 'delete_feature' === capability )) {
    tools.push({
      state: Vue.observable({
        icon:   'deleteTableRow.png',
        id:     `${index}_deletefeature`,
        name:   "editing.tools.delete_feature",
        enabled: true,
        active:  false,
      }),
      type: 'deletefeature',
    });
  }

  //vector relation layers add other tools if it has capability to chenge feature
  if (Layer.LayerTypes.VECTOR === this._layerType && this.capabilities.relation.find(capability => 'change_feature' === capability))  {
    this.getEditingService()
      .getToolBoxById(this._relationLayerId)
      .getTools()
      .filter(t => {
        //in the case of Point geometry
        if (Geometry.isPointGeometryType(this.getLayer().getGeometryType())) {
          return 'movefeature' === t.getId();
        }
        //case Line or Polygon
        return ['movefeature', 'movevertex'].includes(t.getId());
      })
      .forEach(t => tools.push({ state: Vue.observable({ ...t.state, id: `${index}_${t.state.id}` }) , type: t.getOperator().type }));
  }

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
 * @param relation
 * @returns {*}
 * @private
 */
proto._highlightRelationSelect = function(relation) {
  const originalStyle = this.getLayer().getEditingLayer().getStyle();
  const geometryType  = this.getLayer().getGeometryType();

  relation.setStyle(SELECTED_STYLE[geometryType]);

  return originalStyle;
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
  const selectStyle     = is_vector && SELECTED_STYLE[this.getLayer().getGeometryType()]; // get selected vector style
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
        this.forceParentsFromServiceWorkflowToUpdated();
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
      this._getRelationFieldsValue(relationfeature)
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
    this.emitEventToParentWorkFlow();
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
proto.forceParentsFromServiceWorkflowToUpdated = function() {
  const workflowParents = WorkflowsStack.getParents() || [this.getCurrentWorkflow()];
  workflowParents.forEach(workflow => {
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
 * function that changes the relation field value when and if the parent changes the value of relation field
 * @param input
 */
proto.updateExternalKeyValueRelations = function(input) {
  //ownFiled is the field of relation feature link to parent feature layer
  const { ownField, relationField } = this.getEditingService()._getRelationFieldsFromRelation({
    layerId:  this._relationLayerId,
    relation: this.relation
  });
  // get if parent form input that is changing
  // is the field in relation of the current feature relation Layer
  if (this._fatherRelationFields.editable.length > 0 && relationField.find(rField => rField === input.name)) {
    // change currentParent Feature relation value
    this._currentParentFeatureRelationFieldsValue[input.name] = input.value;
    // loop all features relations
    this.relations.forEach(relation => {
      // field relation field of current relation feature
      const field = relation.fields.find(field => ownField.indexOf(field.name) !== -1);
      //if field is find
      if (field) {
        field.value = this._currentParentFeatureRelationFieldsValue[field.name];
        relation = this._getRelationFeature(relation.id);
        const originalRelation = relation.clone();
        relation.set(field.name, input.value);
        if (!relation.isNew()) {
          this.getEditingService().getToolBoxById(this._relationLayerId).getSession().pushUpdate(this._relationLayerId, relation, originalRelation);
        }
      }
    })
  }
};

/**
 *
 * @param relation
 * @returns {*}
 * @private
 */
proto._getRelationFieldsValue = function(relation) {
  return this.getLayer().getFieldsWithValues(relation, { relation: true });
};

/**
 *
 * @param relation
 * @returns {{id: *, fields: *}}
 * @private
 */
proto._createRelationObj = function(relation) {
  return {
    fields: this._getRelationFieldsValue(relation),
    id:     relation.getId()
  }
};

/**
 *
 * @param type
 * @param options
 */
proto.emitEventToParentWorkFlow = function(type, options={}) {
  //type=set-main-component event name to set table parent visible
  if (type) {
    this._parentWorkFlow.getContextService().getEventBus().$emit(type, options);
  }
};

/**
 *
 * @param type
 * @returns {*|string}
 * @private
 */
proto._getRelationAsFatherStyleColor = function(type) {
  const fatherLayerStyle = this.getEditingLayer(this._parentLayerId).getStyle();
  let fatherLayerStyleColor;
  switch (type) {
    case 'Point':
      fatherLayerStyleColor = fatherLayerStyle.getImage() && fatherLayerStyle.getImage().getFill();
      break;
    case 'Line':
      fatherLayerStyleColor = fatherLayerStyle.getStroke() || fatherLayerStyle.getFill();
      break;
    case 'Polygon':
      fatherLayerStyleColor = fatherLayerStyle.getFill() || fatherLayerStyle.getStroke();
      break;
  }
  return (
    (
      fatherLayerStyleColor &&
      fatherLayerStyleColor.getColor()
    ) ||
    '#000000'
  );
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
proto.runAddRelationWorkflow = function({ workflow, isVector = false } = {} ) {
  if (isVector) {
    GUI.setModal(false);
    GUI.hideContent(true);
  }
  const options = this._createWorkflowOptions();
  const session = options.context.session;
  const { ownField, relationField } = this.getEditingService()._getRelationFieldsFromRelation({
    layerId:  this._relationLayerId,
    relation: this.relation
  });

  const { parentFeature } = options;
  const promise =  workflow.start(options);
  if (isVector) { workflow.bindEscKeyUp() }
  promise
    .then(outputs => {
      const { newFeatures, originalFeatures } = outputs.relationFeatures;

      /**
       * Set Relation child feature value
       * @param oIndex
       * @param value
       */
      const setRelationFieldValue = ({ oIndex, value }) => {
        newFeatures.forEach((newFeature, index) => {
          const originalFeature = originalFeatures[index];
          newFeature.set(ownField[oIndex], value);
          if (parentFeature.isNew()) {
            originalFeature.set(ownField[oIndex], value);
          }
          this.getLayer().getEditingSource().updateFeature(newFeature);
          session.pushUpdate(this._relationLayerId, newFeature, originalFeature);
        })
      };
      Object
        .entries(this._currentParentFeatureRelationFieldsValue)
        .forEach(([field, value]) => {
          setRelationFieldValue({
            oIndex: relationField.findIndex(rField => field === rField),
            value
          });
        })
      //check if parent features are new and if parent layer has editable fields
      if (parentFeature.isNew() && this._fatherRelationFields.editable.length > 0) {
        const keyRelationFeatureChange = parentFeature.on('propertychange', evt => {
          if (parentFeature.isNew()) {
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
      newFeatures.forEach(newFeature => this.relations.push(this._createRelationObj(newFeature)));

      this.emitEventToParentWorkFlow();
    })
    .fail(inputs => {

      if (inputs && inputs.relationFeatures) {
        /**
         * needed in case of save all pressed on openformtask
         */
        const {relationFeatures: { newFeatures=[] } } = inputs;
        newFeatures.forEach(newFeature => {
          this.relations.push(this._createRelationObj(newFeature));
        });
      }

      session.rollbackDependecies([this._relationLayerId])
    })
    .always(() => {

      workflow.stop();

      if (isVector) {
        workflow.unbindEscKeyUp();
        GUI.hideContent(false);
        GUI.setModal(true);
      }
    })
};

/**
 * Link relation (bind) to parent feature layer
 */
proto.linkRelation = function() {
  const isVector = Layer.LayerTypes.VECTOR === this._layerType;
  const workflow = new this._add_link_workflow.link();
  const options  = this._createWorkflowOptions();
  const session  = options.context.session;
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

  const dependencyOptions = {
    relations:  [this.relation],
    feature,
    operator:   'not',
    filterType: isVector ? 'bbox' : 'fid'
  };
  const getRelationFeatures = () => this.getEditingService().getLayersDependencyFeatures(this._parentLayerId, dependencyOptions);

  let preWorkflowStart;

  if (isVector) {
    const mapService = this.getEditingService().getMapService();
    options.context.beforeRun = async () => {
      //show map spinner
      mapService.showMapSpinner();

      await new Promise((resolve) => setTimeout(resolve));

      await getRelationFeatures();
      //hide mapSpinner
      mapService.hideMapSpinner();

      GUI.showUserMessage({
        type: 'info',
        size: 'small',
        message: t('editing.messages.press_esc'),
        closable: false
      })
    };

    preWorkflowStart = new Promise((resolve) => {

      workflow.bindEscKeyUp();

      resolve({
        promise: workflow.start(options),
        showContent: true
      })
    });
  } else {

    preWorkflowStart = new Promise((resolve) => getRelationFeatures().then(() => resolve({})));
  }

  preWorkflowStart.then(({ promise, showContent=false } = {})=> {
    let linked = false;

    promise = promise || workflow.start(options);

    promise
      .then(outputs => {
        if (outputs.features.length > 0) {
          //loop on features selected
          outputs.features.forEach(relation => {
            if (undefined === this.relations.find(rel => rel.id === relation.getId())) {
              linked = linked || true;
              const originalRelation = relation.clone();
              Object
                .entries(this._currentParentFeatureRelationFieldsValue)
                .forEach(([field, value]) => {
                  relation.set(ownField[relationField.findIndex(rField => field === rField)], value);
                })
              this.getCurrentWorkflowData()
                .session
                .pushUpdate(this._relationLayerId , relation, originalRelation);
              this.relations.push(this._createRelationObj(relation));
              this.emitEventToParentWorkFlow();
            } else {
              // in case already present
              GUI.notify.warning(t("editing.relation_already_added"));
            }
          });
        }
      })
      .fail((e) => {
        console.warn(e);
        session.rollbackDependecies([this._relationLayerId]);
      })
      .always(() => {
        if (showContent) {
          GUI.closeUserMessage();
          GUI.hideContent(false);
          workflow.unbindEscKeyUp();
        }
        if (linked) { this.forceParentsFromServiceWorkflowToUpdated() }
        workflow.stop();
    });
  })
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
    this.forceParentsFromServiceWorkflowToUpdated();
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
proto._createWorkflowOptions = function(options= {}) {
  const { ownField, relationField } = this.getEditingService()._getRelationFieldsFromRelation({
    layerId:  this._relationLayerId,
    relation: this.relation
  });
  const {
    feature: parentFeature,
    session
  } = this.getCurrentWorkflowData();

  const fatherValue = [];
  const fatherField = [];

  Object
    .entries(this._currentParentFeatureRelationFieldsValue)
    .forEach(([field, value]) => {
      fatherField.push(ownField[relationField.findIndex(rField => field === rField)]);
      fatherValue.push(value);
  })

  return  {
    parentFeature, //get parent feature
    context: {
      session, //get parent workflow
      excludeFields: ownField, //ownField is an Array to exclude
      fatherValue,
      fatherField
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
  const geometryType = this.getLayer().getGeometryType();
  switch (geometryType) {
    case 'Point':
    case 'MultiPoint':
      style = new ol.style.Style({
        image: new ol.style.Circle({
          radius: 8,
          fill: new ol.style.Fill({
            color: this._getRelationAsFatherStyleColor('Point')
          }),
          stroke: new ol.style.Stroke({
            width: 5,
            color:  'yellow'
          })
        })
      });
      break;
    case 'Line':
    case 'MultiLine':
      style = new ol.style.Style({
        fill: new ol.style.Fill({
          color: this._getRelationAsFatherStyleColor('Line')
        }),
        stroke: new ol.style.Stroke({
          width: 5,
          color: 'yellow'
        })
      });
      break;
    case 'Polygon':
    case 'MultiPolygon':
      style =  new ol.style.Style({
        stroke: new ol.style.Stroke({
          color: 'yellow' ,
          width: 5
        }),
        fill: new ol.style.Fill({
          color: this._getRelationAsFatherStyleColor('Polygon'),
          opacity: 0.5
        })
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
