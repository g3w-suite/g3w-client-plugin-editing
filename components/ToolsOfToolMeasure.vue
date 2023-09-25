<!-- ORIGINAL SOURCE: -->
<!-- vue/components/toolsoftool/measure.html@v3.4 -->
<!-- vue/components/toolsoftool/measure.js@v3.4 -->

<template>
  <div style="display: flex">
    <input
      id      ="g3w_editing_show_measure_tool"
      type    = "checkbox"
      class   = "magic-checkbox snap_tools_of_tools"
      v-model = "checked">
    <label
      for                      = "g3w_editing_show_measure_tool"
      v-t-tooltip:right.create = "'plugins.editing.toolsoftool.measure'"
    >
      <span
        style = "font-weight: bold"
        :class = "g3wtemplate.font['measure']" >
      </span>
    </label>
  </div>
</template>

<script>
  export default {

    name: "measure",

    props: ['options'],

    data() {
      return {
        checked: this.options.checked,
      };
    },

    watch: {

      'checked'(bool) {
        this.options.onChange(bool);
      },

    },

    beforeDestroy() {
      this.options.onBeforeDestroy();
    },

  };
</script>

<style scoped>
  label span {
    color: #222d32 !important;
  }
</style>
