<template>
  <div>
    <h4 v-if = "relation"
      class = "skin-color g3w-long-text"
      style = "font-weight: bold; margin: 15px 0"
      v-t-plugin:pre="'editing.messages.commit.header_relation'">: {{ layer.getName() }}
    </h4>
    <template v-for="c in Object.keys(commits).filter(c => !['relations', 'lockids'].includes(c))">
      <h4 v-t-plugin:pre="`editing.messages.commit.${c}`"> ({{ commits[c].length }}) </h4>
      <divider/>
      <ul style="list-style: none; padding-left: 0;">
        <li v-for="item in commits[c]" style="margin-bottom: 8px;">
          <details>
            <summary> {{ getType(getFeature(item)) }} #{{ item.id || item }}
            </summary>
            <template v-for ="[k,v] in getAttrs(getFeature(item))">
              <b style="padding-left: 1ch;">{{ k }}</b>:
                <template v-if="isEdited({ item, k })">
                  ← <ins style="background-color: lime; text-decoration-line: none;"> {{  getFeature(item).get(k) }}</ins>
                  <del style="background-color: tomato;">{{ v }}</del>
                </template>
              <span v-else>{{ v }}</span>
              <br>
            </template>
          </details>
        </li>
      </ul>
    </template>
    <changes v-for="([id, commits]) in Object.entries(commits.relations)"
     :commits  = "commits"
     :relation = "true"
     :layer    = "service.getLayerById(id)"/>
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
  methods: {
    getFeature(item) {
      const id   = item.id || item;
      //find feature in starting state of editing
      const feat = this.features.find(f => id === f.getId());
      // find feature in the current state of an editing source
      // In the case of deleted existing feature e feat need to get feat
      return this.efeatures.find(f => id === f.getId()) || feat;
    },
    getType(feat) {
      //need to check also if geometry is not undefined (alphanumerical layer feature)
      return feat && feat.getGeometry && feat.getGeometry() ? feat.getGeometry().getType() : ''
    },
    isEdited({ item, k } = {}) {
      const id   = item.id || item;
      //find feature in starting state of editing
      const feat  = this.features.find(f => id === f.getId());
      const efeat = this.efeatures.find(f => id === f.getId());
      //case new feature or delete feature
      if (undefined === feat || undefined === efeat) { return false }
      // find feature in the current state of an editing source
      // In the case of deleted existing feature e feat need to get feat
      return efeat.get(k) !== feat.get(k);
    },
    getAttrs(feat) {
      return Object.entries(feat ? feat.getProperties() : {}).sort((a, b) => a[0] > b[0])
    },
  },
  created() {
    this.service   = g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').service;
    this.features  = this.layer.readFeatures();        // original features
    this.efeatures = this.layer.readEditingFeatures(); // edited features
  }


}
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
</style>