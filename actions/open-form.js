/**
 * @file
 * 
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/index.j@v4.0.0
 * 
 * @since g3w-client-plugin-editing@v4.1.0
 */

import { getParentFormData }                            from '../utils/getParentFormData';
import { setAndUnsetSelectedFeaturesStyle }             from '../utils/setAndUnsetSelectedFeaturesStyle';
import { getFormFields }                                from '../utils/getFormFields';
import { handleRelation1_1LayerFields }                 from '../utils/handleRelation1_1LayerFields';
import { listenRelation1_1FieldChange }                 from '../utils/listenRelation1_1FieldChange';
import { getLayersDependencyFeatures }                  from '../utils/getLayersDependencyFeatures';
import { getEditingLayerById }                          from '../utils/getEditingLayerById';
import { setLayerUniqueFieldValues }                    from '../utils/setLayerUniqueFieldValues';
import { getRelationsInEditingByFeature }               from '../utils/getRelationsInEditingByFeature';

import { Workflow }                                     from '../g3w-workflow';
import { Step }                                         from '../g3w-step';

const { GUI }                                           = g3wsdk.gui;
const { FormService }                                   = g3wsdk.gui.vue.services;


/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/openformtask.js@v3.7.1
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/openformstep.js@v3.7.1
 */
export class OpenFormStep extends Step {

  constructor(options = {}) {

    options.help = "editing.steps.help.insert_attributes_feature";

    super(options);

    /**
     * Show saveAll button
     *
     * @since v3.7
     */
    this._saveAll = false === options.saveAll ? options.saveAll : async () => {};

    /**
     * Whether it can handle multi edit features
     */
    this._multi = options.multi || false;

    /**
     * @FIXME set a default value + add description
     */
    this.layerId;

    /**
     * whether form is coming from parent table component
     */
    this._isContentChild = false;

    /**
     * @FIXME set a default value + add description
     */
    this._features;

    /**
     * @FIXME set a default value + add description
     */
    this._originalFeatures;

    /**
     * @FIXME set a default value + add description
     */
    this.promise;

    /**
     * @since g3w-client-plugin-editing@v3.7.0
     */
    this._unwatchs = [];

  }

  /**
   * @since v3.7
   * @param bool
   */
  updateMulti(bool = false) {
    this._multi = bool;
  }

  /**
   * @param inputs
   * @param context
   *
   * @returns {*}
   */
  async run(inputs, context) {
    //@since 3.9.0 can set isContentChild attribute to force it
    // (case edit relation features from multi-parent features)
    this._isContentChild   = undefined === context.isContentChild ? Workflow.Stack.getLength() > 1 : context.isContentChild;
    this.layerId           = inputs.layer.getId();
    this._features         = this._multi ? inputs.features : [inputs.features[inputs.features.length - 1]];
    this._originalFeatures = this._features.map(f => f.clone());

    //@since 3.9.0 promise
    const promise = new Promise((resolve) => {
      g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').subscribe(`closeform_${this.layerId}`, () => {
        resolve();
        return { once: true }; // once close form, remove subscribing
      })
    })

    //set selected features
    setAndUnsetSelectedFeaturesStyle({ promise, inputs, style: this.selectStyle });

    return new Promise(async (resolve, reject) => {

      GUI.setLoadingContent(false);

      GUI.getService('map').disableClickMapControls(true);

      if (!this._multi && Array.isArray(inputs.features[inputs.features.length - 1])) {
        resolve();
        return;
      }

      g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').setCurrentLayout();

      const layerName        = inputs.layer.getName();

      // create a child relation feature set a father relation field value
      if (this._isContentChild) {
        context.fatherValue = context.fatherValue || []; // are array
        (context.fatherField || []).forEach((field, i) => {
          this._features[0].set(field, context.fatherValue[i]);
          this._originalFeatures[0].set(field, context.fatherValue[i]);
        });
      }

      const fields = getFormFields({
        inputs,
        context,
        feature: this._features[0],
        isChild: this._isContentChild,
        multi:   this._multi,
      });

      // set fields. Useful getParentFormData
      Workflow.Stack.getCurrent().setInput({ key: 'fields', value: fields });

      // whether disable relations editing (ref: "editmultiattributes")
      const feature = !this._multi && inputs.features && inputs.features[inputs.features.length - 1];
      const layerId = !this._multi && inputs.layer.getId();

      // @since g3w-client-plugin-editing@v3.7.2
      // skip relations that don't have a form structure
      if (feature && !feature.isNew() && inputs.layer.getLayerEditingFormStructure()) {
        await getLayersDependencyFeatures(inputs.layer.getId(), {
          // @since g3w-client-plugin-editin@v3.7.0
          relations: inputs.layer.getRelations().getArray().filter(r =>
            inputs.layer.getId() === r.getFather() && // get only child relation features of current editing layer
            getEditingLayerById(r.getChild()) &&      // child layer is in editing
            'ONE' !== r.getType()                     // exclude ONE relation (Join 1:1)
          ),
          feature,
          filterType: 'fid',
        });
      }

      /** ORIGINAL SOURCE: g3w-client-plugin-editing/form/editingform.js@v3.7.8 */
      /** ORIGINAL SOURCE: g3w-client-plugin-editing/form/editingformservice.js@v3.7.8 */
      const formService = GUI.showForm({
        feature:         this._originalFeatures[0],
        title:           "plugins.editing.editing_attributes",
        name:            layerName,
        crumb:           { title: layerName },
        id:              `form_${layerName}`,
        dataid:          layerName,
        layer:           inputs.layer,
        isnew:           this._originalFeatures.length > 1 ? false : this._originalFeatures[0].isNew(), // specify if is a new feature
        parentData:      getParentFormData(),
        fields,
        context_inputs:  this._multi ? false: { context, inputs },
        formStructure:   inputs.layer.hasFormStructure() && inputs.layer.getLayerEditingFormStructure() || undefined,
        modal:           true,
        push:            this._options.push || this._isContentChild, /** @since v3.7 force push content on top without clear previous content */
        showgoback:      undefined === this._options.showgoback ? !this._isContentChild : this._options.showgoback, /** @since v3.7 force show back button */
        /** @TODO make it straightforward: `headerComponent` vs `buttons` ? */
        headerComponent: this._saveAll && {
          template: /* html */ `
            <section class = "editing-save-all-form" style = "display: flex;">
              <div
                class  = "editing-button"
                :style = "{ cursor: disabled ? 'not-allowed' : 'pointer' }"
                style  = "background-color: #fff; display: flex; justify-content: flex-end; width: 100%;"
              >
                <span
                  class               = "save-all-icon"
                  v-disabled          = "disabled"
                  @click.stop.prevent = "saveAll"
                >
                  <i
                    class  = "skin-color"
                    :class = "g3wtemplate.font['save']"
                    style  = "font-size: 1.8em; padding: 5px; border-radius: 5px; cursor: pointer; box-shadow: 0 3px 5px rgba(0,0,0,0.5); margin: 5px;"
                  ></i>
                </span>
              </div>
              <!-- @since 3.9.0 -->
              <div
                v-if       = "isChild"  
                class      = "close-form-button"
                :style     = "{ cursor: !disabled ? 'not-allowed' : 'pointer' }"
                style      = "background-color: #fff; display: flex; justify-content: flex-end; width: 100%;"
              >
                <span
                  class               = "save-all-icon skin-color-dark"
                  v-disabled          = "!disabled"
                  @click.stop.prevent = "closeForm"
                >
                  <i
                    :class = "g3wtemplate.font['close']"
                    style  = "font-size: 1.8em; padding: 5px; border-radius: 5px; cursor: pointer; box-shadow: 0 3px 5px rgba(0,0,0,0.5); margin: 5px;"
                  ></i>
                </span>
              </div> 
            </section>`,
            name: 'Saveall',
            /** @TODO figure out who populate these props (ie. core client code?) */
            props: { update: { type: Boolean }, valid: { type: Boolean } },
            data() {
              return {
                enabled: Workflow.Stack._workflows.slice(0, Workflow.Stack.getLength() - 1)
                  .every(w => {
                    const valid = ((w.getContext().service instanceof FormService) ? w.getContext().service.getState() : {}).valid;
                    return valid || undefined === valid;
                  }),
                isChild: Workflow.Stack.getLength() > 1 && !(2 === Workflow.Stack.getLength() && Workflow.Stack.getFirst().isType('edittable'))
              };
            },
            computed: {
              /** @returns {boolean} whether disable save all button (eg. when parent or current form is not valid/ updated) */
              disabled() {
                return !this.enabled || !(this.valid && this.update);
              },
            },
            methods: {
              async saveAll() {
                //Set loading content
                GUI.setLoadingContent(true);
                //Disable form
                GUI.disableContent(true);
                try {
                await Promise.allSettled(
                  [...Workflow.Stack._workflows]
                    .reverse()
                    .filter(w => "function" === typeof w.getLastStep()._saveAll) // need to filter only workflow that
                    .map( w => new Promise(async (resolve) => {
                      const task   = w.getLastStep();
                      //get features fields of form service that has value not null to set of all features
                      const fields = w.getContext().service.state.fields.filter(f => task._multi ? null !== f.value : true);
                      await Workflow.Stack.getCurrent().getContextService().saveDefaultExpressionFieldsNotDependencies();
                      task._features.forEach(f => task.getInputs().layer.setFieldsWithValues(f, fields));
                      const newFeatures = task._features.map(f => f.clone());
                      //Is a relation form
                      if (task._isContentChild) {
                        task.getInputs().relationFeatures = { newFeatures, originalFeatures: task._originalFeatures };
                      }
                      await task.fireEvent('saveform', { newFeatures, originalFeatures: task._originalFeatures });
                      newFeatures.forEach((f, i) => task.getContext().session.pushUpdate(task.layerId, f, task._originalFeatures[i]));
                      await handleRelation1_1LayerFields({ layerId: task.layerId, features: newFeatures, fields, task });
                      task.fireEvent('savedfeature', newFeatures);                 // called after saved
                      task.fireEvent(`savedfeature_${task.layerId}`, newFeatures); // called after saved using layerId
                      task.getContext().session.save();
                      return resolve();
                    }))
                )
                } catch(e) {
                  console.warn(e);
                }
                try {
                  await g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').service.commit({ modal: false });
                  [...Workflow.Stack._workflows]
                    .reverse()
                    .filter(w => "function" === typeof w.getLastStep()._saveAll)
                    .forEach(w => {
                      const service = w.getContext().service; //form service
                      //need to set update form false because already saved on server
                      service.setUpdate(false, { force: false });
                      const feature = service.feature;
                      // Check if the feature is new.
                      // In this case, after commit, need to set new to false, and force update to false.
                      if (feature.isNew()) {
                        feature.state.new    = false;
                        service.force.update = false;
                      }
                      Object.entries(
                        w.getInputs().layer.getEditingSource().readFeatures()
                          .find(f => f.getUid() === feature.getUid()) //Find current form editing feature by unique id of feature uid
                          .getProperties() //get properties
                      )
                        .forEach(([k, v]) => {
                          const field = service.getFields().find(f => k === f.name);
                          //if field exists (geometry field is discarded)
                          if (field) {
                            field.value = field._value = v;
                          }
                        })
                    })
                } catch(e) {
                  console.warn(e);
                }
                //set loading content false
                GUI.setLoadingContent(false);
                //enable form
                GUI.disableContent(false);
              },
              /**
               * @since 3.9.0
               * Close editing form
               */
              async closeForm() {
                //get current active tool
                const tool = g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').state.toolboxselected.getActiveTool();
                //stop active tool and wait
                await tool.stop();
                //clear all workflow stacks
                Workflow.Stack.clear();
                //check if the tool needs to run on time. If not, start again
                if (!tool.getOperator().runOnce) {
                  tool.start();
                }
              }
            },
          },
          buttons:         [
            {
              id:    'save',
              title:  this._isContentChild
                ? Workflow.Stack.getParent().getBackButtonLabel() || "plugins.editing.form.buttons.save_and_back" // get custom back label from parent
                : "plugins.editing.form.buttons.save",
              type:  "save",
              class: "btn-success",
              // save features
              cbk: async (fields = []) => {
                fields = this._multi ? fields.filter(f => null !== f.value) : fields;
                // skip when no fields
                if (0 === fields.length) {
                  resolve(inputs);
                  return;
                }

                const newFeatures = [];

                // @since 3.5.15
                GUI.setLoadingContent(true);
                GUI.disableContent(true);

                await Workflow.Stack.getCurrent().getContextService().saveDefaultExpressionFieldsNotDependencies();

                GUI.setLoadingContent(false);
                GUI.disableContent(false);

                this._features.forEach(f => {
                  inputs.layer.setFieldsWithValues(f, fields);
                  newFeatures.push(f.clone());
                });

                if (this._isContentChild) {
                  inputs.relationFeatures = {
                    newFeatures,
                    originalFeatures: this._originalFeatures
                  };
                }

                await this.fireEvent('saveform', { newFeatures, originalFeatures: this._originalFeatures});

                newFeatures.forEach((f, i) => context.session.pushUpdate(this.layerId, f, this._originalFeatures[i]));

                // check and handle if layer has relation 1:1
                await handleRelation1_1LayerFields({
                  layerId:  this.layerId,
                  features: newFeatures,
                  fields,
                  task:     this,
                });

                GUI.setModal(false);

                this.fireEvent('savedfeature', newFeatures);                 // called after saved
                this.fireEvent(`savedfeature_${this.layerId}`, newFeatures); // called after saved using layerId
                // In case of save of child, it means that child is updated so also parent
                if (this._isContentChild) {
                  Workflow.Stack.getParents()
                    //filter only with has getContextService to be sure
                    .filter(w =>  w.getContextService() && w.getContextService().setUpdate)
                    .forEach(w => w.getContextService().setUpdate(true, { force: true }));
                }
                //@TODO add field unique new value id not set
                resolve(inputs);
              }
            },
            {
              id:    'cancel',
              title: "plugins.editing.form.buttons.cancel",
              type:  "cancel",
              class: "btn-danger",
              /// buttons in case of change
              eventButtons: {
                update: {
                  false : {
                    id:    'close',
                    title: "close",
                    type:  "cancel",
                    class: "btn-danger",
                  }
                }
              },
              cbk: () => {
                this.fireEvent('cancelform', inputs.features); // fire event cancel form to emit to subscribers
                reject(inputs);
              }
            }
          ]
      });

      // Overwrite click on relation.
      // Open FormRelation.vue component
      formService.handleRelation = async e => {
        // Skip when multi editing features
        // It is not possible to manage relationss when we edit multi-features
        if (this._multi) {
          GUI.showUserMessage({ type: 'info', message: 'plugins.editing.errors.editing_multiple_relations', duration: 3000, autoclose: true });
          return;
        }
        GUI.setLoadingContent(true);
        //set unique values for relation layer based on unique fields
        //@TODO need a find a way to call once and not every time we open a relation
        await setLayerUniqueFieldValues(inputs.layer.getRelationById(e.relation.name).getChild());
        formService.setCurrentComponentById(e.relation.name);
        GUI.setLoadingContent(false);
      }

      formService.addComponents([
        // custom form components
        ...(g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').state.formComponents[layerId] || []),
        // relation components (exlcude ONE relation + layer is the father get relation layers that set in editing on g3w-admin)
        ...getRelationsInEditingByFeature({
          layerId,
          relations: this._multi ? [] : inputs.layer.getRelations().getArray().filter(r => r.getType() !== 'ONE' && r.getFather() === layerId),
          feature:   this._multi ? false : inputs.features[inputs.features.length - 1],
        }).map(({ relation, relations }) => ({
          title:     "plugins.editing.edit_relation",
          name:      relation.name,
          id:        relation.id,
          header:    false,            // hide a header form
          component: Vue.extend({
            mixins: [ require('../components/FormRelation.vue') ],
            name: `relation_${Date.now()}`,
            data() {
              return { layerId, relation, relations };
            },
          }),
        }))
      ]);

      // fire openform event
      this.fireEvent('openform',
        {
          layerId: this.layerId,
          session: context.session,
          feature: this._originalFeature,
          formService
        }
      );

      // set context service to form Service in case of a single task (i.e., no workflow)
      if (Workflow.Stack.getCurrent()) {
        Workflow.Stack.getCurrent().setContextService(formService);
      }

      //listen eventually field relation 1:1 changes value
      listenRelation1_1FieldChange({ layerId: this.layerId, fields, formService }).then(d => this._unwatchs = d);

      this.disableSidebar(true);
    });
  
  }

  /**
   *
   */
  stop() {
    this.disableSidebar(false);

    //Check if form coming from the parent table component
    const is_parent_table = false === this._isContentChild || // no child workflow
      (
        // case edit feature of a table (edit layer alphanumeric)
        2 === Workflow.Stack.getLength() && //open features table
        Workflow.Stack.getParent().isType('edittable')
      );
    // when the last feature of features is Array
    // and is resolved without setting form service
    // Ex. copy multiple features from another layer
    if (is_parent_table) {
      GUI.getService('map').disableClickMapControls(false);
      GUI.setModal(false);
    }

    const contextService = is_parent_table && Workflow.Stack.getCurrent().getContextService();

    // force update parent form update
    if (contextService && contextService.setUpdate && false === this._isContentChild) {
      contextService.setUpdate(false, { force: false });
    }

    //@since 3.9.0 add GUI.getContentLength() in case of edit multi relationfeatures tool
    GUI.closeForm({ pop: this.push || this._isContentChild && GUI.getContentLength() > 1 });

    g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').resetCurrentLayout();

    this.fireEvent('closeform');
    this.fireEvent(`closeform_${this.layerId}`);

    this.layerId = null;
    this._unwatchs.forEach(unwatch => unwatch());
    this._unwatchs = [];
  }

}