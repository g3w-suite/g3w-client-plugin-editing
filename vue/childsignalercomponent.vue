<template>
    <div class="childrensignaler_content" style="margin-top: 5px; background-color: #FFFFFF; padding: 5px;">
        <div v-if="ancestor.show" style="padding: 5px; color: orange; font-weight: bold; margin-bottom: 5px;">
           <div style="font-weight: bold; font-size: 1.2em;"  v-t-plugin="'signaler_iim.signaler.ancestor_signaler_title'"></div>
            <div style="display: flex; justify-content: space-between; align-items: center; border-style: solid; border-width: 2px 0 0 0; padding-top: 5px">
                <div style="display:flex; flex-direction: column">
                    <div style="font-weight: bold; font-size: 1.1em;" v-t-plugin="`signaler_iim.signaler.signaler_types.${ancestor.info.type}`"></div>
                    <div>
                        <span>ID</span>
                        <span> {{ancestor.info.id}}</span>
                    </div>
                </div>
                <div v-t-tooltip:top.create="'plugins.signaler_iim.signaler.show_father_signaler'">
                    <button class="btn" style="margin-right: 5px; background-color: orange; color: #FFFFFF; font-weight: bold" :class="g3wtemplate.font['signaler']" @click.stop.prevent="showChildFeature({url: ancestor.info.url, id:ancestor.info.id})"></button>
                </div>
            </div>
        </div>
        <bar-loader :loading="loading"></bar-loader>
        <div v-if="loading == false" class="g3w-signale_iim_plugin_children_signaler_data">
            <div v-if="childrendsignaler.length" style="font-weight: bold; font-size: 1.2em;" v-t-plugin="'signaler_iim.signaler.children_signaler_title'"></div>
            <div v-for="childsignaler in childrendsignaler" :key="childsignaler.type" class="skin-border-color" style="padding-top: 5px; border-style: solid; border-width: 2px 0 0 0">
                <div class="childsignaler_header" style="display: flex; justify-content: space-between">
                    <div class="child_title skin-color" style="font-weight: bold; font-size: 1.1em;" v-t-plugin="`signaler_iim.signaler.signaler_types.${childsignaler.type}`"></div>
                </div>
                <template v-if="childsignaler.features.length">
                    <div v-for="child in childsignaler.features" style="display: flex; align-items: baseline; justify-content: space-between; padding: 2px 0 2px 0; border-bottom: 1px solid #eeeeee">
                        <div style="font-weight: bold">{{child.id}}</div>
                        <div  v-t-tooltip:left.create="'plugins.signaler_iim.signaler.show_child_signaler'">
                            <button class="btn skin-button" style="margin-right: 5px;" :class="g3wtemplate.font['signaler']" @click.stop.prevent="showChildFeature({url: childsignaler.url, id:child.id})"></button>
                        </div>
                    </div>
                </template>
                <template v-else>
                    <span style="font-weight: bold" v-t-plugin="'signaler_iim.signaler.no_childred_signaler'"></span>
                </template>
            </div>
        </div>
    </div>
</template>

<script>
    import SIGNALER_IIM_CONFIG from '../global_plugin_data';
    export default {
        name: 'Childrensignaler',
        props: {
          layer: {
              type: Object
          },
          feature: {
              type: Object
          }
        },
        data(){
            const {urls: {signal_type_maps}, relation_signal_types} = SIGNALER_IIM_CONFIG;
            const childrendsignaler = Object.keys(relation_signal_types).map(type => ({
                url: signal_type_maps[type],
                ...relation_signal_types[type],
                features: [],
                type
            }));
            return {
                ancestor: {
                  show: false,
                  info: {
                      type:null,
                      id: null,
                      url: null
                  }
                },
                loading: true,
                childrendsignaler
            }
        },
        methods: {
            loadChildrenData(){
                this.loading = true;
                const promises = [];
                const {signaler_parent_field, urls:{signal_type_maps}} = SIGNALER_IIM_CONFIG;
                const EditingService = require('../services/editingservice');
                const { feature } = EditingService.getCurrentReportData();
                if (feature && feature.get(signaler_parent_field)){
                    this.ancestor.show = true;
                    const [id, type] = feature.get(signaler_parent_field).split(':');
                    this.ancestor.info.type = type;
                    this.ancestor.info.id = id;
                    this.ancestor.info.url = signal_type_maps[type];
                }
                this.childrendsignaler.forEach(({layer_id, features, project_id}, index) =>{
                    this.childrendsignaler[index].features = [];
                    promises.push(EditingService.getChildrenSignaler({
                        project_id,
                        layer_id,
                        signalerFieldValue: this.currentChildSignalerFieldValue
                    }))
                });
                Promise.allSettled(promises).then(responses =>{
                    responses.forEach(({status, value}, index) => {
                        const {result, vector:{data}} = value;
                        if (status === 'fulfilled' && result)
                            data.features.forEach(feature => this.childrendsignaler[index].features.push(feature));
                    })
                }).finally(()=>this.loading = false);
            },
            showChildFeature({url, id}){
                window.open(`${url}?sid=${id}`, '_blank').focus();
            },
        },
        created(){
            this.currentChildSignalerFieldValue = `${this.feature.id}:${SIGNALER_IIM_CONFIG.signal_type}`;
        },
        beforeMount() {
            setTimeout(()=> this.loadChildrenData());
        },
        beforeDestroy() {
            this.currentChildSignalerFieldValue = null;
        }
    };
</script>
