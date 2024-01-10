import SaveAll                  from '../../../components/SaveAll.vue';

const { base, inherit }         = g3wsdk.core.utils;
const { GUI }                   = g3wsdk.gui;
const { WorkflowsStack }        = g3wsdk.core.workflow;

const EditingTask               = require('./editingtask');
const EditingFormComponent      = require('../../../form/editingform');
const EditTableFeaturesWorkflow = require('../../edittableworkflow');

function OpenFormTask(options={}) {

  const {
    push=false,
    saveAll=true,
    multi=false,
    showgoback,
  } = options;

  /**
   * Used to force show back button
   * @since v3.7
   * @type {boolean}
   */
  this.showgoback = showgoback;
  /**
   * @since v3.7
   * to force to push content on top without clear previus content
   */
  this.push = push;

  /**
   * Show saveAll button
   * @since v3.7
   */
  this._saveAll = saveAll;

  /**
   * Whether it can handle multi edit features
   */
  this._multi = multi;

  /**
   * @FIXME add description
   */
  this._edit_relations = options.edit_relations === undefined ? true : options._edit_relations;

  /**
   * @FIXME add description
   */
  this._formIdPrefix = 'form_';

  /**
   * @FIXME set a default value + add description
   */
  this.layerId;

  /**
   * @FIXME add description
   */
  this._isContentChild = false;

  /**
   * @FIXME set a default value + add description
   */
  this._features;

  /**
   * @FIXME set a default value + add description
   */
  this._originalLayer;

  /**
   * @FIXME set a default value + add description
   */
  this._editingLayer;

  /**
   * @FIXME set a default value + add description
   */
  this._layerName;

  /**
   * @FIXME set a default value + add description
   */
  this._originalFeatures;

  /**
   * @FIXME set a default value + add description
   */
  this._fields;

  /**
   * @FIXME set a default value + add description
   */
  this._session;

  /**
   * @FIXME set a default value + add description
   */
  this._editorFormStructure;

  /**
   * @FIXME set a default value + add description
   */
  this.promise;


  /**
   * @since g3w-client-plugin-editing@v3.7.0
   */
  this._unwatchs = [];

  base(this, options);
}

inherit(OpenFormTask, EditingTask);

module.exports = OpenFormTask;

const proto = OpenFormTask.prototype;

/**
 * @since v3.7
 * @param bool
 */
proto.updateMulti = function(bool=false) {
  this._multi = bool;
};

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
    //Are array
    const {fatherValue=[], fatherField=[]} = context;
    fatherField.forEach((fField, index) => {
      feature.set(fField, fatherValue[index]);
      this._originalFeatures[0].set(fField, fatherValue[index]);
    })

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

/**
 *
 * @param fieldssetAndUnsetSelectedFeaturesStyle
 * @param fields Array of fields
 * @returns {Promise<unknown>}
 */
proto.saveAll = function(fields) {
  return new Promise(async (resolve, reject) => {
    const {session} = this.getContext();
    const inputs = this.getInputs();
    fields = this._multi ? fields.filter(field => field.value !== null) : fields;
    if (fields.length) {
      await WorkflowsStack.getCurrent().getContextService().saveDefaultExpressionFieldsNotDependencies();
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
        //check and handle if layer has relation 1:1
        this.handleRelation1_1LayerFields({
          layerId: this.layerId,
          features: newFeatures,
          fields
        }).then(() => {
          this.fireEvent('savedfeature', newFeatures); // called after saved
          this.fireEvent(`savedfeature_${this.layerId}`, newFeatures); // called after saved using layerId

          session.save();
          resolve({
            promise: this.promise
          });
        })
      })
    }
  })
};

proto._saveFeatures = async function({fields, promise, session, inputs}){
  fields = this._multi ? fields.filter(field => field.value !== null) : fields;
  if (fields.length) {
    const newFeatures = [];

    // @since 3.5.15
    GUI.setLoadingContent(true);
    GUI.disableContent(true);


    await WorkflowsStack.getCurrent().getContextService().saveDefaultExpressionFieldsNotDependencies();

    GUI.setLoadingContent(false);
    GUI.disableContent(false);

    /**
     *
     */

    this._features.forEach(feature => {
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
    }).then(() => {
      newFeatures
        .forEach((newFeature, index)=> session.pushUpdate(this.layerId, newFeature, this._originalFeatures[index]));

      //check and handle if layer has relation 1:1
      //async
      this.handleRelation1_1LayerFields({
        layerId: this.layerId,
        features: newFeatures,
        fields
      }).then(()=> {
        GUI.setModal(false);
        this.fireEvent('savedfeature', newFeatures); // called after saved
        this.fireEvent(`savedfeature_${this.layerId}`, newFeatures); // called after saved using layerId
        // In case of save of child it means that child is updated so also parent
        if (this._isContentChild) {
          WorkflowsStack
            .getParents()
            .forEach(workflow => workflow.getContextService().setUpdate(true, {force: true}));
        }
        promise.resolve(inputs);
      })
    })
  } else {

    GUI.setModal(false);

    promise.resolve(inputs);
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

  /**
   * set fields. Useful getParentFormData
   */
  WorkflowsStack
    .getCurrent()
    .setInput({key: 'fields', value: this._fields});

  const formService = Form({
    formComponent,
    title: "plugins.editing.editing_attributes",
    name: this._layerName,
    crumb: {title: this._layerName},
    id: this._generateFormId(this._layerName),
    dataid: this._layerName,
    layer: this._originalLayer,
    isnew: this._originalFeatures.length > 1 ? false : feature.isNew(), // specify if is a new feature
    feature,
    parentData: this.getParentFormData(),
    fields: this._fields,
    context_inputs: !this._multi && this._edit_relations && {context, inputs},
    formStructure: this._editorFormStructure,
    modal: true,
    push: this.push || this._isContentChild, //@since v3.7 need to take in account this.push value
    showgoback: undefined !== this.showgoback ? this.showgoback : !this._isContentChild,
    headerComponent: this._saveAll && SaveAll,
    buttons: [
      {
        id: 'save',
        title: this._isContentChild ?
          (
            //check if parent has custom back label set
            WorkflowsStack.getParent().getBackButtonLabel() ||
            "plugins.editing.form.buttons.save_and_back"
          ) :
          "plugins.editing.form.buttons.save",
        type: "save",
        class: "btn-success",
        cbk: (fields) => {
          this._saveFeatures({ fields, promise, inputs, session: context.session, });
        }
      },
      {
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
        cbk: () => {
          if (!this._isContentChild){
            GUI.setModal(false);
            this.fireEvent('cancelform', inputs.features); // fire event cancel form to emit to subscrivers
          }
          promise.reject(inputs);
        }
      }
    ]
  });
  //fire openform event
  this.fireEvent('openform',
    {
      layerId:this.layerId,
      session,
      feature: this._originalFeature,
      formService
    }
  );

  const currentWorkflow = WorkflowsStack.getCurrent();
  // in case of called single task no workflow is set
  if (currentWorkflow) {
    //set context service to form Service
    currentWorkflow.setContextService(formService);
  }

  //listen eventually field relation 1:1 changes value
  this._unwatchs = await this.listenRelation1_1FieldChange({
    layerId: this.layerId,
    fields: this._fields,
  })
};

proto.run = function(inputs, context) {
  const d = $.Deferred();
  this.promise = d;
  this._isContentChild = WorkflowsStack.getLength() > 1;
  const { layer, features } = inputs;
  this.layerId = layer.getId();
  GUI.setLoadingContent(false);
  this.getEditingService().disableMapControlsConflict(true);

  this.setAndUnsetSelectedFeaturesStyle({
    promise: d
  });

  if (!this._multi && Array.isArray(features[features.length -1])) {
    d.resolve();
  } else {
    this.startForm({
      inputs,
      context,
      promise: d
    });
    this.disableSidebar(true);
  }

  return d.promise();
};

proto._generateFormId = function(layerName) {
  return this._formIdPrefix + layerName;
};

proto.stop = function() {
  this.disableSidebar(false);

  const service = this.getEditingService();
  let contextService;

  // when the last feature of features is Array
  // and is resolved without setting form service
  // Ex. copy multiple feature from other layer
  if (
    false === this._isContentChild || // no child worklow
    (
      //case edit feature of a table (edit layer alphanumeric)
      WorkflowsStack.getLength() === 2 && //open features table
      WorkflowsStack.getParent() instanceof EditTableFeaturesWorkflow
    )
  ) {
    service.disableMapControlsConflict(false);
    contextService = WorkflowsStack.getCurrent().getContextService();
  }

  // force update parent form update
  if (contextService && !this._isContentChild) {
    contextService.setUpdate(false, { force: false });
  }

  GUI.closeForm({ pop: this.push || this._isContentChild });

  service.resetCurrentLayout();

  this.fireEvent('closeform');
  this.fireEvent(`closeform_${this.layerId}`); // need to check layerId

  this.layerId = null;
  this.promise = null;
  // class unwatch
  this._unwatchs.forEach(unwatch => unwatch());
  //reset to Empty Array
  this._unwatchs = [];
};