import SIGNALER_IIM_CONFIG from '../../../constant';
import AddFeatureMethodComponent from '../../../form/components/editfeatures/addfeaturemethod.vue';
const {base, inherit} = g3wsdk.core.utils;
const {GUI, ComponentsFactory} = g3wsdk.gui;
const WorkflowsStack = g3wsdk.core.workflow.WorkflowsStack;
const EditingTask = require('./editingtask');

function OpenFormTask(options={}) {
  this._edit_relations = options.edit_relations === undefined ? true : options._edit_relations;
  this._formIdPrefix = 'form_';
  this._isContentChild = false;
  this._features;
  this._originalLayer;
  this._editingLayer;
  this._layerName;
  this._originalFeatures;
  this._fields;
  this._session;
  this._editorFormStructure;
  this._multi = options.multi || false; // set if can handle multi edit features
  base(this, options);
}

inherit(OpenFormTask, EditingTask);

module.exports = OpenFormTask;

const proto = OpenFormTask.prototype;

proto._getForm =  function(inputs, context) {
  const excludeFields = context.excludeFields;
  this._isContentChild = !!(WorkflowsStack.getLength() > 1);
  this._session = context.session;
  this._originalLayer = inputs.layer;
  this._editingLayer = this._originalLayer.getEditingLayer();
  this._layerName = this._originalLayer.getName();
  this._features = this._multi ? inputs.features : [inputs.features[inputs.features.length - 1]];
  this._originalFeatures = this._features.map(feature => feature.clone());
  this._fields = this._originalLayer.getFieldsWithValues(this._features[0], {
    exclude: excludeFields
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
    GUI.setModal(false);
    // fire event cancel form to emit to subscrivers
    this.fireEvent('cancelform', inputs.features);
    promise.reject(inputs);
  }
};

proto._saveFeatures = function({fields, promise, session, inputs}){
  const {signaler_layer_id, geo_layer_id} = SIGNALER_IIM_CONFIG;
  fields = this._multi ? fields.filter(field => field.value !== null) : fields;
  if (fields.length) {
    const layerId = this._originalLayer.getId();
    if (layerId === signaler_layer_id) {
      const isNew = inputs.features[0].isNew();
      this.getEditingService().setSaveConfig({
        mode: 'autosave',
        messages: {
          success: false
        },
        cb: {
          done: () => {
            this.disableSidebar(true);
            // set current report
            this.getEditingService().setCurrentReportData({
              feature: this._features[0]
            });
            this.getEditingService().resetDefault();
            // only if is new show add feature
            if (isNew && geo_layer_id){
              const content  = ComponentsFactory.build({
                vueComponentObject: AddFeatureMethodComponent
              });
              GUI.showContent({
                content,
                closable: false
              })
            }
          }
        }
      });
    } else this.getEditingService().resetDefaultSaveConfig();
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
        session.pushUpdate(layerId, newFeature, this._originalFeatures[index]);
      });
      GUI.setModal(false);
      promise.resolve(inputs);
      this.fireEvent('savedfeature', newFeatures); // called after saved
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

proto.startForm = async function(options = {}) {
  const EditingFormComponent = require('../../../form/editingform');
  const {signaler_layer_id} = SIGNALER_IIM_CONFIG;
  const {inputs, context, promise} = options;
  const {session} = context;
  const formComponent = options.formComponent || EditingFormComponent;
  const Form =  this._getForm(inputs, context);
  const layerId = this._originalLayer.getId();
  const feature = this._originalFeatures[0];
  const isNew = feature.isNew();
  if (layerId === signaler_layer_id) {
    this.getEditingService().setCurrentReportData({
      feature
    });
    await this.getEditingService().filterReportFieldsFormValues({
      fields: this._fields
    })
  } else this.getEditingService().setCurrentFeatureReport({feature});
  
  const formService = Form({
    formComponent,
    title: "plugins.signaler_iim.editing_attributes",
    name: this._layerName,
    id: this._generateFormId(this._layerName),
    dataid: this._layerName,
    layer: this._originalLayer,
    isnew: isNew,
    fields: this._fields,
    formStructure: this._editorFormStructure,
    modal: true,
    push: this._isContentChild,
    showgoback: !this._isContentChild,
    buttons:[{
      title: "plugins.signaler_iim.form.buttons.save",
      type: "save",
      class: "btn-success",
      cbk: this._saveFnc(promise, context, inputs).bind(this)
    }, {
      title: "plugins.signaler_iim.form.buttons.cancel",
      type: "cancel",
      class: "btn-danger",
      cbk: this._cancelFnc(promise, inputs, session).bind(this)
    }]
  });
  this.fireEvent('openform',
    {
      layerId,
      session,
      feature: this._originalFeature,
      formService
    });
  WorkflowsStack.getCurrent().setContextService(formService);
};

proto.run = function(inputs, context) {
  const d = $.Deferred();
  this.startForm({
    inputs,
    context,
    promise: d
  });
  this.disableSidebar(true);
  return d.promise();
};

proto._generateFormId = function(layerName) {
  return this._formIdPrefix + layerName;
};

proto.stop = function() {
  this.disableSidebar(false);
  this._isContentChild ? GUI.popContent() : GUI.closeForm();
};

