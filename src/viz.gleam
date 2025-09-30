import components/flow_map
import components/resource_pooling

import lustre
import lustre/attribute.{attribute, class}
import lustre/element.{text}
import lustre/element/html
import lustre/element/svg
import lustre/event

// Main
pub fn main() {
  let app = lustre.simple(init, update, view)
  let assert Ok(_) = flow_map.register()
  let assert Ok(_) = resource_pooling.register()
  let assert Ok(_) = lustre.start(app, "body", Nil)
  Nil
}

// Model
type Model {
  Model(page: String, show_menu: Bool)
}

fn init(_) {
  Model("Flow Map", True)
}

// Update
type Message {
  FlowMap
  ResourcePooling
  ToggleMenu
}

fn update(model: Model, message: Message) -> Model {
  case message {
    FlowMap -> Model("Flow Map", model.show_menu)
    ResourcePooling -> Model("Resource Pooling", model.show_menu)
    ToggleMenu -> Model(model.page, !model.show_menu)
  }
}

// View
fn view(model) {
  html.div([class("min-h-screen flex bg-gray-200 overflow-auto")], [
    html.nav(
      [
        nav_class(model),
      ],
      [
        // Toggle button - always visible
        html.a(
          [
            class(
              "rounded-md px-3 py-2 text-sm font-medium text-gray-200 hover:bg-white/5 hover:text-white cursor-pointer mb-4",
            ),
            event.on_click(ToggleMenu),
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
                  attribute("d", "M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"),
                ]),
              ],
            ),
          ],
        ),
        html.div([menu_items_class(model)], [
          html.a(
            [
              link_class("Flow Map", model),
              event.on_click(FlowMap),
            ],
            [text("Flow Map")],
          ),
          html.a(
            [
              link_class("Resource Pooling", model),
              event.on_click(ResourcePooling),
            ],
            [text("Resource Pooling")],
          ),
        ]),
      ],
    ),
    html.div([class("flex flex-col px-12 flex-1 min-w-0")], [
      html.div([class("flex-1 w-full py-4")], [
        html.div([content_class(model, "Flow Map")], [flow_map.element()]),
        html.div([content_class(model, "Resource Pooling")], [
          resource_pooling.element(),
        ]),
      ]),
    ]),
  ])
}

// Helper
fn nav_class(model: Model) {
  let base_class =
    "bg-gray-900 text-gray-200 flex flex-col py-12 transition-all duration-300 ease-in-out flex-shrink-0"
  class(case model.show_menu {
    True -> base_class <> " w-64 px-4"
    False -> base_class <> " w-16 px-2"
  })
}

fn menu_items_class(model: Model) {
  class(case model.show_menu {
    True -> "flex flex-col"
    False -> "hidden"
  })
}

fn link_class(label: String, model: Model) {
  let base_class =
    "rounded-md px-3 py-2 text-sm font-medium text-gray-200 hover:bg-white/5 hover:text-white cursor-pointer"
  class(case label == model.page {
    True -> base_class <> " bg-gray-950"
    False -> base_class
  })
}

fn content_class(model: Model, component: String) {
  class(case model.page == component {
    True -> "w-full h-full"
    False -> "hidden"
  })
}
