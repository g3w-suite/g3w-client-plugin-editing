<template>
  <section class="editing-save-all-form">

    <bar-loader :loading="loading"/>

    <div
      class = "editing-button"
      style = "
        background-color: #fff;
        display: flex;
        justify-content:
        flex-end;
        width: 100%;
      "
    >
      <span
        v-disabled          = "disabled"
        @click.stop.prevent = "save"
      >
        <i
          class  = "skin-color"
          :class = "g3wtemplate.font['save']"
          style  = "
            font-size: 1.8em;
            padding: 5px;
            border-radius: 5px;
            cursor: pointer;
            box-shadow:  0 3px 5px rgba(0,0,0,0.5);
            margin: 5px;
          "
        ></i>
      </span>
    </div>

  </section>
</template>

<script>
  const { WorkflowsStack } = g3wsdk.core.workflow;
  const { FormService }    = g3wsdk.gui.vue.services;

  export default {

    name: 'Saveall',

    props: {

      update: {
        type: Boolean,
      },

      valid: {
        type: Boolean,
      },

    },

    data() {
      return {
        loading: false,
        enabled: false,
      };
    },

    computed: {

      disabled() {
        return !this.enabled && (!this.valid || !this.update);
      },

    },

    methods: {

      save() {
        const EditingService = require('../services/editingservice');

        this.loading = true;

        /** @TODO simplfy nested promises */
        Promise
          .allSettled(
            [...WorkflowsStack._workflows]
            .reverse()
            .map(w => w.getLastStep().getTask().saveAll(w.getContext().service.state.fields))
          )
          .then(() => {
            EditingService.commit({ modal: false })
            .then(()   => { WorkflowsStack._workflows.forEach(w => w.getContext().service.setUpdate(false, { force: false })); })
            .fail(()   => {})
            .always(() => { this.loading = false });
        })
      },

    },

    created() {
      // skip when ..
      if (!(WorkflowsStack.getLength() > 1)) {
        return;
      }

      this.enabled = WorkflowsStack
        ._workflows
        .slice(0, WorkflowsStack.getLength() - 1)
        .reduce((enabled, w) => {
          const service = w.getContext().service; 
          const {
            valid = true,
            update = false
          } = (service instanceof FormService) ? service.getState() : {};
          return valid && update && enabled;
          }, true);
    },

  };
</script>
