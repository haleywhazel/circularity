import formal/form.{type Form}
import keyboard_shortcuts.{
  Key, KeyDown, Modifier, PreventDefault, Shortcut, install_keyboard_shortcuts,
}
import lustre
import lustre/attribute.{class, id}
import lustre/effect.{type Effect}
import lustre/element.{type Element, text}
import lustre/element/html
import lustre/event

import gleam/float
import gleam/int
import gleam/io
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
          _ -> Nil
        }
      }

      js_dispatch(dispatch_wrapper)

      dispatch
      |> install_keyboard_shortcuts(KeyDown, [
        Shortcut([Key("Escape")], ResetForm, [PreventDefault]),
        // Shortcut([Modifier, Key("a")], StartNodeForm(""), [PreventDefault]),
        // Shortcut([Modifier, Key("p")], StartPathForm(""), [PreventDefault]),
        Shortcut([Modifier, Key("z")], Undo, [PreventDefault]),
      ])
    })

  #(
    Model(
      form: empty_form(),
      current_form: NoForm,
      actions: [],
      next_node_id: 1,
      next_path_id: 1,
      nodes: [],
      paths: [],
      selected_coords: None,
      selected_node: None,
    ),
    init_effect,
  )
}

// Update
type Message {
  // SVG interaction
  SelectCoords(lat: Float, lon: Float)
  NodeSelected(node_id: String)

  // Control messages
  StartNodeForm(node_id: String)
  NodeFormSubmit(Result(FormData, Form(FormData)))
  StartPathForm(path_id: String)
  PathFormSubmit(Result(FormData, Form(FormData)))
  DeleteNode(node_id: String)
  DeletePath(path_id: String)
  Undo
  ResetForm
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
            new_path_form()
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
            Model(..model, form: new_path_form(), current_form: NewPathForm)
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
              form: edit_path_form(path),
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
        [] -> #(model, effect.none())
      }
    }
    ResetForm -> {
      let updated_model =
        Model(..model, selected_node: None)
        |> reset_form()
      remove_temp_node()
      #(updated_model, effect.none())
    }
    _ -> #(model, effect.none())
  }
}

// View
fn view(model: Model) -> Element(Message) {
  html.div([class("flex flex-1")], [
    html.div([class("flex-col w-2/3 p-4")], [
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
      html.button(
        [
          class(
            "bg-blue-600 hover:bg-blue-400 px-3 py-2 rounded-sm cursor-pointer",
          ),
          event.on_click(StartNodeForm("")),
        ],
        [text("Add Node")],
      ),
      html.button(
        [
          class(
            "bg-green-600 hover:bg-green-400 px-3 py-2 rounded-sm cursor-pointer ml-2",
          ),
          event.on_click(StartPathForm("")),
        ],
        [text("Add Path")],
      ),
      render_undo(model),
      html.div(
        [
          class("transition-all duration-300 ease-in-out"),
          case model.current_form {
            NoForm -> class("max-h-0 opacity-0")
            _ -> class("max-h-96 opacity-100")
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

// Form helpers
type FormType {
  NewNodeForm
  EditNodeForm(node_id: String)
  NewPathForm
  EditPathForm(node_id: String)
  NoForm
}

type FormData {
  NodeFormData(lat: Float, lon: Float, node_label: String)
  PathFormData(
    origin_node_id: String,
    destination_node_id: String,
    value: Float,
  )
  EmptyForm
}

type Action {
  NewNode(node: Node)
  EditNode(new: Node, previous: Node)
  RemoveNode(node: Node, deleted_paths: List(Path))
  NewPath(path: Path)
  EditPath(new: Path, previous: Path)
  RemovePath(path: Path)
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

fn edit_path_form(path: Path) -> Form(FormData) {
  new_path_form()
  |> form.set_values([
    #("origin_node_id", path.origin_node_id),
    #("destination_node_id", path.destination_node_id),
    #("value", float.to_string(path.value)),
  ])
}

fn new_path_form() -> Form(FormData) {
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

    use destination_node_id <- form.field(
      "destination_node_id",
      form.parse_string
        |> form.check_not_empty
        |> form.check(check_if_is_origin),
    )

    use value <- form.field("value", { form.parse_float })

    form.success(PathFormData(
      origin_node_id: origin_node_id,
      destination_node_id: destination_node_id,
      value: value,
    ))
  })
}

fn render_form(model: Model) {
  case model.current_form {
    NewNodeForm | EditNodeForm(_) ->
      render_node_form(model.form, model.current_form)
    NewPathForm | EditPathForm(_) ->
      render_path_form(model.form, model.nodes, model.current_form)
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
            "bg-gray-600 hover:bg-gray-400 px-3 py-2 rounded-sm cursor-pointer ml-2",
          ),
          event.on_click(Undo),
        ],
        [text("Undo")],
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

fn render_submit_button(current_form: FormType) {
  let button_text = case current_form {
    NewNodeForm -> "Add Node"
    EditNodeForm(_) -> "Edit Node"
    NewPathForm -> "Add Path"
    EditPathForm(_) -> "Edit Path"
    NoForm -> "Submit"
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

@external(javascript, "./../components/flow_map.ffi.mjs", "removeTempNode")
fn remove_temp_node() -> Nil

@external(javascript, "./../components/utils.ffi.mjs", "focusRootById")
fn focus_root_by_id(root: String, elemnt_id: String) -> Nil
