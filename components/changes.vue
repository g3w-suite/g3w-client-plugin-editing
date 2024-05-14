<!--
  @since g3w-client-plugin-editing@v3.8.0
  @file
-->
<template>
  <div>

    <h4
      v-if           = "relation"
      class          = "skin-color g3w-long-text"
      style          = "font-weight: bold; margin: 15px 0"
      v-t-plugin:pre = "'editing.messages.commit.header_relation'"
    >: {{ layer.getName() }}</h4>

    <template
      v-for = "c in Object.keys(commits).filter(c => commits[c].length)"
    >
      <h4 v-t-plugin:pre="`editing.messages.commit.${c}`"> ({{ commits[c].length }}) </h4>
      <divider />
      <ul>
        <li v-for="item in commits[c]">
          <details>
            <summary>{{ getType(item) }} #{{ item.id || item }}</summary>
            <template v-for ="[key, val] in getAttrs(item)">
              <b>{{ key }}</b>:
              <template v-if="isEdited({ item, val })">
                <del>{{ val }}</del> ← <ins>{{ getFeature(item).get(val) }}</ins>
              </template>
              <span v-else>{{ val }}</span>
              <br>
            </template>
          </details>
        </li>
      </ul>
    </template>

    <changes
      v-for     = "([id, commits]) in Object.entries(commits.relations)"
      :commits  = "commits"
      :relation = "true"
      :layer    = "getLayerById(id)"
    />

  </div>

</template>

<script>
export default {

  name: "changes",

  props: {
    commits: {
      type:     Object,
      required: true,
    },
    layer: {
      type:    Object,
      require: true,
    },
    relation: {
      type:    Boolean,
      default: false
    }
  },

  data() {
    return {
      features:  this.layer.readFeatures(),        // original features
      efeatures: this.layer.readEditingFeatures(), // edited features
    };
  },

  methods: {

    /**
     * @returns edited feature (when deleted fallbacks to original feature)
     */
    getFeature(item) {
      const id    = item.id || item;
      const feat  = this.features.find(f => id === f.getId());  // original feature
      const efeat = this.efeatures.find(f => id === f.getId()); // edited feature
      return efeat || feat; 
    },

    /**
     * @returns { string } layer type or empty string when geometry is undefined (alphanumerical layer)
     */
    getType(item) {
      const feat = this.getFeature(item);
      return feat && feat.getGeometry && feat.getGeometry() ? feat.getGeometry().getType() : ''
    },

    /**
     * @returns { boolean } whether feature property has been edited 
     */
    isEdited({ item, key } = {}) {
      const id    = item.id || item;
      const feat  = this.features.find(f => id === f.getId());  // original feature
      const efeat = this.efeatures.find(f => id === f.getId()); // edited feature (NB: undefined when deleted)
      return feat && efeat && efeat.get(key) !== feat.get(key);
    },

    getAttrs(item) {
      const feat = this.getFeature(item);
      return Object.entries(feat ? feat.getProperties() : {}).sort((a, b) => a[0] > b[0])
    },

    getLayerById(id) {
      return g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').service.getLayerById(id);
    },

  },

};
</script>

<style scoped>
  summary {
    display: list-item;
    font-weight: bold;
    padding: 0.5em;
    cursor: pointer;
    background-color: rgb(255, 255, 0, 0.25);
    font-size: medium;
    user-select: none;
  }
  ul {
    list-style: none;
    padding-left: 0;
  }
  ul > li {
    margin-bottom: 8px;
  }
  ins {
    background-color: lime;
    text-decoration-line: none;
  }
  del {
    background-color: tomato;
  }
  b {
    padding-left: 1ch;
  }
</style>