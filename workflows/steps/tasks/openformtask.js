import SaveAll from "../../../components/SaveAll.vue";
const {base, inherit} = g3wsdk.core.utils;
const {GUI} = g3wsdk.gui;
const {WorkflowsStack} = g3wsdk.core.workflow;
const EditingTask = require('./editingtask');
const EditingFormComponent = require('../../../form/editingform');

function OpenFormTask(options={}) {
  this._edit_relations = options.edit_relations === undefined ? true : options._edit_relations;
  this._formIdPrefix = 'form_';
  this.layerId;
  this._isContentChild = false;
  this._features;
  this._originalLayer;
  this._editingLayer;
  this._layerName;
  this._originalFeatures;
  this._fields;
  this._session;
  this._editorFormStructure;
  this.promise;
  this._multi = options.multi || false; // set if can handle multi edit features
  base(this, options);
}

inherit(OpenFormTask, EditingTask);

module.exports = OpenFormTask;

const proto = OpenFormTask.prototype;

proto._getForm = async function(inputs, context) {
  this._session = context.session;
  this._originalLayer = inputs.layer;
  this._editingLayer = this._originalLayer.getEditingLayer();
  this._layerName = this._originalLayer.getName();
  this._features = this._multi ? inputs.features : [inputs.features[inputs.features.length - 1]];
  this._originalFeatures = this._features.map(feature => feature.clone());
  const feature = this._features[0];
  /**
   * In case of create a child relation feature set a father relation field value
   */
  if (this._isContentChild) {
    const {fatherValue, fatherField} = context;
    if (typeof fatherField !== "undefined")  {
      feature.set(fatherField, fatherValue);
      this._originalFeatures[0].set(fatherField, fatherValue);
    }
  }
  this._fields = await this.getFormFields({
    inputs,
    context,
    feature,
    isChild: this._isContentChild
  });
  // in case of multi editing set all field to null //
  this._fields = this._multi ? this._fields.map(field => {
    const _field = JSON.parse(JSON.stringify(field));
    _field.value = null;
    _field.forceNull = true;
    _field.validate.required = false;
    return _field;
  }).filter(field => !field.pk) : this._fields;
  if (this._originalLayer.hasFormStructure()) {
    const editorFormStructure = this._originalLayer.getEditorFormStructure();
    this._editorFormStructure = editorFormStructure.length ? editorFormStructure : null;
  }

  return GUI.showContentFactory('form');
};

proto._cancelFnc = function(promise, inputs) {
  return function() {
    if (!this._isContentChild){
      GUI.setModal(false);
      // fire event cancel form to emit to subscrivers
      this.fireEvent('cancelform', inputs.features);
    }
    promise.reject(inputs);
  }
};

/**
 *
 * @param fieldssetAndUnsetSelectedFeaturesStyle
 * @returns {Promise<unknown>}
 */
proto.saveAll = function(fields){
  return new Promise((resolve, reject) => {
    const {session} = this.getContext();
    const inputs = this.getInputs();
    fields = this._multi ? fields.filter(field => field.value !== null) : fields;
    if (fields.length) {
      const newFeatures = [];
      this._features.forEach(feature =>{
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
      }).then(()=> {
        newFeatures.forEach((newFeature, index)=> {
          session.pushUpdate(this.layerId, newFeature, this._originalFeatures[index]);
        });
        this.fireEvent('savedfeature', newFeatures); // called after saved
        this.fireEvent(`savedfeature_${this.layerId}`, newFeatures); // called after saved using layerId
        session.save();
        resolve({
          promise: this.promise
        });
      })
    }
  })
};

proto._saveFeatures = function({fields, promise, session, inputs}){
  fields = this._multi ? fields.filter(field => field.value !== null) : fields;
  if (fields.length) {
    const newFeatures = [];
    this._features.forEach(feature =>{
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
    }).then(()=> {
      newFeatures.forEach((newFeature, index)=>{
        session.pushUpdate(this.layerId, newFeature, this._originalFeatures[index]);
      });
      GUI.setModal(false);
      this.fireEvent('savedfeature', newFeatures); // called after saved
      this.fireEvent(`savedfeature_${this.layerId}`, newFeatures); // called after saved using layerId
      // In case of save of child it mean that child is updated so also parent
      this._isContentChild && WorkflowsStack.getParents().forEach(workflow => workflow.getContext().service.setUpdate(true, {
        force: true
      }));
      promise.resolve(inputs);
    })
  } else {
    GUI.setModal(false);
    promise.resolve(inputs);
  }
};

proto._saveFnc = function(promise, context, inputs) {
  return function(fields) {
    const session = context.session;
    this._saveFeatures({
      fields,
      promise,
      session,
      inputs
    });
  }
};

/**
 * Build form
 * @param options
 * @returns {Promise<void>}
 */
proto.startForm = async function(options = {}) {
  this.getEditingService().setCurrentLayout();
  const { inputs, context, promise } = options;
  const { session } = context;
  const formComponent = options.formComponent || EditingFormComponent;
  const Form = await this._getForm(inputs, context);
  const feature = this._originalFeatures[0];
  const isnew = this._originalFeatures.length > 1 ? false : feature.isNew();

  /**
   * set fields. Useful getParentFormData
   */
  WorkflowsStack.getCurrent().setInput({
    key: 'fields',
    value: this._fields
  });

  const formService = Form({
    formComponent,
    title: "plugins.editing.editing_attributes",
    name: this._layerName,
    crumb: {
      title: this._layerName
    },
    id: this._generateFormId(this._layerName),
    dataid: this._layerName,
    layer: this._originalLayer,
    isnew, // specify if is a new feature
    feature,
    parentData: this.getParentFormData(),
    fields: this._fields,
    context_inputs: !this._multi && this._edit_relations && {
      context,
      inputs
    },
    formStructure: this._editorFormStructure,
    modal: true,
    push: this._isContentChild,
    showgoback: !this._isContentChild,
    headerComponent:SaveAll,
    buttons:[{
      id: 'save',
      title: this._isContentChild ? "plugins.editing.form.buttons.save_and_back" : "plugins.editing.form.buttons.save",
      type: "save",
      class: "btn-success",
      cbk: this._saveFnc(promise, context, inputs).bind(this)
    }, {
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
      cbk: this._cancelFnc(promise, inputs).bind(this)
    }]
  });
  this.fireEvent('openform',
    {
      layerId:this.layerId,
      session,
      feature: this._originalFeature,
      formService
    });
  const currentWorkflow = WorkflowsStack.getCurrent();
  // in case of called single task no workflow is set
  currentWorkflow && currentWorkflow.setContextService(formService);
};

proto.run = function(inputs, context) {
  this.promise = new Promise((resolve, reject) => {
    this._isContentChild = WorkflowsStack.getLength() > 1;
    const { layer, features } = inputs;
    this.layerId = layer.getId();
    GUI.setLoadingContent(false);
    this.getEditingService().disableMapControlsConflict(true);

    this.setAndUnsetSelectedFeaturesStyle({
      promise: this.promise
    });

    if (!this._multi && Array.isArray(features[features.length -1])) {
      resolve();
    } else {
      this.startForm({
        inputs,
        context,
        promise: this.promise
      });
      this.disableSidebar(true);
    }
  });
  return this.promise;
};

proto._generateFormId = function(layerName) {
  return this._formIdPrefix + layerName;
};

proto.stop = function() {
  this.disableSidebar(false);
  if (!this._isContentChild) {
    this.getEditingService().disableMapControlsConflict(false);
    // at the end if is the parent form set it to false update, and force update
    WorkflowsStack.getCurrent().getContext().service.setUpdate(false, {
      force: false
    });
  }
  GUI.closeForm({
    pop: this._isContentChild
  });
  this.getEditingService().resetCurrentLayout();
  this.fireEvent('closeform');
  this.fireEvent(`closeform_${this.layerId}`); // need to check layerId
  this.layerId = null;
  this.promise = null;
};