const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const t = g3wsdk.core.i18n.tPlugin;
const GUI = g3wsdk.gui.GUI;
const EditingFormComponent = require('../../../form/editingform');
const WorkflowsStack = g3wsdk.core.workflow.WorkflowsStack;
const EditingTask = require('./editingtask');
import EditPipes from '../../../vue/components/editing/pipes.vue'

function OpenFormTask(options={}) {
  this._formIdPrefix = 'form_';
  this._isContentChild = false;
  this.editattribute = options.editattribute;
  this._feature;
  this._layerId;
  this._originalLayer;
  this._editingLayer;
  this._layerName;
  this._originalFeature;
  this._pk;
  this._fields;
  this._session;
  this._editorFormStructure;
  base(this, options);
}

inherit(OpenFormTask, EditingTask);

module.exports = OpenFormTask;

const proto = OpenFormTask.prototype;

proto._getFieldUniqueValuesFromServer = function(layer, uniqueFields) {
  const fieldsName = uniqueFields.map((field) => {
    return field.name
  });
  layer.getWidgetData({
    type: 'unique',
    fields: fieldsName.join()
  }).then(function(response) {
    const data = response.data;
    _.forEach(data, function(values, fieldName) {
      values.forEach((value) => {
        uniqueFields[fieldName].input.options.values.push(value);
      })
    })
  }).fail((err) => {
    console.log(err)
  })
};

proto._getUniqueFieldsType = function(fields) {
  const uniqueFields = {};
  fields.forEach((field) => {
     if (field.input && field.input.type === 'unique')
       uniqueFields[field.name] = field;
  });
  return uniqueFields;
};

proto._getForm = function(inputs, context) {
  const excludeFields = context.excludeFields;
  this._isContentChild = WorkflowsStack.getLength() > 1;
  this._session = context.session;
  this._originalLayer = context.layer;
  this._editingLayer = inputs.layer;
  this._pk = this._originalLayer.getPk();
  this._layerId = this._originalLayer.getId();
  this._layerName = this._originalLayer.getName();
  // vado a prendere l'ultima feature
  this._feature = inputs.features[inputs.features.length - 1];
  this._originalFeature = this._feature.clone();
  this._fields = this._originalLayer.getFieldsWithValues(this._feature, {
    exclude: excludeFields
  });
  this._editorFormStructure = this._originalLayer.hasFormStructure() ? this._originalLayer.getEditorFormStructure() : null ;
  const uniqueFields = this._getUniqueFieldsType(this._fields);
  if (!_.isEmpty(uniqueFields))
    this._getFieldUniqueValuesFromServer(this._originalLayer, uniqueFields);
  return GUI.showContentFactory('form');
};

proto._cancelFnc = function(promise) {
  return function() {
    GUI.setModal(false);
    promise.reject();
  }
};

proto._saveFnc = function(promise, context, inputs) {
  return function(fields) {
    const layerId = this._originalLayer.getId();
    this._originalLayer.setFieldsWithValues(this._feature, fields);
    if (this._feature.isNew()) {
     if (this._originalLayer.isPkEditable()) {
       fields.forEach((field) => {
         if(field.name === this._feature.getPk())
           this._feature.set(this._feature.getPk(), field.value);
       });
     }
    }
    const newFeature = this._feature.clone();
    if (this.isBranchLayer(layerId)) {
      newFeature.set("pipes", this._chart.pipes.data);
    }

    if (this._isContentChild)
      //is a relation so i i have to put relation feature
      inputs.relationFeature = {
        newFeature: this._feature,
        originalFeature: this._feature
      };
    else {
      this._session.pushUpdate(layerId, newFeature, this._originalFeature);
    }
    GUI.setModal(false);
    promise.resolve(inputs);
  }
};

proto._setChartComponent = function() {
  let default_value_changed = false;
  const self = this;
  this._chart = {
    data: null,
    pipes: {
      section: undefined,
      data: [],
      originalvalues: []
    }
  };

  //Hook

  EditPipes.created = function() {
    this.pipes = self._chart.pipes;
  };

  EditPipes.activated = function() {
   if (default_value_changed) {
     for (let i = this.pipes.data.length; i--;) {
       this.pipes.data[i][4] = this.pipes.pipe_section;
     }
     this.$forceUpdate()
   }
   default_value_changed = false;
  };
  //

  this._chart.pipes.pipe_section = this._feature.get('pipe_section_default');
  for (let i=0, len = this._fields.length; i< len; i++) {
    if (this._fields[i].name === "pipe_section_default") {
      this._fields[i] = new Proxy(this._fields[i], {
        set: (target, property, value) => {
          value = value ? +value: value;
          target[property] = value ;
          this._chart.pipes.pipe_section = value;
          default_value_changed = true;
          return true;
        }
      });
      break;
    }
  }
};

proto.startForm = function(options = {}) {
  const {inputs, context, promise } = options;
  const formComponent = options.formComponent || EditingFormComponent;
  const Form = this._getForm(inputs, context);
  const isBranchLayer = this.isBranchLayer(this._layerId);
  isBranchLayer &&  this._setChartComponent();
  const formService = Form({
    formComponent,
    title: `${t("editing.editing_attributes")} ${this._layerName}`,
    name: `${t("editing.editing_attributes")} ${this._layerName}`,
    id: this._generateFormId(this._layerName),
    dataid: this._layerName,
    layer: this._originalLayer,
    pk: this._pk,
    isnew: this._originalFeature.isNew(),
    fields: this._fields,
    context_inputs:  {
      context,
      inputs
    },
    formStructure: this._editorFormStructure,
    modal: true,
    perc: this._editorFormStructure ? 100 : null,
    push: this._isContentChild, // indica se posso aggiungere form
    showgoback: !this._isContentChild, // se è figlo evito di visualizzare il go back
    buttons:[{
      title: t("editing.form.buttons.save"),
      type: "save",
      class: "btn-success",
      cbk: this._saveFnc(promise, context, inputs).bind(this)
    }, {
      title: t("editing.form.buttons.cancel"),
      type: "cancel",
      class: "btn-primary",
      cbk: this._cancelFnc(promise).bind(this)
    }]
  });

  if (isBranchLayer) {
    formService.setLoading(true);
    this.getChartComponent({
      feature: this._feature,
      editing: {
        mode: true,
        components: [EditPipes]
      },
    }).then(({id, component, error, data}) => {
      if (!error) {
        this._chart.pipes.data = this._originalFeature.isNew()? data : this._feature.get('pipes');
        this._chart.pipes.originalvalues = data.map((_data) => _data[2]);
        formService.addComponent({
          id: id,
          component,
          icon: GUI.getFontClass('chart')
        });
      }
    }).catch((err)=>{
      console.log(err)
    })
      .finally(() => {
      formService.setLoading(false);
    })
  }
  WorkflowsStack.getCurrent().setContextService(formService);
};

// metodo eseguito all'avvio del tool
proto.run = function(inputs, context) {
  const d = $.Deferred();
  this.setEnableEditing(false);
  this.startForm({
    inputs: inputs,
    context: context,
    promise: d
  });
  return d.promise();
};

// genera il from id
proto._generateFormId = function(layerName) {
  return this._formIdPrefix + layerName;
};

// metodo eseguito alla disattivazione del tool
proto.stop = function() {
  this.setEnableEditing(true);
  this._chart = null;
  this._isContentChild ? GUI.popContent() : GUI.closeForm();
};

