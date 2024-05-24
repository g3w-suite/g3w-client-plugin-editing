<!--
  @since g3w-client-plugin-editing@v3.8.0
  @file
-->
<template>
  <ul class="steps-list">

    <li
      v-for  = "(step, i) in steps"
      :key   = "i"
      :style = "{
        fontWeight:   (step.done || i === this.currentStep) && 'bold',
        marginBottom: '5px',
        color:        step.done && 'green',
        display:      step.buttonnext && 'inline-flex'
      }"
    >

      <i :class="g3wtemplate.getFontClass(step.done ? 'success' : (i === this.currentStep ? 'arrow-right' : 'empty-circle'))"></i>

      <span v-if="step.buttonnext" class="button-step">
        <span
          :style     = "{ fontWeight: step.done && 'bold' }"
          v-t-plugin = "step.description"
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

      <span v-else v-t-plugin="step.description"></span>

    </li>

  </ul>
</template>

<script>
  export default {

    data() {
      return {
        steps: {},
      };
    },

    computed: {
      currentStep() {
        return Object.values(this.steps).findLastIndex(s => s.done) || 0;
      }
    },

    methods: {
      completeStep(step) {
        step.done = true;
        step.buttonnext.done();
      },
    },

    created() {
      console.log(this);
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
  .button-step {
    display: inline-flex;
  }
  button.btn-success {
    font-weight: bold;
  }
</style>
  