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

      <i :class="{
        [g3wtemplate.getFontClass('arrow-right')]:  !step.done && i === this.currentStep, // current step
        [g3wtemplate.getFontClass('empty-circle')]: !step.done && i !== this.currentStep, // todo step
        [g3wtemplate.getFontClass('success')]:      step.done,                            // done step
      }"></i>

      <span v-if="step.buttonnext" class="button-step">
        <span
          :style     = "{ fontWeight: step.done && 'bold' }"
          v-t-plugin = "step.description"
        ></span>
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
        currentStep: 0,
      };
    },

    watch: {
      steps: {
        handler(steps) {
          Object.values(steps).find((step, i) => {
            if (!step.done) {
              this.currentStep = i;
              return true;
            }
          });
        },
        deep: false,
      }
    },

    methods: {

      completeStep(step) {
        step.done = true;
        step.buttonnext.done();
      },

    }
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
    flex-direction: row-reverse;
  }
  button.btn-success {
    font-weight: bold;
  }
</style>
  