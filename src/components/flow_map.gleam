import formal/form.{type Form}
import keyboard_shortcuts.{
  Key, KeyDown, Modifier, PreventDefault, Shortcut, install_keyboard_shortcuts,
}
import lustre
import lustre/attribute.{attribute, class, id}
import lustre/effect.{type Effect}
import lustre/element.{type Element, text}
import lustre/element/html
import lustre/element/svg
import lustre/event
import lustre_http as http

import gleam/dynamic/decode
import gleam/float
import gleam/int
import gleam/io
import gleam/json
import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/result
import gleam/string

fn inspect(thing) {
  string.inspect(thing)
  |> io.println()
}

// Main
pub fn register() -> Result(Nil, lustre.Error) {
  let component = lustre.application(init, update, view)
  lustre.register(component, "flow-map")
}

pub fn element() -> Element(message) {
  element.element("flow-map", [], [])
}

// Model
type Model {
  Model(
    form: Form(FormData),
    current_form: FormType,
    actions: List(Action),
    next_node_id: Int,
    next_path_id: Int,
    nodes: List(Node),
    paths: List(Path),
    units: Unit,
    selected_coords: Option(#(Float, Float)),
    selected_node: Option(String),
  )
}

fn init(_) -> #(Model, Effect(Message)) {
  let init_effect =
    effect.from(fn(dispatch) {
      init_flow_map()

      let dispatch_wrapper = fn(message: String) {
        case message {
          "node_id:" <> node_id -> dispatch(NodeSelected(node_id))
          "path_id:" <> path_id -> dispatch(StartPathForm(path_id))
          "coords:" <> coords -> {
            case parse_coords(coords) {
              Ok(#(lat, lon)) -> dispatch(SelectCoords(lat, lon))
              Error(_) -> Nil
            }
          }
          "import:" <> json_data -> dispatch(ImportModel(json_data))
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

  #(empty_model(), init_effect)
}

fn empty_model() {
  Model(
    form: empty_form(),
    current_form: NoForm,
    actions: [],
    next_node_id: 1,
    next_path_id: 1,
    nodes: [],
    paths: [],
    units: Unit("", ""),
    selected_coords: None,
    selected_node: None,
  )
}

fn model_decoder() {
  use nodes <- decode.field("nodes", decode.list(node_decoder()))
  use paths <- decode.field("paths", decode.list(path_decoder()))
  use next_node_id <- decode.field("next_node_id", decode.int)
  use next_path_id <- decode.field("next_path_id", decode.int)
  use units <- decode.field("units", unit_decoder())

  decode.success(Model(
    form: empty_form(),
    current_form: NoForm,
    actions: [],
    next_node_id: next_node_id,
    next_path_id: next_path_id,
    nodes: nodes,
    paths: paths,
    units: units,
    selected_coords: None,
    selected_node: None,
  ))
}

// Update
type Message {
  // SVG interaction
  SelectCoords(lat: Float, lon: Float)
  NodeSelected(node_id: String)

  // Control messages
  StartNodeForm(node_id: String)
  NodeFormSubmit(Result(FormData, Form(FormData)))
  StartUnitForm
  StartPathForm(path_id: String)
  PathFormSubmit(Result(FormData, Form(FormData)))
  LocationSearch(query: List(#(String, String)))
  LocationSearchResult(result: Result(LocationResult, http.HttpError))
  DeleteNode(node_id: String)
  DeletePath(path_id: String)
  UnitFormSubmit(Result(FormData, Form(FormData)))
  Undo
  ResetForm
  DownloadModel
  ImportModel(json_data: String)
  ExportMap
  ClearMap
  GenerateRandomMap
}

fn update(model: Model, message: Message) -> #(Model, Effect(Message)) {
  case message {
    SelectCoords(lat, lon) -> {
      let updated_model = Model(..model, selected_coords: Some(#(lat, lon)))

      case model.current_form {
        NewNodeForm | EditNodeForm(_) -> {
          let node_label = form.field_value(model.form, "node_label")
          let updated_form =
            model.form
            |> form.set_values([
              #("lat", float.to_string(lat)),
              #("lon", float.to_string(lon)),
              #("node_label", node_label),
            ])
          let updated_model = Model(..updated_model, form: updated_form)
          #(updated_model, effect.none())
        }
        _ -> {
          #(updated_model, effect.none())
        }
      }
    }
    NodeSelected(node_id) -> {
      case model.current_form {
        NewPathForm | EditPathForm(..) -> {
          let origin_node_id = form.field_value(model.form, "origin_node_id")
          let destination_node_id =
            form.field_value(model.form, "destination_node_id")
          let value = form.field_value(model.form, "value")
          let updated_form = case origin_node_id, destination_node_id {
            "", _ ->
              model.form
              |> form.set_values([
                #("origin_node_id", node_id),
                #("destination_node_id", destination_node_id),
                #("value", value),
              ])
            _, "" -> {
              focus_root_by_id("flow-map", "value")
              model.form
              |> form.set_values([
                #("origin_node_id", origin_node_id),
                #("destination_node_id", node_id),
                #("value", value),
              ])
            }
            _, _ -> model.form
          }
          #(
            Model(..model, form: updated_form, selected_node: None),
            effect.none(),
          )
        }
        _ -> #(
          Model(..model, selected_node: Some(node_id)),
          effect.from(fn(dispatch) { dispatch(StartNodeForm(node_id)) }),
        )
      }
    }
    StartNodeForm("") -> {
      case model.selected_coords {
        Some(#(lat, lon)) -> {
          let #(updated_model, node) = create_new_node(model, lat, lon, "")
          let final_model =
            Model(
              ..updated_model,
              form: edit_node_form(node),
              current_form: EditNodeForm(node.node_id),
              selected_node: Some(node.node_id),
            )
          add_node(node.node_id, lat, lon, "")
          focus_root_by_id("flow-map", "node_label")
          #(final_model, effect.none())
        }
        None -> {
          let updated_model =
            Model(..model, form: new_node_form(), current_form: NewNodeForm)
          #(updated_model, effect.none())
        }
      }
    }
    StartNodeForm(node_id) -> {
      let node =
        model
        |> get_node_by_id(node_id)
        |> result.unwrap(Node("default", 0.0, 0.0, ""))

      case node.node_id {
        "default" -> #(model, effect.none())
        _ -> {
          let updated_model =
            Model(
              ..model,
              form: edit_node_form(node),
              current_form: EditNodeForm(node.node_id),
              selected_node: Some(node.node_id),
            )
          #(updated_model, effect.none())
        }
      }
    }
    NodeFormSubmit(Ok(NodeFormData(lat, lon, node_label))) -> {
      case model.current_form {
        NewNodeForm -> {
          let #(updated_model, node) =
            create_new_node(model, lat, lon, node_label)
          add_node(node.node_id, lat, lon, node_label)
          let final_model = reset_form(updated_model)
          #(final_model, effect.none())
        }
        EditNodeForm(node_id) -> {
          case update_existing_node(model, node_id, lat, lon, node_label) {
            Ok(updated_model) -> {
              edit_node(node_id, lat, lon, node_label)
              case node_label {
                "" -> {
                  focus_root_by_id("flow-map", "node_label")
                  #(
                    Model(..updated_model, selected_node: Some(node_id)),
                    effect.none(),
                  )
                }
                _ -> {
                  #(reset_form(updated_model), effect.none())
                }
              }
            }
            Error(_) -> #(model, effect.none())
          }
        }
        _ -> #(model, effect.none())
      }
    }
    NodeFormSubmit(Error(form)) -> {
      let updated_model = Model(..model, form: form)
      #(updated_model, effect.none())
    }
    DeleteNode(node_id) -> {
      case get_node_by_id(model, node_id) {
        Ok(node) -> {
          let connected_paths = get_paths_for_node(model, node_id)

          let updated_nodes =
            list.filter(model.nodes, fn(node) { node.node_id != node_id })

          let updated_paths =
            list.filter(model.paths, fn(path) {
              path.origin_node_id != node_id
              && path.destination_node_id != node_id
            })

          let updated_model =
            Model(
              ..model,
              nodes: updated_nodes,
              paths: updated_paths,
              current_form: NoForm,
              form: empty_form(),
              actions: [RemoveNode(node, connected_paths), ..model.actions],
            )

          delete_node(node.node_id)

          list.each(connected_paths, fn(path) { delete_path(path.path_id) })

          #(updated_model, effect.none())
        }
        Error(_) -> {
          #(model, effect.none())
        }
      }
    }
    StartPathForm("") -> {
      case model.selected_node {
        Some(node_id) -> {
          let path_with_origin_node_id =
            new_path_form(model)
            |> form.set_values([#("origin_node_id", node_id)])
          let updated_model =
            Model(
              ..model,
              form: path_with_origin_node_id,
              current_form: NewPathForm,
            )
          #(updated_model, effect.none())
        }
        None -> {
          let updated_model =
            Model(
              ..model,
              form: new_path_form(model),
              current_form: NewPathForm,
            )
          #(updated_model, effect.none())
        }
      }
    }
    StartPathForm(path_id) -> {
      let path =
        model
        |> get_path_by_id(path_id)
        |> result.unwrap(Path("default", "", "", 0.0))

      case path.path_id {
        "default" -> #(model, effect.none())
        _ -> {
          let updated_model =
            Model(
              ..model,
              form: edit_path_form(model, path),
              current_form: EditPathForm(path.path_id),
            )
          #(updated_model, effect.none())
        }
      }
    }
    PathFormSubmit(Ok(PathFormData(origin_node_id, destination_node_id, value))) -> {
      case model.current_form {
        NewPathForm -> {
          let #(updated_model, path) =
            create_new_path(model, origin_node_id, destination_node_id, value)
          let final_model = reset_form(updated_model)
          add_path(path.path_id, origin_node_id, destination_node_id, value)
          #(final_model, effect.none())
        }
        EditPathForm(path_id) -> {
          case
            update_existing_path(
              model,
              path_id,
              origin_node_id,
              destination_node_id,
              value,
            )
          {
            Ok(updated_model) -> {
              let final_model = reset_form(updated_model)
              edit_path(path_id, origin_node_id, destination_node_id, value)
              #(final_model, effect.none())
            }
            Error(_) -> #(model, effect.none())
          }
        }
        _ -> #(model, effect.none())
      }
    }
    PathFormSubmit(Error(form)) -> {
      let updated_model = Model(..model, form: form)
      #(updated_model, effect.none())
    }
    DeletePath(path_id) -> {
      case get_path_by_id(model, path_id) {
        Ok(path) -> {
          let updated_paths =
            list.filter(model.paths, fn(path) { path.path_id != path_id })

          let updated_model =
            Model(
              ..model,
              paths: updated_paths,
              current_form: NoForm,
              form: empty_form(),
              actions: [RemovePath(path), ..model.actions],
            )

          delete_path(path.path_id)

          #(updated_model, effect.none())
        }
        Error(_) -> {
          #(model, effect.none())
        }
      }
    }
    StartUnitForm -> {
      #(
        Model(..model, form: new_unit_form(model), current_form: UnitForm),
        effect.none(),
      )
    }
    UnitFormSubmit(Ok(UnitFormData(unit_symbol, unit_location))) -> {
      let updated_model =
        Model(..model, units: Unit(unit_symbol, unit_location), actions: [
          ChangeUnit(model.units),
          ..model.actions
        ])
        |> reset_form()

      set_units(unit_symbol, unit_location)

      #(updated_model, effect.none())
    }
    UnitFormSubmit(Error(form)) -> {
      let updated_model = Model(..model, form: form)
      #(updated_model, effect.none())
    }
    Undo -> {
      case model.actions {
        [NewNode(node), ..rest_actions] -> {
          let updated_nodes =
            list.filter(model.nodes, fn(n) { n.node_id != node.node_id })
          let updated_model =
            Model(..model, nodes: updated_nodes, actions: rest_actions)
            |> reset_form()

          delete_node(node.node_id)
          #(updated_model, effect.none())
        }
        [EditNode(original, _), ..rest_actions] -> {
          let updated_nodes =
            list.map(model.nodes, fn(node) {
              case node.node_id == original.node_id {
                True -> original
                False -> node
              }
            })
          let updated_model =
            Model(..model, nodes: updated_nodes, actions: rest_actions)
            |> reset_form()

          edit_node(
            original.node_id,
            original.lat,
            original.lon,
            original.node_label,
          )
          #(updated_model, effect.none())
        }
        [RemoveNode(node, deleted_paths), ..rest_actions] -> {
          let updated_model =
            Model(
              ..model,
              nodes: [node, ..model.nodes],
              paths: list.append(deleted_paths, model.paths),
              actions: rest_actions,
            )
            |> reset_form()

          add_node(node.node_id, node.lat, node.lon, node.node_label)

          list.each(deleted_paths, fn(path) {
            add_path(
              path.path_id,
              path.origin_node_id,
              path.destination_node_id,
              path.value,
            )
          })

          #(updated_model, effect.none())
        }
        [NewPath(path), ..rest_actions] -> {
          let updated_paths =
            list.filter(model.paths, fn(p) { p.path_id != path.path_id })
          let updated_model =
            Model(..model, paths: updated_paths, actions: rest_actions)
            |> reset_form()

          delete_path(path.path_id)
          #(updated_model, effect.none())
        }
        [EditPath(original, _), ..rest_actions] -> {
          let updated_paths =
            list.map(model.paths, fn(p) {
              case p.path_id == original.path_id {
                True -> original
                False -> p
              }
            })
          let updated_model =
            Model(..model, paths: updated_paths, actions: rest_actions)
            |> reset_form()

          edit_path(
            original.path_id,
            original.origin_node_id,
            original.destination_node_id,
            original.value,
          )
          #(updated_model, effect.none())
        }
        [RemovePath(path), ..rest_actions] -> {
          let updated_model =
            Model(..model, paths: [path, ..model.paths], actions: rest_actions)
            |> reset_form()

          add_path(
            path.path_id,
            path.origin_node_id,
            path.destination_node_id,
            path.value,
          )

          #(updated_model, effect.none())
        }
        [ResetMap(previous_model), ..] -> {
          let recreation_effect =
            effect.from(fn(_dispatch) {
              restore_d3_state(
                previous_model.nodes,
                previous_model.paths,
                previous_model.units.unit_symbol,
                previous_model.units.unit_location,
              )
            })
          #(previous_model, recreation_effect)
        }
        [GenerateMap(previous_model), ..] -> {
          let recreation_effect =
            effect.from(fn(_dispatch) {
              restore_d3_state(
                previous_model.nodes,
                previous_model.paths,
                previous_model.units.unit_symbol,
                previous_model.units.unit_location,
              )
            })
          #(previous_model, recreation_effect)
        }
        [ChangeUnit(original_unit), ..] -> {
          set_units(original_unit.unit_symbol, original_unit.unit_location)
          #(Model(..model, units: original_unit), effect.none())
        }
        [] -> #(model, effect.none())
      }
    }
    LocationSearch([#("location-search", query)]) -> {
      #(
        model,
        http.get(
          "https://photon.komoot.io/api/?q=" <> query <> "&limit=1",
          http.expect_json(decode_location_result(), LocationSearchResult),
        ),
      )
    }
    LocationSearchResult(Ok(result)) -> {
      let updated_form =
        model.form
        |> form.set_values([
          #("lat", float.to_string(result.lat)),
          #("lon", float.to_string(result.lon)),
          #("node_label", result.name),
        ])

      show_temp_node_at_coords(result.lat, result.lon)
      #(
        Model(
          ..model,
          form: updated_form,
          selected_coords: Some(#(result.lat, result.lon)),
        ),
        effect.none(),
      )
    }
    ResetForm -> {
      let updated_model =
        Model(..model, selected_node: None)
        |> reset_form()
      remove_temp_node()
      #(updated_model, effect.none())
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
                imported_model.nodes,
                imported_model.paths,
                imported_model.units.unit_symbol,
                imported_model.units.unit_location,
              )
            })
          #(imported_model, recreation_effect)
        }
        Error(_) -> #(model, effect.none())
      }
    }
    ExportMap -> {
      export_map_as_png()
      #(model, effect.none())
    }
    GenerateRandomMap -> {
      let random_model = generate_random_map()

      let recreation_effect =
        effect.from(fn(_dispatch) {
          restore_d3_state(
            random_model.nodes,
            random_model.paths,
            random_model.units.unit_symbol,
            random_model.units.unit_location,
          )
        })

      #(
        Model(..random_model, actions: [GenerateMap(model), ..model.actions]),
        recreation_effect,
      )
    }
    ClearMap -> {
      let updated_model =
        Model(
          ..empty_model(),
          actions: [ResetMap(model), ..model.actions],
          units: model.units,
        )

      let recreation_effect =
        effect.from(fn(_dispatch) {
          restore_d3_state(
            [],
            [],
            model.units.unit_symbol,
            model.units.unit_location,
          )
        })

      #(updated_model, recreation_effect)
    }
    _ -> #(model, effect.none())
  }
}

// View
fn view(model: Model) -> Element(Message) {
  html.div([class("flex flex-1")], [
    html.div([class("flex-col w-2/3 p-4")], [
      html.h1([class("text-4xl font-extrabold mb-6")], [text("Trade Flow Map")]),
      html.div(
        [
          class("flex-1 border-2 border-solid border-gray-900 rounded-lg p-1"),
          id("flow-map"),
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
          "Hover over buttons for their descriptions. Selecting nodes and paths on the map allows you to edit or delete them. Zoom and pan on the map to modify the view extent.",
        ),
      ]),
      render_import_export_buttons(model),
      html.button(
        [
          class(
            "bg-blue-600 hover:bg-blue-400 px-3 py-2 rounded-sm cursor-pointer",
          ),
          attribute.title("Add Node"),
          event.on_click(StartNodeForm("")),
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
                  "M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z M18 12a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z",
                ),
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
          attribute.title("Add Path"),
          event.on_click(StartPathForm("")),
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
                  "M4 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M20 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M5 10Q12 3 19 10",
                ),
              ]),
            ],
          ),
        ],
      ),
      html.button(
        [
          class(
            "bg-amber-600 hover:bg-amber-400 px-3 py-2 rounded-sm cursor-pointer ml-2",
          ),
          attribute.title("Set Units"),
          event.on_click(StartUnitForm),
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
                  "M14.121 7.629A3 3 0 0 0 9.017 9.43c-.023.212-.002.425.028.636l.506 3.541a4.5 4.5 0 0 1-.43 2.65L9 16.5l1.539-.513a2.25 2.25 0 0 1 1.422 0l.655.218a2.25 2.25 0 0 0 1.718-.122L15 15.75M8.25 12H12m9 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
                ),
              ]),
            ],
          ),
        ],
      ),
      html.button(
        [
          class(
            "bg-purple-600 hover:bg-purple-400 px-3 py-2 rounded-sm cursor-pointer ml-2",
          ),
          attribute.title("Generate Random Map"),
          event.on_click(GenerateRandomMap),
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
                  "M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z",
                ),
              ]),
            ],
          ),
        ],
      ),
      html.button(
        [
          class(
            "bg-red-600 hover:bg-red-400 px-3 py-2 rounded-sm cursor-pointer ml-2",
          ),
          attribute.title("Reset Map"),
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

// Node helpers
type Node {
  Node(node_id: String, lat: Float, lon: Float, node_label: String)
}

fn get_node_by_id(model: Model, node_id: String) -> Result(Node, Nil) {
  list.find(model.nodes, fn(node) { node.node_id == node_id })
}

fn create_new_node(
  model: Model,
  lat: Float,
  lon: Float,
  node_label: String,
) -> #(Model, Node) {
  let node_id = "node-id-" <> int.to_string(model.next_node_id)
  let node = Node(node_id, lat, lon, node_label)
  let updated_model =
    Model(
      ..model,
      actions: [NewNode(node), ..model.actions],
      nodes: [node, ..model.nodes],
      next_node_id: model.next_node_id + 1,
      selected_coords: None,
    )
  #(updated_model, node)
}

fn update_existing_node(
  model: Model,
  node_id: String,
  lat: Float,
  lon: Float,
  node_label: String,
) -> Result(Model, Nil) {
  use original_node <- result.try(get_node_by_id(model, node_id))

  let updated_node = Node(node_id, lat, lon, node_label)
  let updated_nodes =
    list.map(model.nodes, fn(node) {
      case node.node_id == node_id {
        True -> updated_node
        False -> node
      }
    })

  let updated_model =
    Model(..model, nodes: updated_nodes, selected_coords: None, actions: [
      EditNode(original_node, updated_node),
      ..model.actions
    ])

  Ok(updated_model)
}

fn node_decoder() {
  use node_id <- decode.field("node_id", decode.string)
  use lat <- decode.field("lat", decode.float)
  use lon <- decode.field("lon", decode.float)
  use node_label <- decode.field("node_label", decode.string)
  decode.success(Node(
    node_id: node_id,
    lat: lat,
    lon: lon,
    node_label: node_label,
  ))
}

// Path helpers
type Path {
  Path(
    path_id: String,
    origin_node_id: String,
    destination_node_id: String,
    value: Float,
  )
}

fn create_new_path(
  model: Model,
  origin_node_id: String,
  destination_node_id: String,
  value: Float,
) -> #(Model, Path) {
  let path_id = "path-id-" <> int.to_string(model.next_path_id)
  let path = Path(path_id, origin_node_id, destination_node_id, value)
  let updated_model =
    Model(
      ..model,
      actions: [NewPath(path), ..model.actions],
      paths: [path, ..model.paths],
      next_path_id: model.next_path_id + 1,
    )
  #(updated_model, path)
}

fn get_path_by_id(model: Model, path_id: String) -> Result(Path, Nil) {
  list.find(model.paths, fn(path) { path.path_id == path_id })
}

fn get_paths_for_node(model: Model, node_id: String) -> List(Path) {
  list.filter(model.paths, fn(path) {
    path.origin_node_id == node_id || path.destination_node_id == node_id
  })
}

fn update_existing_path(
  model: Model,
  path_id: String,
  origin_node_id: String,
  destination_node_id: String,
  value: Float,
) -> Result(Model, Nil) {
  use original_path <- result.try(get_path_by_id(model, path_id))

  let updated_path = Path(path_id, origin_node_id, destination_node_id, value)
  let updated_paths =
    list.map(model.paths, fn(path) {
      case path.path_id == path_id {
        True -> updated_path
        False -> path
      }
    })

  let updated_model =
    Model(..model, paths: updated_paths, selected_coords: None, actions: [
      EditPath(original_path, updated_path),
      ..model.actions
    ])

  Ok(updated_model)
}

fn path_decoder() {
  use path_id <- decode.field("path_id", decode.string)
  use origin_node_id <- decode.field("origin_node_id", decode.string)
  use destination_node_id <- decode.field("destination_node_id", decode.string)
  use value <- decode.field("value", decode.float)
  decode.success(Path(
    path_id: path_id,
    origin_node_id: origin_node_id,
    destination_node_id: destination_node_id,
    value: value,
  ))
}

// Location types
type LocationResult {
  LocationResult(lat: Float, lon: Float, name: String)
}

fn decode_location_result() {
  use features <- decode.field(
    "features",
    decode.list({
      use name <- decode.subfield(["properties", "name"], decode.string)
      use coords <- decode.subfield(["geometry", "coordinates"], {
        decode.list(decode.float)
        |> decode.map(fn(coords) {
          case coords {
            [lon, lat] -> LocationResult(lat, lon, name)
            _ -> LocationResult(0.0, 0.0, name)
          }
        })
      })
      decode.success(coords)
    }),
  )

  case list.first(features) {
    Ok(coords) -> decode.success(coords)
    Error(_) -> decode.failure(LocationResult(0.0, 0.0, ""), "Coordinates")
  }
}

// Unit types
type Unit {
  Unit(unit_symbol: String, unit_location: String)
}

fn unit_decoder() {
  use unit_symbol <- decode.field("unit_symbol", decode.string)
  use unit_location <- decode.field("unit_location", decode.string)
  decode.success(Unit(unit_symbol: unit_symbol, unit_location: unit_location))
}

// Form helpers
type FormType {
  NewNodeForm
  EditNodeForm(node_id: String)
  NewPathForm
  EditPathForm(node_id: String)
  UnitForm
  NoForm
}

type FormData {
  NodeFormData(lat: Float, lon: Float, node_label: String)
  PathFormData(
    origin_node_id: String,
    destination_node_id: String,
    value: Float,
  )
  UnitFormData(unit_symbol: String, unit_location: String)
  EmptyForm
}

type Action {
  NewNode(node: Node)
  EditNode(new: Node, previous: Node)
  RemoveNode(node: Node, deleted_paths: List(Path))
  NewPath(path: Path)
  EditPath(new: Path, previous: Path)
  RemovePath(path: Path)
  ChangeUnit(original_unit: Unit)
  GenerateMap(previous_model: Model)
  ResetMap(previous_model: Model)
}

fn empty_form() {
  form.success(EmptyForm)
  |> form.new()
}

fn reset_form(model: Model) -> Model {
  Model(..model, form: empty_form(), current_form: NoForm)
}

fn new_node_form() -> Form(FormData) {
  form.new({
    use lat <- form.field("lat", form.parse_float)
    use lon <- form.field("lon", form.parse_float)
    use node_label <- form.field("node_label", form.parse_string)
    form.success(NodeFormData(lat: lat, lon: lon, node_label: node_label))
  })
}

fn edit_node_form(node: Node) -> Form(FormData) {
  new_node_form()
  |> form.set_values([
    #("lat", float.to_string(node.lat)),
    #("lon", float.to_string(node.lon)),
    #("node_label", node.node_label),
  ])
}

fn edit_path_form(model: Model, path: Path) -> Form(FormData) {
  new_path_form(model)
  |> form.set_values([
    #("origin_node_id", path.origin_node_id),
    #("destination_node_id", path.destination_node_id),
    #("value", float.to_string(path.value)),
  ])
}

fn new_path_form(model: Model) -> Form(FormData) {
  form.new({
    use origin_node_id <- form.field(
      "origin_node_id",
      form.parse_string |> form.check_not_empty,
    )

    let check_if_is_origin = fn(id) {
      case id == origin_node_id {
        True -> Error("must not be origin")
        False -> Ok(id)
      }
    }

    let check_if_combination_exists = fn(id) {
      case
        model.current_form,
        list.filter(model.paths, fn(path) {
          path.origin_node_id == origin_node_id
          && path.destination_node_id == id
        })
        |> list.length()
      {
        EditPathForm(_), _ -> Ok(id)
        _, 0 -> Ok(id)
        _, _ -> Error("origin and destination combination exists")
      }
    }

    use destination_node_id <- form.field(
      "destination_node_id",
      form.parse_string
        |> form.check_not_empty
        |> form.check(check_if_is_origin)
        |> form.check(check_if_combination_exists),
    )

    use value <- form.field("value", { form.parse_float })

    form.success(PathFormData(
      origin_node_id: origin_node_id,
      destination_node_id: destination_node_id,
      value: value,
    ))
  })
}

fn new_unit_form(model: Model) -> Form(FormData) {
  form.new({
    use unit_symbol <- form.field("unit_symbol", form.parse_string)

    let not_empty_if_symbol_exists = fn(unit_location) {
      case unit_symbol, unit_location {
        "", "" -> Ok("")
        _, "" -> Error("unit location must be specified")
        _, _ -> Ok(unit_location)
      }
    }

    use unit_location <- form.field(
      "unit_location",
      form.parse_string |> form.check(not_empty_if_symbol_exists),
    )

    form.success(UnitFormData(
      unit_symbol: unit_symbol,
      unit_location: unit_location,
    ))
  })
  |> form.set_values([
    #("unit_symbol", model.units.unit_symbol),
    #("unit_location", model.units.unit_location),
  ])
}

fn render_form(model: Model) {
  case model.current_form {
    NewNodeForm | EditNodeForm(_) ->
      render_node_form(model.form, model.current_form)
    NewPathForm | EditPathForm(_) ->
      render_path_form(model.form, model.nodes, model.current_form)
    UnitForm -> render_unit_form(model.form, model.current_form)
    _ -> element.none()
  }
}

fn render_node_form(form: Form(FormData), current_form: FormType) {
  let handle_submit = fn(values) {
    form
    |> form.add_values(values)
    |> form.run
    |> NodeFormSubmit
  }

  html.div([class("flex-1 py-2")], [
    html.div([class("text-sm")], [
      text(
        "Select a location on the map, search for a location, or manually enter coordinates.",
      ),
    ]),
    html.form([event.on_submit(LocationSearch)], [
      render_search_location(),
    ]),
    html.form([event.on_submit(handle_submit)], [
      render_input_field(form, "lat", "Latitude"),
      render_input_field(form, "lon", "Longitude"),
      render_input_field(form, "node_label", "Label"),
      render_submit_button(current_form),
    ]),
  ])
}

fn render_path_form(
  form: Form(FormData),
  nodes: List(Node),
  current_form: FormType,
) {
  let handle_submit = fn(values) {
    form
    |> form.add_values(values)
    |> form.run
    |> PathFormSubmit
  }

  let nodes = list.reverse(nodes)

  html.div([class("flex-1 py-2")], [
    html.form([event.on_submit(handle_submit)], [
      render_node_select_field(form, "origin_node_id", "Origin", nodes),
      render_node_select_field(
        form,
        "destination_node_id",
        "Destination",
        nodes,
      ),
      render_input_field(form, "value", "Value"),
      render_submit_button(current_form),
    ]),
  ])
}

fn render_unit_form(form: Form(FormData), current_form: FormType) {
  let handle_submit = fn(values) {
    form
    |> form.add_values(values)
    |> form.run
    |> UnitFormSubmit
  }

  html.div([class("flex-1 py-2")], [
    html.form([event.on_submit(handle_submit)], [
      render_input_field(form, "unit_symbol", "Unit Symbol"),
      render_unit_location_select_field(form),
      render_submit_button(current_form),
    ]),
  ])
}

fn render_search_location() {
  html.div([class("mt-2")], [
    html.label([attribute.for("location-search")], [
      text("Search for location: "),
    ]),
    html.div([class("flex mt-2 gap-2")], [
      html.input([
        class("flex-1 min-w-0 bg-gray-200 text-gray-700 rounded-sm px-2 py-1"),
        id("location-search"),
        attribute.type_("text"),
        attribute.name("location-search"),
      ]),

      html.button(
        [
          class(
            "flex bg-gray-600 hover:bg-gray-400 px-1 py-1 rounded-sm cursor-pointer",
          ),
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
                  "m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z",
                ),
              ]),
            ],
          ),
        ],
      ),
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

fn render_node_select_field(
  form: Form(FormData),
  name: String,
  label: String,
  nodes: List(Node),
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
          "Select a node...",
        ),
        ..list.map(nodes, fn(node) {
          let is_selected = form.field_value(form, name) == node.node_id
          html.option(
            [
              attribute.value(node.node_id),
              attribute.selected(is_selected),
            ],
            case node.node_label, node.node_id {
              "", "node-id-" <> id -> "Node " <> id
              _, _ -> node.node_label
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

fn render_unit_location_select_field(form: Form(FormData)) {
  let errors = form.field_error_messages(form, "unit_location")
  html.div([], [
    html.div([class("py-2")], [
      html.label([attribute.for("unit_location")], [text("Unit Location: ")]),
    ]),
    html.select(
      [
        class("w-full bg-gray-200 text-gray-700 rounded-sm px-2 py-1"),
        id("unit_location"),
        attribute.name("unit_location"),
      ],
      [
        html.option(
          [
            attribute.value(""),
            attribute.selected(form.field_value(form, "unit_location") == ""),
          ],
          "Select unit location...",
        ),
        html.option(
          [
            attribute.value("before"),
            attribute.selected(
              form.field_value(form, "unit_location") == "before",
            ),
          ],
          "Before number",
        ),
        html.option(
          [
            attribute.value("after"),
            attribute.selected(
              form.field_value(form, "unit_location") == "after",
            ),
          ],
          "After number",
        ),
      ],
    ),
    ..list.map(errors, fn(error_message) {
      html.p([attribute.class("mt-0.5 text-xs text-red-300")], [
        html.text(error_message),
      ])
    })
  ])
}

fn render_submit_button(current_form: FormType) {
  let button_text = case current_form {
    NewNodeForm -> "Add Node"
    EditNodeForm(_) -> "Edit Node"
    NewPathForm -> "Add Path"
    EditPathForm(_) -> "Edit Path"
    NoForm | UnitForm -> "Submit"
  }

  html.div([class("pt-4")], [
    html.button(
      [
        class(
          "w-full bg-pink-600 hover:bg-pink-400 px-3 py-2 rounded-sm cursor-pointer",
        ),
      ],
      [text(button_text)],
    ),
  ])
}

fn render_delete_button(current_form: FormType) {
  let #(message, label) = case current_form {
    EditNodeForm(node_id) -> #(DeleteNode(node_id), "Delete Node")
    EditPathForm(path_id) -> #(DeletePath(path_id), "Delete Path")
    _ -> #(DeleteNode(""), "")
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

fn parse_coords(coords: String) -> Result(#(Float, Float), String) {
  case string.split(coords, ",") {
    [lat_str, lon_str] -> {
      use lat <- result.try(
        float.parse(lat_str) |> result.map_error(fn(_) { "Invalid latitude" }),
      )
      use lon <- result.try(
        float.parse(lon_str) |> result.map_error(fn(_) { "Invalid longitude" }),
      )
      Ok(#(lat, lon))
    }
    _ -> Error("Invalid coordinate string")
  }
}

// Serialisation helpers
fn serialise_node(node: Node) -> json.Json {
  json.object([
    #("node_id", json.string(node.node_id)),
    #("lat", json.float(node.lat)),
    #("lon", json.float(node.lon)),
    #("node_label", json.string(node.node_label)),
  ])
}

fn serialise_path(path: Path) -> json.Json {
  json.object([
    #("path_id", json.string(path.path_id)),
    #("origin_node_id", json.string(path.origin_node_id)),
    #("destination_node_id", json.string(path.destination_node_id)),
    #("value", json.float(path.value)),
  ])
}

fn serialise_model(model: Model) -> String {
  json.object([
    #("nodes", json.array(model.nodes, serialise_node)),
    #("paths", json.array(model.paths, serialise_path)),
    #("next_node_id", json.int(model.next_node_id)),
    #("next_path_id", json.int(model.next_path_id)),
  ])
  |> json.to_string()
}

fn deserialise_model(json_data: String) -> Result(Model, json.DecodeError) {
  json.parse(json_data, model_decoder())
}

// Random map generation
fn generate_random_map() -> Model {
  // 5 to 10 nodes
  let num_nodes = 5 + int.random(6)

  let cities =
    list.take(
      [
        #("London", 51.5074, -0.1278),
        #("Lagos", 6.455, 3.3945),
        #("New York", 40.7128, -74.006),
        #("São Paulo", -23.5505, -46.6333),
        #("Tokyo", 35.6762, 139.6503),
        #("Sydney", -33.8688, 151.2093),
        #("Tunis", 36.8002, 10.1857757),
        #("Singapore", 1.3521, 103.8198),
        #("Mumbai", 19.076, 72.8777),
        #("Cape Town", -33.9249, 18.4241),
        #("Paris", 48.8566, 2.3522),
      ],
      num_nodes,
    )

  let #(next_node_id, nodes) =
    list.map_fold(over: cities, from: 1, with: fn(i, city) {
      #(i + 1, Node("node-id-" <> int.to_string(i), city.1, city.2, city.0))
    })

  let #(next_path_id, paths) =
    list.map_fold(
      over: list.range(1, num_nodes),
      from: 1,
      with: fn(i, node_idx_1) {
        list.map_fold(
          over: list.range(1, num_nodes),
          from: i,
          with: fn(j, node_idx_2) {
            case node_idx_1 == node_idx_2 {
              True -> #(j, Path("", "", "", 0.0))
              False -> {
                let flow_value = int.random(3000)
                case flow_value > 1000 {
                  True -> #(j, Path("", "", "", 0.0))
                  False -> #(
                    j + 1,
                    Path(
                      "path-id-" <> int.to_string(j),
                      "node-id-" <> int.to_string(node_idx_1),
                      "node-id-" <> int.to_string(node_idx_2),
                      int.to_float(flow_value),
                    ),
                  )
                }
              }
            }
          },
        )
      },
    )

  Model(
    ..empty_model(),
    next_node_id: next_node_id,
    next_path_id: next_path_id,
    nodes: nodes,
    paths: list.flatten(paths) |> list.filter(fn(path) { path.path_id != "" }),
    units: Unit("£", "before"),
  )
}

// Helper
@external(javascript, "./../components/flow_map.ffi.mjs", "setDispatch")
fn js_dispatch(dispatch: fn(String) -> Nil) -> Nil

@external(javascript, "./../components/flow_map.ffi.mjs", "initFlowMap")
fn init_flow_map() -> Nil

@external(javascript, "./../components/flow_map.ffi.mjs", "addNode")
fn add_node(node_id: String, lat: Float, lon: Float, node_label: String) -> Nil

@external(javascript, "./../components/flow_map.ffi.mjs", "editNode")
fn edit_node(node_id: String, lat: Float, lon: Float, node_label: String) -> Nil

@external(javascript, "./../components/flow_map.ffi.mjs", "deleteNode")
fn delete_node(node_id: String) -> Nil

@external(javascript, "./../components/flow_map.ffi.mjs", "addPath")
fn add_path(
  path_id: String,
  origin_node_id: String,
  destination_node_id: String,
  value: Float,
) -> Nil

@external(javascript, "./../components/flow_map.ffi.mjs", "editPath")
fn edit_path(
  path_id: String,
  origin_node_id: String,
  destination_node_id: String,
  value: Float,
) -> Nil

@external(javascript, "./../components/flow_map.ffi.mjs", "deletePath")
fn delete_path(path_id: String) -> Nil

@external(javascript, "./../components/flow_map.ffi.mjs", "setUnits")
fn set_units(unit_symbol: String, unit_location: String) -> Nil

@external(javascript, "./../components/flow_map.ffi.mjs", "removeTempNode")
fn remove_temp_node() -> Nil

@external(javascript, "./../components/flow_map.ffi.mjs", "showTempNodeAtCoords")
fn show_temp_node_at_coords(lat: Float, lon: Float) -> Nil

@external(javascript, "./../components/flow_map.ffi.mjs", "downloadModelData")
fn download_model_data(json_data: String) -> Nil

@external(javascript, "./../components/flow_map.ffi.mjs", "setupFileImport")
fn setup_file_import(dispatch: fn(String) -> Nil) -> Nil

@external(javascript, "./../components/flow_map.ffi.mjs", "restoreD3State")
fn restore_d3_state(
  nodes: List(Node),
  paths: List(Path),
  unit_symbol: String,
  unit_location: String,
) -> Nil

@external(javascript, "./../components/flow_map.ffi.mjs", "exportMapAsPNG")
fn export_map_as_png() -> Nil

@external(javascript, "./../components/utils.ffi.mjs", "focusRootById")
fn focus_root_by_id(root: String, elemnt_id: String) -> Nil
