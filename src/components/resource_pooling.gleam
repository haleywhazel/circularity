import formal/form.{type Form}
import gleam/dynamic
import gleam/int
import gleam/list
import keyboard_shortcuts.{
  Key, KeyDown, Modifier, PreventDefault, Shortcut, install_keyboard_shortcuts,
}
import lustre
import lustre/attribute.{attribute, class, id, type_}
import lustre/effect.{type Effect}
import lustre/element.{type Element, text}
import lustre/element/html
import lustre/element/svg
import lustre/event

import gleam/dict.{type Dict}
import gleam/dynamic/decode
import gleam/io
import gleam/json
import gleam/result
import gleam/string

fn inspect(thing) {
  string.inspect(thing)
  |> io.println()
}

// Main
pub fn register() -> Result(Nil, lustre.Error) {
  let component = lustre.application(init, update, view)
  lustre.register(component, "resource-pooling")
}

pub fn element() -> Element(message) {
  element.element("resource-pooling", [], [])
}

// Model
type Model {
  Model(
    materials: List(Material),
    entities: List(Entity),
    flows: List(Flow),
    form: Form(FormData),
    current_form: FormType,
    next_material_id: Int,
    next_entity_id: Int,
    next_flow_id: Int,
    selected_material_ids: List(String),
    value_activities: List(String),
    actions: List(Action),
  )
}

fn init(_) -> #(Model, Effect(Message)) {
  let init_effect =
    effect.from(fn(dispatch) {
      init_resource_pooling()

      let dispatch_wrapper = fn(message: String) {
        case message {
          "entity_id:" <> entity_id -> dispatch(StartEntityForm(entity_id))
          "import:" <> json_data -> dispatch(ImportModel(json_data))
          "flow_id:" <> flow_id -> dispatch(StartFlowForm(flow_id))
          _ -> Nil
        }
      }

      js_dispatch(dispatch_wrapper)
      setup_file_import(dispatch_wrapper)

      dispatch
      |> install_keyboard_shortcuts(KeyDown, [
        Shortcut([Key("Escape")], ResetForm, [PreventDefault]),
        Shortcut([Modifier, Key("z")], Undo, [PreventDefault]),
      ])
    })
  #(
    Model(
      materials: [],
      entities: [],
      flows: [],
      form: empty_form(),
      current_form: NoForm,
      next_material_id: 1,
      next_entity_id: 1,
      next_flow_id: 1,
      selected_material_ids: [],
      value_activities: [],
      actions: [],
    ),
    init_effect,
  )
}

fn model_decoder() {
  use materials <- decode.field("materials", decode.list(material_decoder()))
  use entities <- decode.field("entities", decode.list(entity_decoder()))
  use flows <- decode.field("flows", decode.list(flow_decoder()))
  use next_material_id <- decode.field("next_material_id", decode.int)
  use next_entity_id <- decode.field("next_entity_id", decode.int)
  use next_flow_id <- decode.field("next_flow_id", decode.int)
  decode.success(
    Model(
      materials: materials,
      entities: entities,
      flows: flows,
      form: empty_form(),
      current_form: NoForm,
      next_material_id: next_material_id,
      next_entity_id: next_entity_id,
      next_flow_id: next_flow_id,
      selected_material_ids: [],
      value_activities: [],
      actions: [],
    ),
  )
}

// Update
type Message {
  StartEntityForm(entity_id: String)
  StartMaterialsForm
  StartFlowForm(flow_id: String)
  FlowFormSubmit(Result(FormData, Form(FormData)))
  DeleteMaterial(material_id: String)
  NewMaterialSubmit(Result(FormData, Form(FormData)))
  EditMaterial(name: String, material_id: String)
  EntityFormSubmit(Result(FormData, Form(FormData)))
  SelectMaterial(material_id: String)
  RemoveSelectedMaterial(material_id: String)
  NewValueActivity(List(#(String, String)))
  EditValueActivity(activity: String, activity_id: Int)
  DeleteValueActivity(activity: String)
  DeleteEntity(entity_id: String)
  ToggleFlowType(flow_type: String)
  ToggleFutureState(flow_type: String)
  DeleteFlow(flow_id: String)
  DownloadModel
  ImportModel(json_data: String)
  Undo
  ResetForm
  ExportMap
  ClearMap
}

fn update(model: Model, message: Message) -> #(Model, Effect(Message)) {
  inspect(message)
  case message {
    StartEntityForm("") -> #(
      Model(
        ..model,
        form: new_entity_form(),
        current_form: NewEntityForm,
        selected_material_ids: [],
        value_activities: [],
      ),
      effect.none(),
    )
    StartEntityForm(entity_id) -> {
      let entity =
        model
        |> get_entity_by_id(entity_id)
        |> result.unwrap(Entity("default", "", [], [], ""))

      case entity.entity_id {
        "default" -> #(model, effect.none())
        _ -> {
          #(
            Model(
              ..model,
              form: edit_entity_form(entity),
              current_form: EditEntityForm(entity.entity_id),
              selected_material_ids: entity.materials,
              value_activities: entity.value_activities,
            ),
            effect.none(),
          )
        }
      }
    }
    StartMaterialsForm -> #(
      Model(..model, form: new_material_form(), current_form: MaterialsForm),
      effect.none(),
    )
    StartFlowForm("") -> #(
      Model(
        ..model,
        form: new_flow_form(model),
        current_form: NewFlowForm,
        selected_material_ids: [],
        value_activities: [],
      ),
      effect.none(),
    )
    StartFlowForm(flow_id) -> {
      let flow =
        model
        |> get_flow_by_id(flow_id)
        |> result.unwrap(Flow("default", #("", ""), []))

      case flow.flow_id {
        "default" -> #(model, effect.none())
        _ -> {
          #(
            Model(
              ..model,
              form: edit_flow_form(flow, model),
              current_form: EditFlowForm(flow.flow_id),
            ),
            effect.none(),
          )
        }
      }
    }
    DeleteMaterial(material_id) -> {
      let updated_materials =
        list.filter(model.materials, fn(material) {
          material.material_id != material_id
        })
      #(Model(..model, materials: updated_materials), effect.none())
    }
    NewMaterialSubmit(Ok(MaterialsFormData(name))) -> {
      #(
        Model(
          ..model,
          materials: [
              Material(
                name: name,
                material_id: "material-id-"
                  <> int.to_string(model.next_material_id),
              ),
              ..model.materials
            ]
            |> list.unique(),
          next_material_id: model.next_material_id + 1,
          selected_material_ids: [],
          value_activities: [],
        ),
        effect.none(),
      )
    }
    NewMaterialSubmit(Error(form)) -> {
      let updated_model = Model(..model, form: form)
      #(updated_model, effect.none())
    }
    EditMaterial(name, material_id) -> {
      let updated_materials =
        list.map(model.materials, fn(material) {
          case material.material_id == material_id {
            True -> Material(..material, name: name)
            False -> material
          }
        })
      update_material(name, material_id)
      #(Model(..model, materials: updated_materials), effect.none())
    }
    SelectMaterial(material_id) -> {
      let updated_selected_material_ids =
        [material_id, ..model.selected_material_ids]
        |> list.sort(by: string.compare)
        |> list.unique()
      #(
        Model(..model, selected_material_ids: updated_selected_material_ids),
        effect.none(),
      )
    }
    RemoveSelectedMaterial(material_id) -> {
      let updated_selected_material_ids =
        list.filter(model.selected_material_ids, fn(m_id) {
          m_id != material_id
        })
      #(
        Model(..model, selected_material_ids: updated_selected_material_ids),
        effect.none(),
      )
    }
    EntityFormSubmit(Ok(EntityFormData(name, entity_type))) -> {
      case model.current_form {
        NewEntityForm -> {
          let new_entity =
            Entity(
              name: name,
              entity_id: "entity-id-" <> int.to_string(model.next_entity_id),
              materials: model.selected_material_ids,
              value_activities: model.value_activities,
              entity_type: entity_type,
            )
          create_entity(new_entity, model.materials)
          #(
            Model(
              ..model,
              entities: [new_entity, ..model.entities],
              form: empty_form(),
              current_form: NoForm,
              next_entity_id: model.next_entity_id + 1,
              selected_material_ids: [],
              value_activities: [],
              actions: [NewEntity(new_entity), ..model.actions],
            ),
            effect.none(),
          )
        }
        EditEntityForm(entity_id) -> {
          case update_existing_entity(model, entity_id, name, entity_type) {
            Ok(#(entity, updated_model)) -> {
              edit_entity(entity, model.materials)
              #(reset_form(updated_model), effect.none())
            }
            Error(_) -> #(model, effect.none())
          }
        }
        _ -> #(model, effect.none())
      }
    }
    EntityFormSubmit(Error(form)) -> {
      let updated_model = Model(..model, form: form)
      #(updated_model, effect.none())
    }
    NewValueActivity([#(_, ""), ..]) -> {
      #(model, effect.none())
    }
    NewValueActivity([#(_, new_value_activity), ..]) -> {
      #(
        Model(
          ..model,
          value_activities: list.unique([
            new_value_activity,
            ..model.value_activities
          ]),
        ),
        effect.none(),
      )
    }
    EditValueActivity(activity, id) -> {
      #(
        Model(
          ..model,
          value_activities: model.value_activities
            |> list.index_map(fn(act, i) {
              case i == id {
                True -> activity
                False -> act
              }
            }),
        ),
        effect.none(),
      )
    }
    DeleteValueActivity(activity) -> {
      #(
        Model(
          ..model,
          value_activities: list.filter(model.value_activities, fn(act) {
            act != activity
          }),
        ),
        effect.none(),
      )
    }
    DeleteEntity(entity_id) -> {
      case get_entity_by_id(model, entity_id) {
        Ok(entity) -> {
          let position = get_entity_position(entity_id)

          let updated_entities =
            list.filter(model.entities, fn(entity) {
              entity.entity_id != entity_id
            })

          let connected_flows =
            list.filter(model.flows, fn(flow) {
              flow.entity_ids.0 == entity_id || flow.entity_ids.1 == entity_id
            })

          let updated_flows =
            list.filter(model.flows, fn(flow) {
              flow.entity_ids.0 != entity_id && flow.entity_ids.1 != entity_id
            })

          let updated_model =
            Model(
              ..model,
              entities: updated_entities,
              flows: updated_flows,
              actions: [
                RemoveEntity(entity, connected_flows, position),
                ..model.actions
              ],
            )
            |> reset_form()

          delete_entity(entity.entity_id)

          list.each(connected_flows, fn(flow) { delete_flow(flow.flow_id) })

          #(updated_model, effect.none())
        }
        Error(_) -> {
          #(model, effect.none())
        }
      }
    }
    ToggleFlowType(flow_type) -> {
      let all_flow_types = ["material", "financial", "information"]
      let flow_field = flow_type <> "-flow"
      let is_currently_checked =
        form.field_value(model.form, flow_field) == "on"

      let new_form = new_flow_form(model)

      let base_values = [
        #("entity-id-1", form.field_value(model.form, "entity-id-1")),
        #("entity-id-2", form.field_value(model.form, "entity-id-2")),
      ]

      let flow_values =
        list.flat_map(all_flow_types, fn(t) {
          let flow_field_name = t <> "-flow"
          let direction_field = t <> "-direction"
          let future_field_name = t <> "-future"
          let future_value = form.field_value(model.form, future_field_name)

          let flow_checkbox_value = case t == flow_type {
            True ->
              case is_currently_checked {
                True -> []
                False -> [#(flow_field_name, "on")]
              }
            False ->
              case form.field_value(model.form, flow_field_name) {
                "on" -> [#(flow_field_name, "on")]
                _ -> []
              }
          }

          let direction_values = [
            #(direction_field, form.field_value(model.form, direction_field)),
          ]

          let future_values = case future_value {
            "on" -> [#(future_field_name, "on")]
            _ -> []
          }

          list.flatten([flow_checkbox_value, direction_values, future_values])
        })

      let all_values = list.append(base_values, flow_values)

      #(
        Model(..model, form: new_form |> form.set_values(all_values)),
        effect.none(),
      )
    }
    ToggleFutureState(flow_type) -> {
      let all_flow_types = ["material", "financial", "information"]
      let future_field = flow_type <> "-future"
      let is_currently_checked =
        form.field_value(model.form, future_field) == "on"

      // Create new form and set all values explicitly
      let new_form = new_flow_form(model)

      // Build list of values to set, excluding unchecked future states
      let base_values = [
        #("entity-id-1", form.field_value(model.form, "entity-id-1")),
        #("entity-id-2", form.field_value(model.form, "entity-id-2")),
      ]

      let flow_values =
        list.flat_map(all_flow_types, fn(t) {
          let flow_field = t <> "-flow"
          let direction_field = t <> "-direction"
          let future_field_name = t <> "-future"
          let future_value = form.field_value(model.form, future_field_name)

          let base_flow_values = [
            #(flow_field, form.field_value(model.form, flow_field)),
            #(direction_field, form.field_value(model.form, direction_field)),
          ]

          // Only add future value if it should be checked
          let future_values = case t == flow_type {
            True ->
              // This is the one being toggled
              case is_currently_checked {
                True -> []
                // Was checked, now unchecking - don't set value
                False -> [#(future_field_name, "on")]
                // Was unchecked, now checking
              }
            False ->
              // Other flow types - preserve their current state if checked
              case future_value {
                "on" -> [#(future_field_name, "on")]
                _ -> []
              }
          }

          list.append(base_flow_values, future_values)
        })

      let all_values = list.append(base_values, flow_values)

      #(
        Model(..model, form: new_form |> form.set_values(all_values)),
        effect.none(),
      )
    }
    FlowFormSubmit(Ok(FlowFormData(
      entity_id_1,
      entity_id_2,
      material_flow,
      material_direction,
      material_future,
      financial_flow,
      financial_direction,
      financial_future,
      information_flow,
      information_direction,
      information_future,
    ))) -> {
      case model.current_form {
        NewFlowForm -> {
          let new_flow =
            Flow(
              flow_id: "flow-id-" <> int.to_string(model.next_flow_id),
              entity_ids: #(entity_id_1, entity_id_2),
              flow_types: list.filter(
                [
                  #(
                    material_flow,
                    material_direction,
                    material_future,
                    "Material",
                  ),
                  #(
                    financial_flow,
                    financial_direction,
                    financial_future,
                    "Financial",
                  ),
                  #(
                    information_flow,
                    information_direction,
                    information_future,
                    "Information",
                  ),
                ],
                fn(t) { t.0 == "on" },
              )
                |> list.map(fn(t) {
                  FlowType(flow_category: t.3, direction: t.1, is_future: t.2)
                }),
            )
          create_flow(new_flow)
          #(
            Model(
              ..model,
              flows: [new_flow, ..model.flows],
              form: empty_form(),
              current_form: NoForm,
              next_flow_id: model.next_flow_id + 1,
              selected_material_ids: [],
              value_activities: [],
              actions: [NewFlow(new_flow), ..model.actions],
            ),
            effect.none(),
          )
        }
        EditFlowForm(flow_id) -> {
          case
            update_existing_flow(
              model,
              flow_id,
              entity_id_1,
              entity_id_2,
              material_flow,
              material_direction,
              material_future,
              financial_flow,
              financial_direction,
              financial_future,
              information_flow,
              information_direction,
              information_future,
            )
          {
            Ok(#(flow, updated_model)) -> {
              edit_flow(flow)
              #(reset_form(updated_model), effect.none())
            }
            Error(_) -> #(model, effect.none())
          }
        }
        _ -> #(model, effect.none())
      }
    }
    FlowFormSubmit(Error(form)) -> {
      let updated_model = Model(..model, form: form)
      #(updated_model, effect.none())
    }
    DeleteFlow(flow_id) -> {
      case get_flow_by_id(model, flow_id) {
        Ok(flow) -> {
          let updated_flows =
            list.filter(model.flows, fn(f) { flow.flow_id != f.flow_id })

          let updated_model =
            Model(..model, flows: updated_flows, actions: [
              RemoveFlow(flow),
              ..model.actions
            ])
            |> reset_form()

          delete_flow(flow.flow_id)

          #(updated_model, effect.none())
        }
        Error(_) -> {
          #(model, effect.none())
        }
      }
    }
    DownloadModel -> {
      let model_data = serialise_model(model)
      download_model_data(model_data)
      #(model, effect.none())
    }
    ImportModel(json_data) -> {
      case deserialise_model(json_data) {
        Ok(imported_model) -> {
          let recreation_effect =
            effect.from(fn(_dispatch) {
              restore_d3_state(
                imported_model.entities,
                imported_model.materials,
                imported_model.flows,
              )
            })
          #(imported_model, recreation_effect)
        }
        Error(_) -> #(model, effect.none())
      }
    }
    Undo -> {
      case model.actions {
        [NewEntity(entity), ..rest_actions] -> {
          let updated_entities =
            list.filter(model.entities, fn(e) {
              e.entity_id != entity.entity_id
            })
          let updated_model =
            Model(..model, entities: updated_entities, actions: rest_actions)
            |> reset_form()

          delete_entity(entity.entity_id)
          #(updated_model, effect.none())
        }
        [EditEntity(original, _), ..rest_actions] -> {
          let updated_entities =
            list.map(model.entities, fn(entity) {
              case entity.entity_id == original.entity_id {
                True -> original
                False -> entity
              }
            })
          let updated_model =
            Model(..model, entities: updated_entities, actions: rest_actions)
            |> reset_form()

          edit_entity(original, model.materials)
          #(updated_model, effect.none())
        }
        [RemoveEntity(entity, deleted_flows, position), ..rest_actions] -> {
          let updated_model =
            Model(
              ..model,
              entities: [entity, ..model.entities],
              flows: list.append(deleted_flows, model.flows),
              actions: rest_actions,
            )
            |> reset_form()

          case position {
            Ok(pos) ->
              create_entity_at_position(entity, model.materials, pos.x, pos.y)
            Error(_) -> create_entity(entity, model.materials)
          }

          list.each(deleted_flows, fn(flow) { create_flow(flow) })

          #(updated_model, effect.none())
        }
        [NewFlow(flow), ..rest_actions] -> {
          let updated_flows =
            list.filter(model.flows, fn(f) { f.flow_id != flow.flow_id })
          let updated_model =
            Model(..model, flows: updated_flows, actions: rest_actions)
            |> reset_form()

          delete_flow(flow.flow_id)
          #(updated_model, effect.none())
        }
        [EditFlow(original, _), ..rest_actions] -> {
          let updated_flows =
            list.map(model.flows, fn(f) {
              case f.flow_id == original.flow_id {
                True -> original
                False -> f
              }
            })
          let updated_model =
            Model(..model, flows: updated_flows, actions: rest_actions)
            |> reset_form()

          edit_flow(original)
          #(updated_model, effect.none())
        }
        [RemoveFlow(flow), ..rest_actions] -> {
          let updated_model =
            Model(..model, flows: [flow, ..model.flows], actions: rest_actions)
            |> reset_form()

          create_flow(flow)
          #(updated_model, effect.none())
        }
        [ResetMap(previous_model, positions), ..] -> {
          let recreation_effect =
            effect.from(fn(_dispatch) {
              restore_d3_state(
                previous_model.entities,
                previous_model.materials,
                previous_model.flows,
              )

              list.each(positions, fn(pair) {
                let #(entity_id, position_result) = pair
                case position_result {
                  Ok(pos) -> set_entity_position(entity_id, pos.x, pos.y)
                  Error(_) -> Nil
                }
              })

              centre_view_on_nodes()
            })
          #(previous_model, recreation_effect)
        }
        [] -> #(model, effect.none())
      }
    }
    ResetForm -> {
      let updated_model = reset_form(model)
      #(updated_model, effect.none())
    }
    ExportMap -> {
      export_map_as_png()
      #(model, effect.none())
    }
    ClearMap -> {
      let entity_positions =
        list.map(model.entities, fn(entity) {
          let position = get_entity_position(entity.entity_id)
          #(entity.entity_id, position)
        })

      let empty_model =
        Model(
          materials: [],
          entities: [],
          flows: [],
          form: empty_form(),
          current_form: NoForm,
          next_material_id: 1,
          next_entity_id: 1,
          next_flow_id: 1,
          selected_material_ids: [],
          value_activities: [],
          actions: [ResetMap(model, entity_positions), ..model.actions],
        )

      let recreation_effect =
        effect.from(fn(_dispatch) { restore_d3_state([], [], []) })

      #(empty_model, recreation_effect)
    }
    _ -> #(model, effect.none())
  }
}

// View
fn view(model: Model) -> Element(Message) {
  html.div([class("flex flex-1")], [
    html.div([class("flex-col w-2/3 p-4")], [
      html.h1([class("text-4xl font-extrabold mb-6")], [
        text("Resource Pooling"),
      ]),
      html.div(
        [
          class("flex-1 border-2 border-solid border-gray-900 rounded-lg p-1"),
          id("resource-pooling"),
        ],
        [],
      ),
    ]),
    html.div([class("flex-col w-1/3 p-4")], [render_controls(model)]),
  ])
}

// Controls rendering
fn render_controls(model: Model) -> Element(Message) {
  html.div(
    [
      class(
        "flex-1 bg-gray-700 text-gray-200 p-4 rounded-lg transition-all duration-300 ease-in-out",
      ),
    ],
    [
      html.div([class("text-sm mb-2")], [
        text(
          "Hover over buttons for their descriptions. Selecting entities and flows on the diagram allows you to edit or delete them. Zoom and pan on the diagram to modify the view extent. Entities can be moved around and rearranged by dragging.",
        ),
      ]),
      render_import_export_buttons(model),
      html.button(
        [
          class(
            "bg-blue-600 hover:bg-blue-400 px-3 py-2 rounded-sm cursor-pointer",
          ),
          attribute.title("Add Entity"),
          event.on_click(StartEntityForm("")),
        ],
        [
          svg.svg(
            [
              attribute("stroke-width", "1.5"),
              attribute("stroke", "currentColor"),
              attribute("fill", "none"),
              class("size-6"),
            ],
            [
              svg.path([
                attribute("stroke-linecap", "round"),
                attribute("stroke-linejoin", "round"),
                attribute("d", "M12 4.5v15m7.5-7.5h-15"),
              ]),
            ],
          ),
        ],
      ),
      html.button(
        [
          class(
            "bg-green-600 hover:bg-green-400 px-3 py-2 rounded-sm cursor-pointer ml-2",
          ),
          attribute.title("Add Flow"),
          event.on_click(StartFlowForm("")),
        ],
        [
          svg.svg(
            [
              attribute("stroke-width", "1.5"),
              attribute("stroke", "currentColor"),
              attribute("fill", "none"),
              class("size-6"),
            ],
            [
              svg.path([
                attribute("stroke-linecap", "round"),
                attribute("stroke-linejoin", "round"),
                attribute(
                  "d",
                  "M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5",
                ),
              ]),
            ],
          ),
        ],
      ),
      // html.button(
      //   [
      //     class(
      //       "bg-green-600 hover:bg-green-400 px-3 py-2 rounded-sm cursor-pointer ml-2",
      //     ),
      //     attribute.title("Manage Materials"),
      //     event.on_click(StartMaterialsForm),
      //   ],
      //   [
      //     svg.svg(
      //       [
      //         attribute("stroke-width", "1.5"),
      //         attribute("stroke", "currentColor"),
      //         attribute("fill", "none"),
      //         class("size-6"),
      //       ],
      //       [
      //         svg.path([
      //           attribute("stroke-linecap", "round"),
      //           attribute("stroke-linejoin", "round"),
      //           attribute(
      //             "d",
      //             "M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z M6 6h.008v.008H6V6Z",
      //           ),
      //         ]),
      //       ],
      //     ),
      //   ],
      // ),
      html.button(
        [
          class(
            "bg-red-600 hover:bg-red-400 px-3 py-2 rounded-sm cursor-pointer ml-2",
          ),
          attribute.title("Clear Diagram"),
          event.on_click(ClearMap),
        ],
        [
          svg.svg(
            [
              attribute("stroke-width", "1.5"),
              attribute("stroke", "currentColor"),
              attribute("fill", "none"),
              class("size-6"),
            ],
            [
              svg.path([
                attribute("stroke-linecap", "round"),
                attribute("stroke-linejoin", "round"),
                attribute("d", "M6 18 18 6M6 6l12 12"),
              ]),
            ],
          ),
        ],
      ),
      html.div(
        [
          class("transition-all duration-300 ease-in-out"),
          case model.current_form {
            NoForm -> class("max-h-0 opacity-0")
            _ -> class("max-h-256 opacity-100")
          },
        ],
        [render_form(model)],
      ),
      render_delete_button(model.current_form),
    ],
  )
}

// Entity helpers
type Entity {
  Entity(
    name: String,
    entity_id: String,
    value_activities: List(String),
    materials: List(String),
    entity_type: String,
  )
}

fn entity_types() {
  ["Consumer", "Producer", "Scavenger", "Decomposer"]
}

fn get_entity_by_id(model: Model, entity_id: String) -> Result(Entity, Nil) {
  list.find(model.entities, fn(entity) { entity.entity_id == entity_id })
}

fn update_existing_entity(
  model: Model,
  entity_id: String,
  name: String,
  entity_type: String,
) -> Result(#(Entity, Model), Nil) {
  use original_entity <- result.try(get_entity_by_id(model, entity_id))

  let updated_entity =
    Entity(
      ..original_entity,
      name: name,
      entity_type: entity_type,
      materials: model.selected_material_ids,
      value_activities: model.value_activities,
    )

  let updated_entities =
    list.map(model.entities, fn(entity) {
      case entity.entity_id == entity_id {
        True -> updated_entity
        False -> entity
      }
    })

  let updated_model =
    Model(..model, entities: updated_entities, actions: [
      EditEntity(original_entity, updated_entity),
      ..model.actions
    ])

  Ok(#(updated_entity, updated_model))
}

fn entity_decoder() {
  use name <- decode.field("name", decode.string)
  use entity_id <- decode.field("entity_id", decode.string)
  use value_activities <- decode.field(
    "value_activities",
    decode.list(decode.string),
  )
  use materials <- decode.field("materials", decode.list(decode.string))
  use entity_type <- decode.field("entity_type", decode.string)
  decode.success(Entity(
    name: name,
    entity_id: entity_id,
    value_activities: value_activities,
    materials: materials,
    entity_type: entity_type,
  ))
}

type EntityPosition {
  EntityPosition(x: Float, y: Float)
}

fn get_entity_position(entity_id: String) {
  let position = get_entity_position_raw(entity_id)

  let decoder = {
    use x <- decode.field("x", decode.float)
    use y <- decode.field("y", decode.float)
    decode.success(EntityPosition(x, y))
  }

  decode.run(position, decoder)
}

// Material helpers
type Material {
  Material(name: String, material_id: String)
}

fn get_materials_by_ids(
  model: Model,
  material_ids: List(String),
) -> List(Material) {
  list.filter_map(material_ids, fn(id) {
    list.find(model.materials, fn(material) { material.material_id == id })
  })
}

fn material_decoder() {
  use name <- decode.field("name", decode.string)
  use material_id <- decode.field("material_id", decode.string)
  decode.success(Material(name: name, material_id: material_id))
}

// Flow helpers
type Flow {
  Flow(
    flow_id: String,
    entity_ids: #(String, String),
    flow_types: List(FlowType),
  )
}

fn get_flow_by_id(model: Model, flow_id: String) -> Result(Flow, Nil) {
  list.find(model.flows, fn(flow) { flow.flow_id == flow_id })
}

fn update_existing_flow(
  model: Model,
  flow_id: String,
  entity_id_1: String,
  entity_id_2: String,
  material_flow: String,
  material_direction: Int,
  material_future: Bool,
  financial_flow: String,
  financial_direction: Int,
  financial_future: Bool,
  information_flow: String,
  information_direction: Int,
  information_future: Bool,
) -> Result(#(Flow, Model), Nil) {
  use original_flow <- result.try(get_flow_by_id(model, flow_id))

  let updated_flow =
    Flow(
      ..original_flow,
      entity_ids: #(entity_id_1, entity_id_2),
      flow_types: list.filter(
          [
            #(material_flow, material_direction, material_future, "Material"),
            #(
              financial_flow,
              financial_direction,
              financial_future,
              "Financial",
            ),
            #(
              information_flow,
              information_direction,
              information_future,
              "Information",
            ),
          ],
          fn(t) { t.0 == "on" },
        )
        |> list.map(fn(t) {
          FlowType(flow_category: t.3, direction: t.1, is_future: t.2)
        }),
    )

  let updated_flows =
    list.map(model.flows, fn(flow) {
      case flow.flow_id == flow_id {
        True -> updated_flow
        False -> flow
      }
    })

  let updated_model =
    Model(..model, flows: updated_flows, actions: [
      EditFlow(original_flow, updated_flow),
      ..model.actions
    ])

  Ok(#(updated_flow, updated_model))
}

fn flow_decoder() {
  use flow_id <- decode.field("flow_id", decode.string)
  use entity_ids_list <- decode.field("entity_ids", decode.list(decode.string))
  use flow_types <- decode.field("flow_types", decode.list(flow_type_decoder()))

  // Convert list to tuple
  case entity_ids_list {
    [first, second] ->
      decode.success(Flow(
        flow_id: flow_id,
        entity_ids: #(first, second),
        flow_types: flow_types,
      ))
    _ ->
      decode.failure(
        Flow("", #("", ""), []),
        "entity_ids must be an array of exactly 2 strings",
      )
  }
}

type FlowType {
  FlowType(
    // "material", "financial", "information"
    flow_category: String,
    // 0: bidirectional, 1: from entity 1 to entity 2, -1: from entity 2 to entity 1
    direction: Int,
    is_future: Bool,
  )
}

fn flow_type_decoder() {
  use flow_category <- decode.field("flow_category", decode.string)
  use direction <- decode.field("direction", decode.int)
  use is_future <- decode.field("is_future", decode.bool)
  decode.success(FlowType(
    flow_category: flow_category,
    direction: direction,
    is_future: is_future,
  ))
}

// Form helpers
type FormType {
  NewEntityForm
  EditEntityForm(entity_id: String)
  MaterialsForm
  NewFlowForm
  EditFlowForm(flow_id: String)
  NoForm
}

type FormData {
  MaterialsFormData(name: String)
  EntityFormData(name: String, entity_type: String)
  FlowFormData(
    entity_id_1: String,
    entity_id_2: String,
    material_flow: String,
    material_direction: Int,
    material_future: Bool,
    financial_flow: String,
    financial_direction: Int,
    financial_future: Bool,
    information_flow: String,
    information_direction: Int,
    information_future: Bool,
  )
  EmptyForm
}

fn new_material_form() {
  form.new({
    use name <- form.field(
      "new-material",
      form.parse_string |> form.check_not_empty,
    )
    form.success(MaterialsFormData(name: name))
  })
}

fn new_entity_form() {
  let check_valid_entity_type = fn(entity_type) {
    case list.contains(["", ..entity_types()], entity_type) {
      True -> Ok(entity_type)
      False -> Error("invalid entity type")
    }
  }

  form.new({
    use name <- form.field("name", form.parse_string |> form.check_not_empty)
    use entity_type <- form.field(
      "entity-type",
      form.parse_string
        |> form.check(check_valid_entity_type),
    )
    form.success(EntityFormData(name: name, entity_type: entity_type))
  })
}

fn new_flow_form(model: Model) {
  let validate_direction = fn(direction) {
    case direction {
      -1 | 0 | 1 -> Ok(direction)
      _ -> Error("invalid direction")
    }
  }

  form.new({
    use entity_id_1 <- form.field(
      "entity-id-1",
      form.parse_string |> form.check_not_empty,
    )

    let validate_not_entity_id_1 = fn(entity_id_2) {
      case entity_id_2 == entity_id_1 {
        False -> Ok(entity_id_2)
        True -> Error("entities must be separate")
      }
    }

    let validate_combination_does_not_exist = fn(entity_id_2) {
      case
        model.current_form,
        list.filter(model.flows, fn(flow) {
          flow.entity_ids == #(entity_id_1, entity_id_2)
          || flow.entity_ids == #(entity_id_2, entity_id_1)
        })
        |> list.length()
      {
        EditFlowForm(_), _ -> Ok(entity_id_2)
        _, 0 -> Ok(entity_id_2)
        _, _ -> Error("entity combination exists")
      }
    }

    use entity_id_2 <- form.field(
      "entity-id-2",
      form.parse_string
        |> form.check_not_empty
        |> form.check(validate_not_entity_id_1)
        |> form.check(validate_combination_does_not_exist),
    )

    use material_direction <- form.field(
      "material-direction",
      form.parse_int |> form.check(validate_direction),
    )
    use material_future <- form.field("material-future", form.parse_checkbox)

    use financial_flow <- form.field("financial-flow", form.parse_string)
    use financial_direction <- form.field(
      "financial-direction",
      form.parse_int |> form.check(validate_direction),
    )
    use financial_future <- form.field("financial-future", form.parse_checkbox)

    use information_flow <- form.field("information-flow", form.parse_string)
    use information_direction <- form.field(
      "information-direction",
      form.parse_int |> form.check(validate_direction),
    )
    use information_future <- form.field(
      "information-future",
      form.parse_checkbox,
    )

    let validate_one_flow_exists = fn(material_flow) {
      case
        list.contains([material_flow, financial_flow, information_flow], "on")
      {
        True -> Ok(material_flow)
        False -> Error("select at least one flow")
      }
    }

    // out of order here to display error at the first checkbox (material)
    use material_flow <- form.field(
      "material-flow",
      form.parse_string |> form.check(validate_one_flow_exists),
    )

    form.success(FlowFormData(
      entity_id_1: entity_id_1,
      entity_id_2: entity_id_2,
      material_flow: material_flow,
      material_direction: material_direction,
      material_future: material_future,
      financial_flow: financial_flow,
      financial_direction: financial_direction,
      financial_future: financial_future,
      information_flow: information_flow,
      information_direction: information_direction,
      information_future: information_future,
    ))
  })
}

fn edit_entity_form(entity: Entity) -> Form(FormData) {
  new_entity_form()
  |> form.set_values([
    #("name", entity.name),
    #("entity-type", entity.entity_type),
  ])
}

fn edit_flow_form(flow: Flow, model: Model) -> Form(FormData) {
  let model = Model(..model, current_form: EditFlowForm(flow.flow_id))

  let material_flow = case
    list.find(flow.flow_types, fn(ft) { ft.flow_category == "Material" })
  {
    Ok(_) -> "on"
    Error(_) -> ""
  }

  let financial_flow = case
    list.find(flow.flow_types, fn(ft) { ft.flow_category == "Financial" })
  {
    Ok(_) -> "on"
    Error(_) -> ""
  }

  let information_flow = case
    list.find(flow.flow_types, fn(ft) { ft.flow_category == "Information" })
  {
    Ok(_) -> "on"
    Error(_) -> ""
  }

  let material_direction = case
    list.find(flow.flow_types, fn(ft) { ft.flow_category == "Material" })
  {
    Ok(ft) -> int.to_string(ft.direction)
    Error(_) -> "1"
  }

  let material_future = case
    list.find(flow.flow_types, fn(ft) { ft.flow_category == "Material" })
  {
    Ok(ft) ->
      case ft.is_future {
        True -> "on"
        False -> ""
      }
    Error(_) -> ""
  }

  let financial_direction = case
    list.find(flow.flow_types, fn(ft) { ft.flow_category == "Financial" })
  {
    Ok(ft) -> int.to_string(ft.direction)
    Error(_) -> "1"
  }

  let financial_future = case
    list.find(flow.flow_types, fn(ft) { ft.flow_category == "Financial" })
  {
    Ok(ft) ->
      case ft.is_future {
        True -> "on"
        False -> ""
      }
    Error(_) -> ""
  }

  let information_direction = case
    list.find(flow.flow_types, fn(ft) { ft.flow_category == "Information" })
  {
    Ok(ft) -> int.to_string(ft.direction)
    Error(_) -> "1"
  }

  let information_future = case
    list.find(flow.flow_types, fn(ft) { ft.flow_category == "Information" })
  {
    Ok(ft) ->
      case ft.is_future {
        True -> "on"
        False -> ""
      }
    Error(_) -> ""
  }

  let base_values = [
    #("entity-id-1", flow.entity_ids.0),
    #("entity-id-2", flow.entity_ids.1),
    #("material-direction", material_direction),
    #("financial-direction", financial_direction),
    #("information-direction", information_direction),
  ]

  let checkbox_values =
    list.filter(
      [
        #("material-flow", material_flow),
        #("financial-flow", financial_flow),
        #("information-flow", information_flow),
        #("material-future", material_future),
        #("financial-future", financial_future),
        #("information-future", information_future),
      ],
      fn(pair) { pair.1 == "on" },
    )

  new_flow_form(model)
  |> form.set_values(list.append(base_values, checkbox_values))
}

fn render_form(model: Model) {
  case model.current_form {
    NewEntityForm | EditEntityForm(_) -> render_entity_form(model.form, model)
    MaterialsForm -> render_materials_form(model.form, model)
    NewFlowForm | EditFlowForm(_) -> render_flow_form(model.form, model)
    NoForm -> element.none()
  }
}

fn render_materials_form(form: Form(FormData), model: Model) {
  let handle_submit = fn(values) {
    form
    |> form.add_values(values)
    |> form.run
    |> NewMaterialSubmit
  }

  html.div([class("flex-1 py-2")], [
    html.form([event.on_submit(handle_submit)], [
      render_new_item_field(
        "new-material",
        "material-id-" <> int.to_string(model.next_material_id),
      ),
      ..model.materials
      |> list.map(fn(material) { render_existing_material_field(material) })
      |> list.reverse()
    ]),
  ])
}

fn render_entity_form(form: Form(FormData), model: Model) {
  let handle_submit = fn(values) {
    form
    |> form.add_values(values)
    |> form.run
    |> EntityFormSubmit
  }

  html.div([class("flex-1 py-2")], [
    html.form([event.on_submit(handle_submit), id("main-entity-form")], [
      render_input_field(form, "name", "Name"),
      render_entity_type_selection(form),
      // render_materials_selection(
    //   model,
    //   model.materials,
    //   model.selected_material_ids,
    // ),
    ]),
    html.form([event.on_submit(NewValueActivity)], [
      html.label([], [text("Value Activities:")]),
      ..[
        render_new_item_field("new-value-activity", "new-value-activity"),
        ..list.map_fold(
          over: model.value_activities,
          from: 0,
          with: fn(acc, activity) {
            #(acc + 1, render_existing_value_activity(activity, acc))
          },
        ).1
        |> list.reverse()
      ]
    ]),
    render_submit_button(model.current_form, "main-entity-form"),
    // render_delete_button(model.current_form),
  ])
}

fn render_flow_form(form: Form(FormData), model: Model) {
  let handle_submit = fn(values) {
    form
    |> form.add_values(values)
    |> form.run
    |> FlowFormSubmit
  }

  html.div([class("flex-1 py-2")], [
    html.form([id("flow-form"), event.on_submit(handle_submit)], [
      render_entity_select_field(
        form,
        "entity-id-1",
        "Entity 1",
        model.entities,
      ),
      render_entity_select_field(
        form,
        "entity-id-2",
        "Entity 2",
        model.entities,
      ),
      render_flow_options(form, "material"),
      render_flow_options(form, "financial"),
      render_flow_options(form, "information"),
      render_submit_button(model.current_form, "flow-form"),
      render_delete_button(model.current_form),
    ]),
  ])
}

fn render_input_field(form: Form(FormData), name: String, label: String) {
  let errors = form.field_error_messages(form, name)
  html.div([], [
    html.div([class("py-2")], [
      html.label([attribute.for(name)], [text(label <> ": ")]),
    ]),
    html.input([
      class("w-full bg-gray-200 text-gray-700 rounded-sm px-2 py-1"),
      id(name),
      attribute.type_("text"),
      attribute.name(name),
      attribute.value(form.field_value(form, name)),
    ]),
    ..list.map(errors, fn(error_message) {
      html.p([attribute.class("mt-0.5 text-xs text-red-300")], [
        html.text(error_message),
      ])
    })
  ])
}

fn render_entity_select_field(
  form: Form(FormData),
  name: String,
  label: String,
  entities: List(Entity),
) {
  let errors = form.field_error_messages(form, name)
  html.div([], [
    html.div([class("py-2")], [
      html.label([attribute.for(name)], [text(label <> ": ")]),
    ]),
    html.select(
      [
        class("w-full bg-gray-200 text-gray-700 rounded-sm px-2 py-1"),
        id(name),
        attribute.name(name),
      ],
      [
        html.option(
          [
            attribute.value(""),
            attribute.selected(form.field_value(form, name) == ""),
          ],
          "Select an entity...",
        ),
        ..list.map(entities, fn(entity) {
          let is_selected = form.field_value(form, name) == entity.entity_id
          html.option(
            [
              attribute.value(entity.entity_id),
              attribute.selected(is_selected),
            ],
            case entity.name, entity.entity_id {
              "", "entity-id-" <> id -> "Entity " <> id
              _, _ -> entity.name
            },
          )
        })
      ],
    ),
    ..list.map(errors, fn(error_message) {
      html.p([attribute.class("mt-0.5 text-xs text-red-300")], [
        html.text(error_message),
      ])
    })
  ])
}

fn render_new_item_field(name: String, input_id: String) {
  html.div([class("flex py-2")], [
    html.input([
      class("w-5/6 bg-gray-200 text-gray-700 rounded-sm px-2 py-1"),
      id(input_id),
      attribute.type_("text"),
      attribute.name(name),
      attribute.value(""),
    ]),
    html.button(
      [
        class(
          "w-1/8 bg-green-600 hover:bg-green-400 rounded-sm p-1 ml-2 flex items-center justify-center",
        ),
      ],
      [
        svg.svg(
          [
            attribute("stroke-width", "1.5"),
            attribute("stroke", "currentColor"),
            class("size-6"),
          ],
          [
            svg.path([
              attribute("stroke-linecap", "round"),
              attribute("stroke-linejoin", "round"),
              attribute("d", "M12 4.5v15m7.5-7.5h-15"),
            ]),
          ],
        ),
      ],
    ),
  ])
}

fn render_existing_material_field(material: Material) {
  let edit_material = fn(name) { EditMaterial(name, material.material_id) }
  html.div([class("flex py-2")], [
    html.input([
      class("w-5/6 bg-gray-200 text-gray-700 rounded-sm px-2 py-1"),
      id(material.material_id),
      attribute.type_("text"),
      attribute.name(material.material_id),
      attribute.value(material.name),
      event.on_change(edit_material),
    ]),
    html.button(
      [
        class(
          "w-1/8 bg-red-600 hover:bg-red-400 rounded-sm p-1 ml-2 flex items-center justify-center",
        ),
        type_("button"),
        event.on_click(DeleteMaterial(material.material_id)),
      ],
      [
        svg.svg(
          [
            attribute("stroke-width", "1.5"),
            attribute("stroke", "currentColor"),
            class("size-6"),
          ],
          [
            svg.path([
              attribute("stroke-linecap", "round"),
              attribute("stroke-linejoin", "round"),
              attribute("d", "M6 18 18 6M6 6l12 12"),
            ]),
          ],
        ),
      ],
    ),
  ])
}

fn render_existing_value_activity(activity: String, activity_id: Int) {
  let edit_value_activity = fn(name) { EditValueActivity(name, activity_id) }
  html.div([class("flex py-2")], [
    html.input([
      class("w-5/6 bg-gray-200 text-gray-700 rounded-sm px-2 py-1"),
      id("activity-id-" <> int.to_string(activity_id)),
      attribute.type_("text"),
      attribute.name("activity-" <> activity),
      attribute.value(activity),
      event.on_change(edit_value_activity),
    ]),
    html.button(
      [
        class(
          "w-1/8 bg-red-600 hover:bg-red-400 rounded-sm p-1 ml-2 flex items-center justify-center",
        ),
        type_("button"),
        event.on_click(DeleteValueActivity(activity)),
      ],
      [
        svg.svg(
          [
            attribute("stroke-width", "1.5"),
            attribute("stroke", "currentColor"),
            class("size-6"),
          ],
          [
            svg.path([
              attribute("stroke-linecap", "round"),
              attribute("stroke-linejoin", "round"),
              attribute("d", "M6 18 18 6M6 6l12 12"),
            ]),
          ],
        ),
      ],
    ),
  ])
}

fn render_entity_type_selection(form: Form(FormData)) {
  let errors = form.field_error_messages(form, "entity-type")
  let current_entity_type = form.field_value(form, "entity-type")
  html.div([class("py-2")], [
    html.label([], [
      text("Select Type:"),
    ]),
    html.select(
      [
        class("w-full bg-gray-200 text-gray-700 rounded-sm px-2 py-1 mt-2"),
        attribute.name("entity-type"),
        attribute.value(form.field_value(form, "entity-type")),
      ],
      [
        html.option(
          case current_entity_type {
            "" -> [attribute.value(""), attribute.selected(True)]
            _ -> [attribute.value("")]
          },
          "(none)",
        ),
        ..list.map(entity_types(), fn(entity_type) {
          html.option(
            case current_entity_type == entity_type {
              True -> [attribute.value(entity_type), attribute.selected(True)]
              False -> [attribute.value(entity_type)]
            },
            entity_type,
          )
        })
      ],
    ),
    ..list.map(errors, fn(error_message) {
      html.p([attribute.class("mt-0.5 text-xs text-red-300")], [
        html.text(error_message),
      ])
    })
  ])
}

fn render_flow_options(form: Form(FormData), flow_type: String) {
  let errors = form.field_error_messages(form, flow_type <> "-flow")

  let flow_type_options_class =
    "flex-1 px-2 py-1 mt-1 bg-gray-600 rounded-sm "
    <> case form.field_value(form, flow_type <> "-flow") {
      "" -> "hidden"
      _ -> ""
    }

  html.div([class("py-2")], [
    html.label([class("mr-2")], [
      text(string.capitalise(flow_type) <> " Flow"),
    ]),
    html.input([
      attribute.type_("checkbox"),
      attribute.name(flow_type <> "-flow"),
      attribute.checked(form.field_value(form, flow_type <> "-flow") == "on"),
      event.on_click(ToggleFlowType(flow_type)),
    ]),
    html.div(
      [class("w-full")],
      list.map(errors, fn(error_message) {
        html.p([attribute.class("mt-0.5 text-xs text-red-300")], [
          html.text(error_message),
        ])
      }),
    ),
    html.div([class(flow_type_options_class)], [
      html.div([class("w-full text-sm")], [
        html.label([attribute.for(flow_type <> "-direction")], [
          text("Direction: "),
        ]),
        html.select(
          [
            class("ml-2 w-1/2 bg-gray-200 text-gray-700 rounded-sm px-2 mt-2"),
            attribute.name(flow_type <> "-direction"),
          ],
          [
            html.option(
              [
                attribute.value("1"),
                attribute.selected(
                  form.field_value(form, flow_type <> "-direction") == "1",
                ),
              ],
              "1 → 2",
            ),
            html.option(
              [
                attribute.value("-1"),
                attribute.selected(
                  form.field_value(form, flow_type <> "-direction") == "-1",
                ),
              ],
              "2 → 1",
            ),
            html.option(
              [
                attribute.value("0"),
                attribute.selected(
                  form.field_value(form, flow_type <> "-direction") == "0",
                ),
              ],
              "Bidirectional",
            ),
          ],
        ),
      ]),
      html.div([class("w-full mt-2 text-sm")], [
        html.label([attribute.for(flow_type <> "-future")], [
          text("Future State? "),
        ]),
        html.input([
          attribute.type_("checkbox"),
          attribute.name(flow_type <> "-future"),
          attribute.class("ml-2"),
          attribute.checked(
            form.field_value(form, flow_type <> "-future") == "on",
          ),
          event.on_click(ToggleFutureState(flow_type)),
        ]),
      ]),
    ]),
  ])
}

fn render_materials_selection(
  model: Model,
  materials: List(Material),
  selected_material_ids: List(String),
) {
  let selected_materials = get_materials_by_ids(model, selected_material_ids)
  html.div([class("py-2")], [
    html.label([], [
      text("Select Materials:"),
    ]),
    html.div(
      [],
      list.map(selected_materials, fn(material) {
        html.span(
          [
            class(
              "inline-flex items-center rounded-md bg-green-400/10 px-2 py-1 text-xs font-medium text-green-400 ring-1 ring-inset ring-green-500/20 cursor-pointer mr-2",
            ),
            event.on_click(RemoveSelectedMaterial(material.material_id)),
          ],
          [
            text(material.name),
            svg.svg(
              [
                attribute("viewBox", "0 0 24 24"),
                attribute("fill", "none"),
                attribute("stroke", "currentColor"),
                attribute("stroke-width", "1.5"),
                class("ml-1 size-4"),
              ],
              [
                svg.path([
                  attribute("stroke-linecap", "round"),
                  attribute("stroke-linejoin", "round"),
                  attribute("d", "M6 18 18 6M6 6l12 12"),
                ]),
              ],
            ),
          ],
        )
      }),
    ),
    html.select(
      [
        class("w-full bg-gray-200 text-gray-700 rounded-sm px-2 py-1 mt-2"),
        event.on_change(SelectMaterial),
        attribute.name("select-material"),
        attribute.value(""),
      ],
      [
        html.option([attribute.value("")], "Select a material..."),
        ..list.map(materials, fn(material) {
          html.option([attribute.value(material.material_id)], material.name)
        })
        |> list.reverse()
      ],
    ),
  ])
}

fn render_submit_button(current_form: FormType, form_id: String) {
  let button_text = case current_form {
    NewEntityForm -> "Add Entity"
    EditEntityForm(_) -> "Edit Entity"
    NewFlowForm -> "Add Flow"
    EditFlowForm(_) -> "Edit Flow"
    _ -> ""
  }

  html.div([class("py-2")], [
    html.button(
      [
        class(
          "w-full bg-pink-600 hover:bg-pink-400 px-3 py-2 rounded-sm cursor-pointer",
        ),
        attribute.form(form_id),
      ],
      [text(button_text)],
    ),
  ])
}

fn render_delete_button(current_form: FormType) {
  let #(message, label) = case current_form {
    EditEntityForm(entity_id) -> #(DeleteEntity(entity_id), "Delete Entity")
    EditFlowForm(flow_id) -> #(DeleteFlow(flow_id), "Delete Flow")
    _ -> #(DeleteEntity(""), "")
  }

  case label {
    "" -> element.none()
    _ ->
      html.button(
        [
          class(
            "w-full bg-red-600 hover:bg-red-800 px-3 py-2 rounded-sm cursor-pointer",
          ),
          event.on_click(message),
        ],
        [text(label)],
      )
  }
}

fn render_import_export_buttons(model: Model) {
  html.div([class("flex gap-2 mb-2")], [
    html.button(
      [
        class(
          "bg-gray-600 hover:bg-gray-400 px-3 py-2 rounded-sm cursor-pointer",
        ),
        attribute.title("Download File"),
        event.on_click(DownloadModel),
      ],
      [
        svg.svg(
          [
            attribute("stroke-width", "1.5"),
            attribute("stroke", "currentColor"),
            attribute("fill", "none"),
            class("size-6"),
          ],
          [
            svg.path([
              attribute("stroke-linecap", "round"),
              attribute("stroke-linejoin", "round"),
              attribute(
                "d",
                "M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3",
              ),
            ]),
          ],
        ),
      ],
    ),
    html.label(
      [
        class(
          "bg-gray-600 hover:bg-gray-400 px-3 py-2 rounded-sm cursor-pointer inline-block",
        ),
        attribute.title("Load File"),
        attribute.for("import-file"),
        attribute("tabindex", "0"),
      ],
      [
        svg.svg(
          [
            attribute("stroke-width", "1.5"),
            attribute("stroke", "currentColor"),
            attribute("fill", "none"),
            class("size-6"),
          ],
          [
            svg.path([
              attribute("stroke-linecap", "round"),
              attribute("stroke-linejoin", "round"),
              attribute(
                "d",
                "M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5",
              ),
            ]),
          ],
        ),
        html.input([
          id("import-file"),
          attribute.type_("file"),
          attribute.accept([".json"]),
          class("hidden"),
        ]),
      ],
    ),
    html.button(
      [
        class(
          "bg-gray-600 hover:bg-gray-400 px-3 py-2 rounded-sm cursor-pointer",
        ),
        attribute.title("Export as PNG"),
        event.on_click(ExportMap),
      ],
      [
        svg.svg(
          [
            attribute("stroke-width", "1.5"),
            attribute("stroke", "currentColor"),
            attribute("fill", "none"),
            class("size-6"),
          ],
          [
            svg.path([
              attribute("stroke-linecap", "round"),
              attribute("stroke-linejoin", "round"),
              attribute(
                "d",
                "M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25",
              ),
            ]),
          ],
        ),
      ],
    ),
    render_undo(model),
  ])
}

// Action types
type Action {
  NewEntity(entity: Entity)
  EditEntity(new: Entity, previous: Entity)
  RemoveEntity(
    entity: Entity,
    deleted_flows: List(Flow),
    position: Result(EntityPosition, List(decode.DecodeError)),
  )
  NewFlow(flow: Flow)
  EditFlow(new: Flow, previous: Flow)
  RemoveFlow(flow: Flow)
  ResetMap(
    previous_model: Model,
    positions: List(#(String, Result(EntityPosition, List(decode.DecodeError)))),
  )
}

fn render_undo(model: Model) {
  case model.actions {
    [] -> element.none()
    _ ->
      html.button(
        [
          class(
            "bg-gray-600 hover:bg-gray-400 px-3 py-2 rounded-sm cursor-pointer",
          ),
          event.on_click(Undo),
          attribute.title("Undo"),
        ],
        [
          svg.svg(
            [
              attribute("stroke-width", "1.5"),
              attribute("stroke", "currentColor"),
              attribute("fill", "none"),
              class("size-6"),
            ],
            [
              svg.path([
                attribute("stroke-linecap", "round"),
                attribute("stroke-linejoin", "round"),
                attribute("d", "M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3"),
              ]),
            ],
          ),
        ],
      )
  }
}

fn empty_form() {
  form.success(EmptyForm)
  |> form.new()
}

fn reset_form(model: Model) -> Model {
  Model(..model, form: empty_form(), current_form: NoForm)
}

// Serialisation helpers

fn serialise_material(material: Material) -> json.Json {
  json.object([
    #("name", json.string(material.name)),
    #("material_id", json.string(material.material_id)),
  ])
}

fn serialise_entity(entity: Entity) -> json.Json {
  json.object([
    #("name", json.string(entity.name)),
    #("entity_id", json.string(entity.entity_id)),
    #("value_activities", json.array(entity.value_activities, json.string)),
    #("materials", json.array(entity.materials, json.string)),
    #("entity_type", json.string(entity.entity_type)),
  ])
}

fn serialise_flow_type(flow_type: FlowType) -> json.Json {
  json.object([
    #("flow_category", json.string(flow_type.flow_category)),
    #("direction", json.int(flow_type.direction)),
    #("is_future", json.bool(flow_type.is_future)),
  ])
}

fn serialise_flow(flow: Flow) -> json.Json {
  json.object([
    #("flow_id", json.string(flow.flow_id)),
    #(
      "entity_ids",
      json.array([flow.entity_ids.0, flow.entity_ids.1], json.string),
    ),
    #("flow_types", json.array(flow.flow_types, serialise_flow_type)),
  ])
}

fn serialise_model(model: Model) -> String {
  json.object([
    #("materials", json.array(model.materials, serialise_material)),
    #("entities", json.array(model.entities, serialise_entity)),
    #("flows", json.array(model.flows, serialise_flow)),
    #("next_material_id", json.int(model.next_material_id)),
    #("next_entity_id", json.int(model.next_entity_id)),
    #("next_flow_id", json.int(model.next_flow_id)),
  ])
  |> json.to_string()
}

fn deserialise_model(json_data: String) -> Result(Model, json.DecodeError) {
  json.parse(json_data, model_decoder())
}

// Helper
@external(javascript, "./../components/resource_pooling.ffi.mjs", "setDispatch")
fn js_dispatch(dispatch: fn(String) -> Nil) -> Nil

@external(javascript, "./../components/resource_pooling.ffi.mjs", "initResourcePooling")
fn init_resource_pooling() -> Nil

@external(javascript, "./../components/resource_pooling.ffi.mjs", "createEntity")
fn create_entity(entity: Entity, materials: List(Material)) -> Nil

@external(javascript, "./../components/resource_pooling.ffi.mjs", "createEntity")
fn create_entity_at_position(
  entity: Entity,
  materials: List(Material),
  x: Float,
  y: Float,
) -> Nil

@external(javascript, "./../components/resource_pooling.ffi.mjs", "editEntity")
fn edit_entity(entity: Entity, materials: List(Material)) -> Nil

@external(javascript, "./../components/resource_pooling.ffi.mjs", "deleteEntity")
fn delete_entity(entity_id: String) -> Nil

@external(javascript, "./../components/resource_pooling.ffi.mjs", "setEntityPosition")
fn set_entity_position(entity_id: String, x: Float, y: Float) -> Nil

@external(javascript, "./../components/resource_pooling.ffi.mjs", "updateMaterial")
fn update_material(name: String, material_id: String) -> Nil

@external(javascript, "./../components/resource_pooling.ffi.mjs", "createFlow")
fn create_flow(flow: Flow) -> Nil

@external(javascript, "./../components/resource_pooling.ffi.mjs", "editFlow")
fn edit_flow(flow: Flow) -> Nil

@external(javascript, "./../components/resource_pooling.ffi.mjs", "deleteFlow")
fn delete_flow(flow_id: String) -> Nil

@external(javascript, "./../components/resource_pooling.ffi.mjs", "downloadModelData")
fn download_model_data(json_data: String) -> Nil

@external(javascript, "./../components/resource_pooling.ffi.mjs", "setupFileImport")
fn setup_file_import(dispatch: fn(String) -> Nil) -> Nil

@external(javascript, "./../components/resource_pooling.ffi.mjs", "centreViewOnNodes")
fn centre_view_on_nodes() -> Nil

@external(javascript, "./../components/resource_pooling.ffi.mjs", "restoreD3State")
fn restore_d3_state(
  entities: List(Entity),
  materials: List(Material),
  flows: List(Flow),
) -> Nil

@external(javascript, "./../components/resource_pooling.ffi.mjs", "exportMapAsPNG")
fn export_map_as_png() -> Nil

@external(javascript, "./../components/resource_pooling.ffi.mjs", "getEntityPosition")
fn get_entity_position_raw(entity_id: String) -> dynamic.Dynamic
