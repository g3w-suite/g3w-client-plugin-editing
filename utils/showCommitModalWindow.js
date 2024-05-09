import { EditingWorkflow }            from '../g3wsdk/workflow/workflow';
import { ConfirmStep }                from '../workflows';
import { getProjectLayerFeatureById } from '../utils/getProjectLayerFeatureById';
import { getEditingLayerById }        from '../utils/getEditingLayerById';

const { Feature }                     = g3wsdk.core.layer.features;
const { GUI }                         = g3wsdk.gui;
const t                               = g3wsdk.core.i18n.tPlugin;

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
 * 
 * @param { Object } opts
 * @param opts.layer
 * @param opts.commitItems
 * @param opts.close
 * @param opts.commitPromise
 *
 * @returns { Promise<unknown> }
 * 
 * @since g3w-client-plugin-editing@v3.8.0
 */
export function showCommitModalWindow({
  layer,
  commitItems,
  close,
  commitPromise,
}) {

  // messages set to commit
  const messages = {
    success: {
      message: "plugins.editing.messages.saved",
      autoclose: true
    },
    error: {}
  };

  return new Promise((resolve, reject) =>{

    /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/commitfeaturesworkflow.js@v3.7.1 */
    const workflow = new EditingWorkflow({
      type: 'commitfeatures',
      steps: [ new ConfirmStep({ type: 'commit' }) ]
    })

    function create_changes_list_dom_element(add, update, del) {
      return `<h4>${t('editing.messages.commit.header')}</h4>`
        + `<h5>${t('editing.messages.commit.header_add')}</h5>`
        + `<h5>${t('editing.messages.commit.header_update_delete')}</h5>`
        + `<ul style='border-bottom-color: #f4f4f4;'>`
        + Object.entries({
          [`${t('editing.messages.commit.add')}`]: add.length,
          [`${t('editing.messages.commit.update')}`]: `[${update.map((item)=> item.id).join(',')}]`,
          [`${t('editing.messages.commit.delete')}`]: `[${del.join(',')}]`,
        }).map(([action, ids]) => `<li>${action} : ${ids} </li>`).join('')
        + `</ul>`;
    }

    workflow.start({
      inputs: {
        layer,
        message: create_changes_list_dom_element(commitItems.add, commitItems.update, commitItems.delete)
        + _.isEmpty(commitItems.relations) ? '' : (
          + "<div style='height:1px; background:#f4f4f4;border-bottom:1px solid #f4f4f4;'></div>"
          + "<div style='margin-left: 40%'><h4>"+ t('editing.relations') +"</h4></div>"
          + Object.entries(commitItems.relations).map(([ relationName, commits]) => "<div><span style='font-weight: bold'>" + relationName + "</span></div>" + create_changes_list_dom_element(commits.add, commits.update, commits.delete)).join('')
        ),
        close
      }
    })
      .then(() => {
        const dialog = GUI.dialog.dialog({
          message: `<h4 class="text-center"><i style="margin-right: 5px;" class=${GUI.getFontClass('spinner')}></i>${t('editing.messages.saving')}</h4>`,
          closeButton: false
        });
        resolve(messages);
        commitPromise.always(() => dialog.modal('hide')) // hide saving dialog
      })
      .fail(async error => {
        const promises = [];
        const rollbackRelations = (relations={}) => {
          Object
            .entries(relations)
            .forEach(([ layerId, {add, delete:del, update, relations = {}}]) => {
              const layer = getEditingLayerById(layerId);
              const sourceLayer = layer.getEditingSource();
              // check if the relation layer has some features
              if (sourceLayer.readFeatures().length > 0) {

                //add a need to remove
                add.forEach(({id}) => {
                  sourceLayer.removeFeature(sourceLayer.getFeatureById(id))
                })

                // //need to get original values
                update.forEach(({ id }) => {
                  promises.push(
                    new Promise((resolve, reject) => {
                      getProjectLayerFeatureById({ layerId, fid: id })
                        .then(f => {
                          const feature = sourceLayer.getFeatureById(id);
                          feature.setProperties(f.properties);
                          feature.setGeometry(f.geometry);
                          resolve();
                        }).catch(reject);
                    })
                  )
                })
              }

              //need to add again.
              del.forEach(id => {
                promises.push(
                  new Promise((resolve, reject) => {
                    getProjectLayerFeatureById({ layerId, fid: id })
                      .then(f => {
                        const feature = new ol.Feature({ geometry: f.geometry })
                        feature.setProperties(f.properties);
                        feature.setId(id);
                        // need to add again to source because it is for relation layer is locked
                        sourceLayer.addFeature(new Feature({ feature }));
                        resolve();
                      }).catch(reject);
                  })
                )
              })
              rollbackRelations(relations);
            })
        }
        rollbackRelations(commitItems.relations);
        await Promise.allSettled(promises);
        reject(error)
      })
      .always(() => workflow.stop())
  })
}