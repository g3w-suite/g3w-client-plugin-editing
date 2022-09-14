<!-- ORIGINAL SOURCE: -->
<!-- vue/components/tools.html@v3.4 -->
<!-- vue/components/tools.js@v3.4 -->

<template>
  <div @click.stop ="state.enabled ? toggletool(): null" v-if="state.visible" class="editbtn" :class="{'enabled' : state.enabled, 'toggled' : state.active}">
    <img height="25px" width="25px" :alt="state.name" :src="resourcesurl + 'images/'+ state.icon" v-t-title:plugin="state.name"/>
  </div>
</template>

<script>
    export default {
      name: 'Tool',
      props: ['state' ,'resourcesurl'],
      data: function() {
        return {}
      },
      methods: {
        toggletool() {
          if (!this.state.active) this.$emit('setactivetool', this.state.id);
          else this.$emit('stopactivetool');
        }
      }
    };
</script>
