<template>
    <div style="display:flex; flex-direction: column">
        <div class="child_header" style="display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #eeeeee" >
            <h4 class="skin-color" style="font-weight: bold">Segnalazioni figlio</h4>
            <span class="action-button-icon" v-t-tooltip:left.create="'Aggiungi nuovo'" style="font-size: 1.4em; cursor: pointer;" @click.stop="openEditTab" :class="g3wtemplate.getFontClass('plus')"></span>
        </div>
        <div class="list_of_child_signaler">
            <div style="display: flex; justify-content: space-between; padding: 3px;">
                <span class="action-button-icon" v-t-tooltip:right.create="'visualizza'" style="font-size: 1.2em; cursor: pointer;" @click.stop="openEditTab" :class="g3wtemplate.getFontClass('signaler')"></span>
                <span>Figlio 1</span>
            </div>
        </div>
    </div>
</template>

<script>
    export default {
        name: 'Childsignalercomponent',
        props: {
            layer: {
                type: Object
            },
            feature: {
                type: Object
            }
        },

        created() {
            console.log(this.layer, this.feature)
        },
        methods: {
            openEditTab(){
                alert(this.feature.id)
            }
        }

    }
</script>

<style scoped>

</style>
