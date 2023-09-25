<!-- ORIGINAL SOURCE: -->
<!-- vue/components/tools.html@v3.4 -->
<!-- vue/components/tools.js@v3.4 -->

<template>
  <div
    v-if                = "state.visible"
    @click.prevent.stop = "state.enabled && toggletool()"
    class               = "editbtn"
    :class              = "{
      'enabled' : state.enabled,
      'toggled' : state.active,
    }"
  >
    <img
      height           = "25"
      width            = "25"
      :src             = "resourcesurl + 'images/'+ state.icon"
      v-t-title:plugin = "`${state.name}`"
    />
  </div>
</template>

<script>
  export default {
    name: 'Tool',
    props: ['state' ,'resourcesurl'],
    data() {
      return {}
    },
    methods: {
      toggletool() {
        if (this.state.active) {
          this.$emit('stopactivetool');
        } else {
          this.$emit('setactivetool', this.state.id);
        }
      }
    }
  };
</script>
