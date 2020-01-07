const inherit = g3wsdk.core.utils.inherit;
const debounce = g3wsdk.core.utils.debounce;
const base =  g3wsdk.core.utils.base;
const t = g3wsdk.core.i18n.tPlugin;
const GUI = g3wsdk.gui.GUI;
const EditingFormComponent = require('../../../form/editingform');
const WorkflowsStack = g3wsdk.core.workflow.WorkflowsStack;
const EditingTask = require('./editingtask');
const pipesComponentFactory = require('../../../vue/components/editing/pipesComponentfactory');
const MAST_NOT_EDITABLE_FIELDS = ['name', 'label'];

function OpenFormTask(options={}) {
  this._formIdPrefix = 'form_';
  this._isContentChild = false;
  this.editattribute = options.editattribute;
  this._reactiveField;
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
  const isMastState = this.getStateOfModel() === 'mast';
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
  if (this._isContentChild) {
    this._fields.forEach((field) => {
      if (field.validate.exclude_values) {
        field.validate.exclude_values.splice();
        field.validate.exclude_values = context.otherfeatures.map((feature) => {
          return feature.fields.find(_field => _field.name === field.name).value.toString()
        });
      }
    })
  }
  if (isMastState)
    this._fields.forEach((field) => {
      if (MAST_NOT_EDITABLE_FIELDS.indexOf(field.name) !== -1) {
        field.editable = false;
      }
    });
  this._editorFormStructure = this._originalLayer.hasFormStructure() ? this._originalLayer.getEditorFormStructure() : null ;
  const uniqueFields = this._getUniqueFieldsType(this._fields);
  if (!_.isEmpty(uniqueFields))
    this._getFieldUniqueValuesFromServer(this._originalLayer, uniqueFields);
  return GUI.showContentFactory('form');
};

proto._cancelFnc = function(promise, chartData) {
  return function() {
    if (this.isBranchLayer(this._layerId)) {
      this._feature.set('pipes', chartData.originalpipes);
    }
    GUI.setModal(false);
    promise.reject();
  }
};

proto._saveFnc = function(promise, context, inputs, chartData) {
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
      if (!this._feature.get('pipes'))
        this._feature.set("pipes", chartData.pipes.data);
      newFeature.set("pipes", chartData.pipes.data);
    }

    if (this._isContentChild)
      //is a relation so i i have to put relation feature
      inputs.relationFeature = {
        newFeature: this._feature,
        originalFeature: this._originalFeature
      };
    this._session.pushUpdate(layerId, newFeature, this._originalFeature);
    GUI.setModal(false);
    promise.resolve(inputs);
  }
};

proto._createChartComponent = function({formService, chartData, step, replace=false, default_fields_value={}} = {}) {
  const EditPipesComponent = pipesComponentFactory(chartData.pipes);
  replace &&  this._feature.set('pipes', undefined);
  formService.setLoading(true);
  this.getChartComponent({
    feature: this._feature,
    step,
    editing: {
      mode: true,
      components: [EditPipesComponent]
    },
  }).then(({id, component, error, data}) => {
    if (!error) {
      data.forEach((pipe) => {
        chartData.pipes.data.push(pipe);
        chartData.originalpipes.push([...pipe]);
        chartData.pipes.originalvalues.push(pipe[2]);
      });
      if (!replace) {
        this._originalFeature.set('pipes', chartData.originalpipes);
        formService.addComponent({
          id: id,
          component,
          icon: GUI.getFontClass('chart')
        });
      } else {
        for (let i = chartData.pipes.data.length; i--;) {
          Object.keys(this.PIPESFIELDNAMEINDEX).forEach((fieldName) => {
            chartData.pipes.data[i][this.PIPESFIELDNAMEINDEX[fieldName]] = default_fields_value[fieldName];
          })
        }
        formService.replaceComponent({
          index: 1,
          component,
        })
      }
      formService.setLoading(false);
    } else {
      formService.setLoading(false);
      this._errorWhenGetProfileData();
    }
  }).catch((err)=>{
    formService.setLoading(true);
    this._errorWhenGetProfileData();
  })
};

proto.startForm = function(options = {}) {
  let isCreatedForm = false;
  const {inputs, context, promise } = options;
  const formComponent = options.formComponent || EditingFormComponent;
  const Form = this._getForm(inputs, context);
  const isBranchLayer = this.isBranchLayer(this._layerId);
  let chartData;
  let pipesFields;
  if (isBranchLayer) {
    const default_fields_value = {};
    Object.keys(this.PIPESFIELDNAMEINDEX).forEach((fieldName) => {
      default_fields_value[fieldName] = this._feature.get(fieldName) || null;
    });
    pipesFields = this._fields.filter((field) => {
      return this.PIPESFIELDNAMEINDEX[field.name] !== undefined;
    }).map((field) => {
      return {
        label: field.label.replace('Pipe', '').replace('default', '').trim(),
        index: this.PIPESFIELDNAMEINDEX[field.name]
      }
    });
    chartData = {
      originalpipes: [],
      pipes: {
        fields: pipesFields,
        data: [],
        originalvalues: [],
      }
    };

    for (let i=0, len = this._fields.length; i < len; i++) {
      const fieldName = this._fields[i].name;
      switch(fieldName) {
        case "pipe_diameter_default":
        case "pipe_inlet_diameter_default":
        case "pipe_equivalent_diameter_default":
        case "pipe_mesh_param_default":
        case "pipe_roughness_default":
          this._fields[i] = new Proxy(this._fields[i], {
            set: (target, property, value) => {
              value = value ? +value : value;
              default_fields_value[fieldName] = value;
              target[property] = value;
              for (let i = chartData.pipes.data.length; i--;) {
                chartData.pipes.data[i][this.PIPESFIELDNAMEINDEX[fieldName]] = value;
              }
              return true;
            }
          });
          break;
        case "profile_step_default":
          const debounceCreateChartComponent = debounce(this._createChartComponent.bind(this));
          this._fields[i] = new Proxy(this._fields[i], {
            set: (target, property, value) => {
              if (isCreatedForm && value !== null && target[property] !== value) {
                chartData.originalpipes = [];
                chartData.pipes =  {
                  fields: pipesFields,
                  data: [],
                  originalvalues: [],
                };
                debounceCreateChartComponent({
                  chartData,
                  formService,
                  step: value ? + value: null,
                  replace: true,
                  default_fields_value
                })
              }
              target[property] = value;
              return true;
            }
          });
          break;
        case "boundary_type":
          const enableDisableBoundaryTypeRelatedFields = (value) => {
            if (value === 'air' || value === 'water') {
              this._fields.forEach(field => {
                if (['boundary_depth', 'boundary_soil_type', 'boundary_soil_temp'].indexOf(field.name) !== -1) {
                  field.editable = false;
                  field.value = null;
                } else if (['boundary_velocity', 'boundary_temp'].indexOf(field.name) !== -1)
                  field.editable = true;
              })
            } else {
              this._fields.forEach(field => {
                if (['boundary_velocity', 'boundary_temp'].indexOf(field.name) !== -1) {
                  field.editable = false;
                  field.value = null;
                } else if (['boundary_depth', 'boundary_soil_type', 'boundary_soil_temp'].indexOf(field.name) !== -1) {
                  field.editable = true;
                }
              })
            }
          };
          this._fields[i] = new Proxy(this._fields[i], {
            set: (target, property, value) => {
              value && enableDisableBoundaryTypeRelatedFields(value);
              target[property] = value;
              return true;
            }
          });
          const value = this._fields[i].value;
          value && enableDisableBoundaryTypeRelatedFields(value);
          break;
      }
    }
  }
  const footer = {
    message: !isBranchLayer && this._originalLayer.getRelations() ?
      `${t('editing.form.relations.required')}  ${this._originalLayer.getRelations().getArray().map( (relation) => {
        const names = relation.getName().toUpperCase().split(' ');
        return names.length < 1 ? names[1] : names[0];
      }).join(', ')}` : null,
    style: {
      color: '#ff4b00',
      fontWeight: 'bold'
    }
  };
  const formService = this.formService = Form({
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
    footer,
    buttons:[{
      title: t("editing.form.buttons.save"),
      type: "save",
      class: "btn-success",
      cbk: this._saveFnc(promise, context, inputs, chartData).bind(this)
    }, {
      title: t("editing.form.buttons.cancel"),
      type: "cancel",
      class: "btn-primary",
      cbk: this._cancelFnc(promise, chartData).bind(this)
    }]
  });
  if (isBranchLayer) {
    this._createChartComponent({
      formService,
      chartData
    });
    isCreatedForm = true;
  }
  // custom for valvues
  const relations = this._originalLayer.getRelations() ? this._originalLayer.getRelations().getArray(): [];
  if (relations.length === 2) {
    const id = `${t("editing.edit_relation")} ${relations[0].getName()}`;
    const cdField = this._fields.find(field => field.name === 'cd');
    const startingFooterMessage = footer.message;
    const cdValidMessage = `${t('editing.form.relations.required')} ${relations[1].getName().toUpperCase()}`;
    this._reactiveField = new Vue({
      functional: true,
      created() {
        let isValid = false;
        const EventBus = formService.getEventBus();
        EventBus.$on('add-component-validate',({id:relationId, valid}) => {
          if (id === relationId) {
            isValid = valid;
            EventBus.$off('add-component-validate');
          }
        });
        EventBus.$on('validate-relation',({id:relationId, valid}) => {
          if (id === relationId) {
            isValid = valid;
          }
        });
        this.$watch(() => cdField.value, (value) => {
          footer.message = !!value ? cdValidMessage : startingFooterMessage;
          EventBus.$emit('disable-component', {index: 1, disabled: !!value});
          EventBus.$emit('component-validation',
            {
              id,
              valid: !!value || isValid
            });
        })
      }
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
  this.setEnableEditing(!this._isContentChild);
  this._reactiveField && this._reactiveField.$destroy();
  this._reactiveField = null;
  this._isContentChild ? GUI.popContent() : GUI.closeForm();
  this.formService && this.formService.getEventBus().$off('validate-relation');
  this.formService = null;
};

