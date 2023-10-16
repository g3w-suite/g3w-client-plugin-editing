<!-- ORIGINAL SOURCE: -->
<!-- vue/components/toolsoftool.html@v3.4 -->
<!-- vue/components/toolsoftool.js@v3.4 -->

<template>
  <div
    id    = "toolsoftoolcontainer"
    style = "
      display: flex;
      flex-direction: column;
      margin: 5px;
      padding: 5px;
      border-radius: 5px;
    "
  >
    <template
      v-for = "tool in tools"
    >
      <component
        :is      = "tool.type"
        :options = "tool.options"
      />
      <divider/>
    </template>
  </div>
</template>

<script>
  import SnapComponent    from './ToolsOfToolSnap.vue';
  import MeasureComponent from './ToolsOfToolMeasure.vue';

  export default {

    name: 'Toolsoftool',

    props: ['tools'],

    components: {
      snap:    SnapComponent,
      measure: MeasureComponent
    },

    data() {
      return {};
    },

  };
</script>

<style scoped>
  #toolsoftoolcontainer {
    display: flex;
    flex-direction: column;
    margin: 5px;
    padding: 5px;
    border-radius: 5px;
  }
</style>
