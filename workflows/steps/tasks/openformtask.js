import SIGNALER_IIM_CONFIG from '../../../global_plugin_data';
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
    const {create_new_signaler} = SIGNALER_IIM_CONFIG;
    // in case of new create signaler (with sid=new or signaler_field) go outside editing
    create_new_signaler && this.getEditingService().exitEditingAfterCreateNewSignalerFeature()
  }
};

proto._saveFeatures = function({fields, promise, session, inputs}){
  const {signaler_layer_id, geo_layer_id, create_new_signaler} = SIGNALER_IIM_CONFIG;
  fields = this._multi ? fields.filter(field => field.value !== null) : fields;
  if (fields.length) {
    const layerId = this._originalLayer.getId();
    if (layerId === signaler_layer_id) {
      const isNew = inputs.features[0].isNew();
      this.getEditingService().setSaveConfig({
        mode: 'autosave',
        messages: {
          success: false,
          error: false
        },
        cb: {
          done: () => {
            this.disableSidebar(true);
            // set current report
            const feature = this._features[0];
            this.getEditingService().setCurrentReportData({
              feature
            });
            this.getEditingService().resetDefault();
            // only if is new show add feature
            if (isNew){
              if (geo_layer_id) {
                const content  = ComponentsFactory.build({
                  vueComponentObject: AddFeatureMethodComponent
                });
                GUI.pushContent({
                  content,
                  closable: false
                })
              }
            } else if (create_new_signaler) this.getEditingService().exitEditingAfterCreateNewSignalerFeature()
          },
          error: ()=> {
            create_new_signaler && this.getEditingService().exitEditingAfterCreateNewSignalerFeature()
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
  this.getEditingService().setCurrentLayout();
  const EditingFormComponent = require('../../../form/editingform');
  const {signaler_layer_id, state_field, every_fields_editing_states} = SIGNALER_IIM_CONFIG;
  const {inputs, context, promise} = options;
  const {session} = context;
  const formComponent = options.formComponent || EditingFormComponent;
  const Form =  this._getForm(inputs, context);
  const layerId = this._originalLayer.getId();
  const feature = this._originalFeatures[0];
  let can_edit_signaler_feature = true;
  let edit_feature_geometry = null;
  const isNew = feature.isNew();
  if (layerId === signaler_layer_id) {
    this.getEditingService().setCurrentReportData({
      feature
    });
    await this.getEditingService().filterReportFieldsFormValues({
      fields: this._fields
    });
    if (!isNew){
      if (every_fields_editing_states.indexOf(feature.get(state_field)) === -1) {
        can_edit_signaler_feature = false;
        this._fields.forEach(field => {
          if (field.name !== state_field) field.editable = false;
        })
      }
    }
  } else {
    edit_feature_geometry = feature.get('shape') ? 'radius' : 'vertex';
    this.getEditingService().setCurrentFeatureReport({feature});
  }
  const formService = Form({
    formComponent,
    title: "plugins.signaler_iim.editing_attributes",
    name: this._layerName,
    id: this._generateFormId(this._layerName),
    dataid: this._layerName,
    layer: this._originalLayer,
    isnew: isNew,
    feature,
    edit_feature_geometry,
    fields: this._fields,
    can_edit_signaler_feature,
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
  // in case when i call task directly
  WorkflowsStack.getLength() && WorkflowsStack.getCurrent().setContextService(formService);
};

proto.run = function(inputs, context) {
  GUI.setLoadingContent(false);
  this.getEditingService().disableMapControlsConflict(true);
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
  this.getEditingService().disableMapControlsConflict(false);
  this._isContentChild ? GUI.popContent() : GUI.closeForm();
  this.getEditingService().resetCurrentLayout();
};

