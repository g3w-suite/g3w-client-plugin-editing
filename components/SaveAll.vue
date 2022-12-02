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
        return !this.enabled || !this.update;
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
              savePromises[0].then(({
                promise
              }) => {
                WorkflowsStack._workflows.forEach(workflow => workflow.getContext().service.setUpdate(false))
                promise.resolve();
              })
            }).fail(()=>{})
              .always(() => {
              this.loading = false
            });
        })
      },
      watchState(){
        const current_state = WorkflowsStack.getCurrent().getContext().service.state;
        this.enabled = current_state.valid;
        this.unwatch = this.$watch(() => current_state.valid, valid => {
          this.enabled = valid;
        })
      }
    },
    async mounted() {
      await this.$nextTick();
      if (WorkflowsStack.getLength() === 1) this.watchState();
      else {
        const enabled = WorkflowsStack._workflows.slice(0, WorkflowsStack.getLength())
          .reduce((accumulator, workflow) => workflow.getContext().service.getState().valid && accumulator, true);
        enabled && this.watchState();
      }
    },
    beforeDestroy(){
      this.unwatch && this.unwatch();

    }
  };
</script>
