<template>
  <div id="toolsoftoolcontainer" style="display: flex; flex-direction: column;
    margin: 5px;
    padding: 5px;
    border-radius: 5px;">
    <template v-for="tool in tools">
      <component :is="tool.type" :options="tool.options"></component>
      <divider></divider>
    </template>
  </div>
</template>

<script>
  import SnapComponent from './ToolsOfToolSnap.vue';
  import MeasureComponent from './ToolsOfToolMeasure.vue';

  export default {
    name: 'Toolsoftool',
    props: ['tools'],
    components: {
      snap: SnapComponent,
      measure: MeasureComponent
    },
    data: function() {
      return {}
    }
  };
</script>
