export default  {
  result: false, // is coming from result
  create_new_signaler: false,
  signaler_layer_id: null, // signaler layer id
  geo_layer_id: null, // feature layer id
  vertex_layer_id: null, // vertex layer id
  signaler_field: null, // signaler field
  ab_signal_fields: null, // fields related to signaler to show info in geo feature layer form,
  parent_signaler_field: null, // field of signaler related to eventually parent signaler
  states: null, // states
  roles_editing_acl: null,
  state_field: null,
  every_fields_editing_states: null
};
export const EPSG_COORDINATES = ['EPSG:4326', 'EPSG:3857', 'EPSG:32632', 'EPSG:32633', 'EPSG:32634'];