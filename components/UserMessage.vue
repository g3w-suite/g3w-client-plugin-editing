<!--
  @since g3w-client-plugin-editing@v3.8.0
  @file
-->
<template>
  <ul class="steps-list">

    <li
      v-for  = "(step, id) in steps"
      :key   = "id"
      :style = "{ display: step.buttonnext && 'inline-flex' }"
      :class = "{ 'done': step.done }"
    >

      <span v-if="step.buttonnext" class="button-step">
        <span
          v-t-plugin = "step.description"
          class      = "description"
        ></span>
        <span
          v-if  = "step.dynamic"
          class = "dynamic-step"
        >{{ step.dynamic }}</span>
        <button
          @click     = "completeStep(step)"
          :class     = "'btn btn-success' + (step.buttonnext.disabled ? ' g3w-disabled' : '' )"
          v-t-plugin = "'editing.workflow.next'"
        ></button>
      </span>

      <template v-else>
        <i :class="g3wtemplate.getFontClass(step.done ? 'success' : 'empty-circle')"></i>
        <span v-t-plugin="step.description"></span>
      </template>

    </li>

  </ul>
</template>

<script>
  export default {

    data: () => ({ steps: {} }),

    methods: {
      completeStep(step) {
        step.done = true;
        step.buttonnext.done();
      },
    },

  };
</script>

<style scoped>
  .steps-list {
    align-self: flex-start;
    list-style: none;
    padding: 10px;
    margin-bottom: 0;
  }
  li {
    margin-bottom: 5px;
  }
  li.done {
    font-weight: bold;
    color: green;
  }
  li.done > .description {
    font-weight: bold;
  }
  .dynamic-step {
    padding: 10px;
    font-size: 1.2em;
  }
  .button-step {
    display: inline-flex;
    align-items: center;
  }
  .button-step,
  button.btn-success {
    font-weight: bold;
    align-self: normal;
  }
</style>
  