<template>
  <section class="editing-save-all-form">
    <bar-loader :loading="loading"></bar-loader>
    <div class="editing-button"  style="background-color: #ffffff; display: flex; justify-content: flex-end; width: 100%;">
      <span v-disabled="disabled" @click.stop.prevent="save">
        <i class="skin-color" :class="g3wtemplate.font['save']" style="font-size: 1.8em; padding: 5px; border-radius: 5px; cursor: pointer; box-shadow:  0 3px 5px rgba(0,0,0,0.5); margin: 5px;" ></i>
      </span>
    </div>
  </section>
</template>

<script>
  const {WorkflowsStack} = g3wsdk.core.workflow;
  export default {
    props: {
      update: {
        type: Boolean,
      },
      valid: {
        type: Boolean
      }
    },
    name: 'Saveall',
    data() {
      return {
        loading: false,
        enabled: false
      }
    },
    computed: {
      disabled(){
        return !this.enabled && (!this.valid || !this.update);
      }
    },
    methods: {
      save(){
        const EditingService = require('../services/editingservice');
        this.loading = true;
        const savePromises = [...WorkflowsStack._workflows]
          .reverse()
          .map(workflow => {
            return workflow.getLastStep()
              .getTask()
              .saveAll(workflow.getContext().service.state.fields);
          });
        Promise.allSettled(savePromises)
          .then(()=> {
            EditingService.commit({
              modal: false
            }).then(() => {
              WorkflowsStack._workflows.forEach(workflow => workflow.getContext().service.setUpdate(false, {
                force: false
              }));
            }).fail(()=>{})
              .always(() => {
              this.loading = false
            });
        })
      }
    },
    created() {
      if (WorkflowsStack.getLength() > 1) {
        this.enabled = WorkflowsStack._workflows
          .slice(0, WorkflowsStack.getLength() - 1)
          .reduce((accumulator, workflow) => {
            const {valid, update} = workflow.getContext().service.getState();
            return valid && update && accumulator;
            }, true);
      }
    },
  };
</script>
