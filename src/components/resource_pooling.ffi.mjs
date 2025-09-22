// ============================================================================
// CONSTANTS AND CONFIGURATION
// ============================================================================

const ENTITY_COLOURS = {
  Consumer: {
    fill: "#fecaca",
    stroke: "#dc2626",
  },
  Producer: {
    fill: "#bbf7d0",
    stroke: "#16a34a",
  },
  Scavenger: {
    fill: "#bfdbfe",
    stroke: "#2563eb",
  },
  Decomposer: {
    fill: "#fef3c7",
    stroke: "#d97706",
  },
};

const FLOW_COLORS = {
  Material: "#16a34a",
  Financial: "#dc2626",
  Information: "#2563eb",
};

const CONFIG = {
  minWidth: 150,
  minHeight: 100,
  maxWidth: 600,
  maxHeight: 300,
  maxAspectRatio: 3,
  padding: 15,
  nameHeight: 25,
  nameXPadding: 25,
  nameFontSize: "14px",
  badgeHeight: 20,
  badgeSpacing: 7.5,
  materialSpacing: 18,
  columnGap: 20,
  itemsPerActivityColumn: 3,
  itemsPerMaterialColumn: 5,
  entityMargin: 40,
  flowHoverWidth: 8,
};

// ============================================================================
// GLOBAL STATE
// ============================================================================

let resourcePooling = {
  svg: null,
  g: null,
  initialised: false,
};

let messageDispatch = null;
let forceSimulation = null;
let nodes = [];
let links = [];

// ============================================================================
// PUBLIC API FUNCTIONS
// ============================================================================

export function initResourcePooling() {
  if (resourcePooling.initialised) return null;

  requestAnimationFrame(() => {
    const resourcePoolingElement = document.querySelector("resource-pooling");
    const isHidden = resourcePoolingElement.closest(".hidden") !== null;

    if (isHidden) {
      initResourcePooling();
      return;
    }

    const element =
      resourcePoolingElement.shadowRoot?.getElementById("resource-pooling");
    if (element) {
      createResourcePooling();
      resourcePooling.initialised = true;
    } else {
      initResourcePooling();
    }
  });

  return null;
}

export function setDispatch(dispatch) {
  messageDispatch = dispatch;
  return null;
}

export function createEntity(entity, materials, x = null, y = null) {
  if (!resourcePooling.g) return;

  const entityId = entity.entity_id;
  const valueActivities = entity.value_activities.toArray();
  const entityMaterials = entity.materials.toArray();
  const materialsArray = materials.toArray();

  if (x == null && y == null) {
    const position = calculateNewEntityPosition(CONFIG.entityMargin);
    x = position.x;
    y = position.y;
  }

  const entityGroup = createEntityGroup(entityId, x, y);
  const { width, height } = buildEntityContent(
    entityGroup,
    entity,
    valueActivities,
    entityMaterials,
    materialsArray,
  );

  setupEntityInteraction(entityGroup, entityId, x, y, width, height);
  addEntityToSimulation(entityId, entity, x, y, width, height);

  return entityGroup;
}

export function editEntity(entity, materials) {
  if (!resourcePooling.g) return;

  const entityId = entity.entity_id;
  const existingEntity = resourcePooling.g.select(`#${entityId}`);

  if (existingEntity.empty()) {
    console.warn(`Entity with ID ${entityId} not found`);
    return;
  }

  const existingNode = nodes.find((n) => n.id === entityId);
  const currentX = existingNode ? existingNode.x : 0;
  const currentY = existingNode ? existingNode.y : 0;

  existingEntity.remove();
  createEntity(entity, materials, currentX, currentY);
  updateLinkReferences(entityId);
}

export function deleteEntity(entityId) {
  if (!resourcePooling.g) return;

  resourcePooling.g.select(`#${entityId}`).remove();

  const nodeIndex = nodes.findIndex((n) => n.id === entityId);
  if (nodeIndex >= 0) {
    nodes.splice(nodeIndex, 1);
    updateSimulation();
  }
}

export function updateMaterial(name, materialId) {
  if (!resourcePooling.g) return;

  resourcePooling.g.selectAll(".entity").each(function () {
    const entityGroup = d3.select(this);
    const materialItems = entityGroup
      .selectAll(".material-item")
      .filter(function () {
        return d3.select(this).attr("data-material-id") === materialId;
      });

    materialItems.each(function () {
      const materialGroup = d3.select(this);
      const textElement = materialGroup.select("text");
      textElement.text(name);
    });
  });
}

export function createFlow(flow) {
  if (!resourcePooling.g) return;

  const flowId = flow.flow_id;
  const [entityId1, entityId2] = flow.entity_ids;
  const flowTypes = flow.flow_types.toArray();

  const entity1 = resourcePooling.g.select(`#${entityId1}`);
  const entity2 = resourcePooling.g.select(`#${entityId2}`);

  if (entity1.empty() || entity2.empty()) {
    console.warn(`One or both entities not found: ${entityId1}, ${entityId2}`);
    return;
  }

  const flowGroup = resourcePooling.g
    .select(".flows-group")
    .append("g")
    .attr("class", "flow")
    .attr("id", flowId);

  const entity1Bounds = getEntityBounds(entity1);
  const entity2Bounds = getEntityBounds(entity2);

  flowTypes.forEach((flowType, index) => {
    createSingleFlow(flowGroup, entity1Bounds, entity2Bounds, flowType, index);
  });

  setupFlowInteraction(flowGroup, flowId);

  addFlowToSimulation(flowId, entityId1, entityId2, flow);
  return flowGroup;
}

export function editFlow(flow) {
  if (!resourcePooling.g) return;

  deleteFlow(flow.flow_id);
  createFlow(flow);
}

export function deleteFlow(flowId) {
  if (!resourcePooling.g) return;

  resourcePooling.g.select(`#${flowId}`).remove();

  const linkIndex = links.findIndex((l) => l.id === flowId);
  if (linkIndex >= 0) {
    links.splice(linkIndex, 1);
    updateSimulation();
  }
}

export function downloadModelData(gleamJsonData) {
  const gleamState = JSON.parse(gleamJsonData);

  const d3State = {
    nodes: nodes.map((node) => ({
      id: node.id,
      x: node.x || 0,
      y: node.y || 0,
      width: node.width || 150,
      height: node.height || 100,
    })),
    links: links.map((link) => ({
      id: link.id,
      source: typeof link.source === "object" ? link.source.id : link.source,
      target: typeof link.target === "object" ? link.target.id : link.target,
    })),
  };

  const combinedData = {
    gleam_state: gleamState,
    d3_state: d3State,
  };

  const jsonData = JSON.stringify(combinedData, null, 2);
  const blob = new Blob([jsonData], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `resource-pooling-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function setupFileImport(dispatch) {
  requestAnimationFrame(() => {
    const shadowRoot = document.querySelector("resource-pooling").shadowRoot;
    const fileInput = shadowRoot.querySelector("#import-file");

    if (!fileInput) {
      setupFileImport(dispatch);
      return;
    }

    fileInput.addEventListener("change", (event) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const combinedData = JSON.parse(e.target.result);

            if (combinedData.d3_state && combinedData.gleam_state) {
              window.pendingD3State = combinedData.d3_state;

              dispatch(`import:${JSON.stringify(combinedData.gleam_state)}`);
            } else {
              console.error("Invalid file format");
            }
          } catch (error) {
            console.error("Failed to parse import file:", error);
          }
        };
        reader.readAsText(file);
      }
    });
  });
}

export function restoreD3StateAfterImport(entities, materials, flows) {
  if (!window.pendingD3State) return;

  const d3State = window.pendingD3State;

  clearResourcePooling();

  entities.toArray().forEach((entity) => {
    const nodeState = d3State.nodes.find((n) => n.id === entity.entity_id);
    if (nodeState) {
      createEntity(entity, materials, nodeState.x, nodeState.y);
    } else {
      createEntity(entity, materials);
    }
  });

  flows.toArray().forEach((flow) => {
    createFlow(flow);
  });

  delete window.pendingD3State;
}

// ============================================================================
// ENTITY MANAGEMENT FUNCTIONS
// ============================================================================

function createEntityGroup(entityId, x, y) {
  return resourcePooling.g
    .select(".entities-group")
    .append("g")
    .attr("class", "entity")
    .attr("id", entityId)
    .attr("transform", `translate(${x}, ${y})`);
}

function buildEntityContent(
  entityGroup,
  entity,
  valueActivities,
  entityMaterials,
  materialsArray,
) {
  const mainRect = entityGroup.append("rect").attr("class", "main-rect");
  const headerRect = entityGroup.append("rect").attr("class", "header-rect");

  const titleText = createEntityTitle(entityGroup, entity.name);
  const titleWidth = calculateTitleWidth(titleText);

  const { activityElements, maxActivityWidth } = createActivityBadges(
    entityGroup,
    valueActivities,
  );

  const { materialElements, maxMaterialWidth } = createMaterialElements(
    entityGroup,
    entityMaterials,
    materialsArray,
  );

  const dimensions = calculateEntityDimensions(
    titleWidth,
    maxActivityWidth,
    maxMaterialWidth,
    valueActivities.length,
    entityMaterials.length,
  );

  positionMaterialElements(materialElements, maxActivityWidth);
  styleEntityRectangles(mainRect, headerRect, dimensions, entity.entity_type);

  if (maxActivityWidth > 0 && maxMaterialWidth > 0) {
    createContentDivider(
      entityGroup,
      maxActivityWidth,
      dimensions,
      entity.entity_type,
    );
  }

  return dimensions;
}

function createEntityTitle(entityGroup, name) {
  return entityGroup
    .append("text")
    .attr("x", CONFIG.nameXPadding)
    .attr("y", CONFIG.nameHeight)
    .attr("text-anchor", "left")
    .style("font-size", CONFIG.nameFontSize)
    .style("font-weight", "bold")
    .style("fill", "#e5e7eb")
    .text(name);
}

function calculateTitleWidth(titleText) {
  const titleBBox = titleText.node().getBBox();
  return titleBBox.width + CONFIG.padding * 2 + CONFIG.nameXPadding;
}

function createActivityBadges(entityGroup, valueActivities) {
  let activityElements = [];
  let maxActivityWidth = 0;

  if (valueActivities && valueActivities.length > 0) {
    const numColumns = Math.ceil(
      valueActivities.length / CONFIG.itemsPerActivityColumn,
    );
    let columnWidths = [];

    for (let col = 0; col < numColumns; col++) {
      let columnMaxWidth = 0;
      const startIdx = col * CONFIG.itemsPerActivityColumn;
      const endIdx = Math.min(
        startIdx + CONFIG.itemsPerActivityColumn,
        valueActivities.length,
      );

      for (let i = startIdx; i < endIdx; i++) {
        const activity = valueActivities[i];
        const rowInColumn = i - startIdx;
        const xOffset =
          col > 0
            ? columnWidths.reduce((sum, w) => sum + w + CONFIG.columnGap, 0)
            : 0;

        const badge = createActivityBadge(
          entityGroup,
          activity,
          xOffset,
          rowInColumn,
        );
        const badgeWidth = styleActivityBadge(badge, activity);

        columnMaxWidth = Math.max(columnMaxWidth, badgeWidth);
        activityElements.push({ badge, width: badgeWidth, column: col });
      }
      columnWidths.push(columnMaxWidth);
    }

    maxActivityWidth =
      columnWidths.reduce((sum, w) => sum + w, 0) +
      (numColumns - 1) * CONFIG.columnGap;
  }

  return { activityElements, maxActivityWidth };
}

function createActivityBadge(entityGroup, activity, xOffset, rowInColumn) {
  return entityGroup
    .append("g")
    .attr("class", "activity-badge")
    .attr(
      "transform",
      `translate(${CONFIG.padding + xOffset}, ${CONFIG.nameHeight + CONFIG.padding + 20 + rowInColumn * (CONFIG.badgeHeight + CONFIG.badgeSpacing)})`,
    );
}

function styleActivityBadge(badge, activity) {
  const text = badge
    .append("text")
    .attr("x", 0)
    .attr("y", CONFIG.badgeHeight / 2 + 4)
    .style("font-size", "12px")
    .style("fill", "#000000")
    .text(activity);

  const bbox = text.node().getBBox();
  const badgeWidth = bbox.width + 16;

  badge
    .insert("rect", "text")
    .attr("width", badgeWidth)
    .attr("height", CONFIG.badgeHeight)
    .attr("rx", 10)
    .style("fill", "#ffffff")
    .style("fill-opacity", "0.7")
    .style("stroke", "#000000")
    .style("stroke-width", 1);

  text.attr("x", badgeWidth / 2).attr("text-anchor", "middle");

  return badgeWidth;
}

function createMaterialElements(entityGroup, entityMaterials, materialsArray) {
  let materialElements = [];
  let maxMaterialWidth = 0;

  if (entityMaterials && entityMaterials.length > 0) {
    const materialObjects = entityMaterials
      .map((materialId) =>
        materialsArray.find((m) => m.material_id === materialId),
      )
      .filter(Boolean);

    const numColumns = Math.ceil(
      materialObjects.length / CONFIG.itemsPerMaterialColumn,
    );
    let columnWidths = [];

    for (let col = 0; col < numColumns; col++) {
      let columnMaxWidth = 0;
      const startIdx = col * CONFIG.itemsPerMaterialColumn;
      const endIdx = Math.min(
        startIdx + CONFIG.itemsPerMaterialColumn,
        materialObjects.length,
      );

      for (let i = startIdx; i < endIdx; i++) {
        const material = materialObjects[i];
        const rowInColumn = i - startIdx;
        const xOffset =
          col > 0
            ? columnWidths.reduce((sum, w) => sum + w + CONFIG.columnGap, 0)
            : 0;

        const materialGroup = createMaterialItem(
          entityGroup,
          material,
          xOffset,
          rowInColumn,
        );
        const materialWidth = getMaterialWidth(materialGroup);

        columnMaxWidth = Math.max(columnMaxWidth, materialWidth);
        materialElements.push({
          group: materialGroup,
          width: materialWidth,
          column: col,
        });
      }
      columnWidths.push(columnMaxWidth);
    }

    maxMaterialWidth =
      columnWidths.reduce((sum, w) => sum + w, 0) +
      (numColumns - 1) * CONFIG.columnGap;
  }

  return { materialElements, maxMaterialWidth };
}

function createMaterialItem(entityGroup, material, xOffset, rowInColumn) {
  const materialGroup = entityGroup
    .append("g")
    .attr("class", "material-item")
    .attr("data-material-id", material.material_id)
    .attr(
      "transform",
      `translate(${xOffset}, ${CONFIG.nameHeight + CONFIG.padding + 20 + rowInColumn * CONFIG.materialSpacing})`,
    );

  materialGroup
    .append("circle")
    .attr("cx", 0)
    .attr("cy", 10)
    .attr("r", 2)
    .style("fill", "#374151");

  materialGroup
    .append("text")
    .attr("x", 10)
    .attr("y", 12)
    .style("font-size", "13px")
    .style("fill", "#374151")
    .text(material.name);

  return materialGroup;
}

function getMaterialWidth(materialGroup) {
  const bbox = materialGroup.select("text").node().getBBox();
  return bbox.width + 25;
}

function calculateEntityDimensions(
  titleWidth,
  maxActivityWidth,
  maxMaterialWidth,
  numActivities,
  numMaterials,
) {
  const minWidthForTitle = Math.max(CONFIG.minWidth, titleWidth);
  const contentWidth =
    maxActivityWidth +
    maxMaterialWidth +
    (maxActivityWidth > 0 && maxMaterialWidth > 0 ? CONFIG.columnGap : 0);
  const width = Math.max(minWidthForTitle, contentWidth + CONFIG.padding * 2);

  const maxActivityRows = Math.min(
    CONFIG.itemsPerActivityColumn,
    numActivities,
  );
  const maxMaterialRows = Math.min(CONFIG.itemsPerMaterialColumn, numMaterials);

  const activitiesHeight =
    maxActivityRows > 0
      ? maxActivityRows * (CONFIG.badgeHeight + CONFIG.badgeSpacing)
      : 0;
  const materialsHeight =
    maxMaterialRows > 0 ? maxMaterialRows * CONFIG.materialSpacing : 0;
  const contentHeight = Math.max(activitiesHeight, materialsHeight);

  const height = Math.max(
    CONFIG.minHeight,
    CONFIG.nameHeight + CONFIG.padding * 2 + contentHeight + 20,
  );

  return { width, height };
}

function positionMaterialElements(materialElements, maxActivityWidth) {
  materialElements.forEach(({ group }) => {
    const currentTransform = group.attr("transform");
    const yPos = currentTransform.match(/translate\(0, ([\d.]+)\)/)[1];
    group.attr(
      "transform",
      `translate(${CONFIG.padding + maxActivityWidth + CONFIG.columnGap}, ${yPos})`,
    );
  });
}

function styleEntityRectangles(mainRect, headerRect, dimensions, entityType) {
  const rectColours = ENTITY_COLOURS[entityType];

  mainRect
    .attr("width", dimensions.width)
    .attr("height", dimensions.height)
    .style("fill", rectColours.fill)
    .style("stroke", rectColours.stroke)
    .style("stroke-width", 1.5)
    .style("cursor", "move");

  headerRect
    .attr("width", dimensions.width)
    .attr("height", CONFIG.nameHeight + 14)
    .style("fill", rectColours.stroke)
    .style("cursor", "move");
}

function createContentDivider(
  entityGroup,
  maxActivityWidth,
  dimensions,
  entityType,
) {
  const dividerX = CONFIG.padding + maxActivityWidth + CONFIG.columnGap / 2;
  const dividerStartY = CONFIG.nameHeight + 10;
  const dividerEndY = dimensions.height;
  const rectColours = ENTITY_COLOURS[entityType];

  entityGroup
    .append("line")
    .attr("class", "content-divider")
    .attr("x1", dividerX)
    .attr("y1", dividerStartY)
    .attr("x2", dividerX)
    .attr("y2", dividerEndY)
    .style("stroke", rectColours.stroke)
    .style("stroke-width", 2)
    .style("opacity", 0.5);
}

function setupEntityInteraction(entityGroup, entityId, x, y, width, height) {
  let dragStartX, dragStartY;

  entityGroup
    .call(
      d3
        .drag()
        .on("start", function (event) {
          if (!event.active && forceSimulation) {
            forceSimulation.alphaTarget(0.3).restart();
          }
          const node = nodes.find((n) => n.id === entityId);
          if (node) {
            dragStartX = event.x - node.x;
            dragStartY = event.y - node.y;
            node.fx = node.x;
            node.fy = node.y;
          }
        })
        .on("drag", function (event) {
          const node = nodes.find((n) => n.id === entityId);
          if (node) {
            node.fx = event.x - dragStartX;
            node.fy = event.y - dragStartY;
          }
        })
        .on("end", function (event) {
          if (!event.active && forceSimulation) {
            forceSimulation.alphaTarget(0);
          }
          const node = nodes.find((n) => n.id === entityId);
          if (node) {
            node.fx = null;
            node.fy = null;
          }
        }),
    )
    .on("click", function (event) {
      event.stopPropagation();
      if (messageDispatch) {
        messageDispatch("entity_id:" + entityId);
      }
    });
}

function calculateNewEntityPosition(margin = 40) {
  if (!resourcePooling.g) return { x: 100, y: 100 };

  const existingEntities = resourcePooling.g.selectAll(".entity");
  if (existingEntities.empty()) return { x: 100, y: 100 };

  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;
  let avgX = 0,
    avgY = 0,
    count = 0;

  existingEntities.each(function () {
    const transform = d3.select(this).attr("transform");
    const translateMatch = transform.match(/translate\(([^,]+),([^)]+)\)/);
    const x = translateMatch ? parseFloat(translateMatch[1]) : 0;
    const y = translateMatch ? parseFloat(translateMatch[2]) : 0;

    const rect = d3.select(this).select(".main-rect");
    const width = parseFloat(rect.attr("width")) || 150;
    const height = parseFloat(rect.attr("height")) || 100;

    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x + width);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y + height);

    avgX += x;
    avgY += y;
    count++;
  });

  const groupWidth = maxX - minX;
  const groupHeight = maxY - minY;
  const isGroupWide = groupWidth / groupHeight > 1.5;

  if (isGroupWide) {
    return { x: avgX / count, y: maxY + margin };
  } else {
    return { x: maxX + margin, y: avgY / count };
  }
}

function getEntityBounds(entityElement) {
  const transform = entityElement.attr("transform");
  const translateMatch = transform.match(/translate\(([^,]+),([^)]+)\)/);
  const x = translateMatch ? parseFloat(translateMatch[1]) : 0;
  const y = translateMatch ? parseFloat(translateMatch[2]) : 0;

  const rect = entityElement.select(".main-rect");
  const width = parseFloat(rect.attr("width")) || 150;
  const height = parseFloat(rect.attr("height")) || 100;

  return {
    x,
    y,
    width,
    height,
    centerX: x + width / 2,
    centerY: y + height / 2,
    right: x + width,
    bottom: y + height,
  };
}

// ============================================================================
// FLOW MANAGEMENT FUNCTIONS
// ============================================================================

function createSingleFlow(
  flowGroup,
  entity1Bounds,
  entity2Bounds,
  flowType,
  index,
) {
  const entity1Center = { x: entity1Bounds.centerX, y: entity1Bounds.centerY };
  const entity2Center = { x: entity2Bounds.centerX, y: entity2Bounds.centerY };

  const startPoint = getEntityBorderPoint(
    entity1Bounds,
    entity2Center.x,
    entity2Center.y,
    flowType,
    index,
  );
  const endPoint = getEntityBorderPoint(
    entity2Bounds,
    entity1Center.x,
    entity1Center.y,
    flowType,
    index,
  );

  const pathData = createCurvedPath(startPoint, endPoint);
  const color = FLOW_COLORS[flowType.flow_category] || "#666";

  const hoverPath = flowGroup
    .append("path")
    .attr("class", "flow-hover")
    .attr("d", pathData)
    .style("fill", "none")
    .style("stroke", "transparent")
    .style("stroke-width", CONFIG.flowHoverWidth)
    .style("cursor", "pointer");

  const flowPath = flowGroup
    .append("path")
    .attr("class", "flow-path")
    .attr("d", pathData)
    .style("fill", "none")
    .style("stroke", color)
    .style("stroke-width", 1)
    .style("stroke-dasharray", flowType.is_future ? "5,5" : "none")
    .style("pointer-events", "none");

  setupFlowArrows(flowPath, flowType);
  flowPath.datum({ flowType: flowType, index: index });
  hoverPath.datum({ flowType: flowType, index: index });

  return { hoverPath, flowPath };
}

function setupFlowInteraction(flowGroup, flowId) {
  flowGroup.on("click", function (event) {
    event.stopPropagation();
    if (messageDispatch) {
      messageDispatch("flow_id:" + flowId);
    }
  });
}

function setupFlowArrows(flowPath, flowType) {
  const defs = getOrCreateDefs();
  const color = FLOW_COLORS[flowType.flow_category] || "#666";
  const category = flowType.flow_category.toLowerCase();

  createArrowMarker(defs, `arrow-${category}`, color, false);
  createArrowMarker(defs, `arrow-reverse-${category}`, color, true);

  if (flowType.direction === 1) {
    flowPath.attr("marker-end", `url(#arrow-${category})`);
  } else if (flowType.direction === -1) {
    flowPath.attr("marker-start", `url(#arrow-reverse-${category})`);
  } else if (flowType.direction === 0) {
    flowPath
      .attr("marker-start", `url(#arrow-reverse-${category})`)
      .attr("marker-end", `url(#arrow-${category})`);
  }
}

function getOrCreateDefs() {
  let defs = resourcePooling.svg.select("defs");
  if (defs.empty()) {
    defs = resourcePooling.svg.append("defs");
  }
  return defs;
}

function createArrowMarker(defs, id, color, isReverse) {
  if (!defs.select(`#${id}`).empty()) return;

  const marker = defs
    .append("marker")
    .attr("id", id)
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", isReverse ? 2 : 8)
    .attr("refY", 0)
    .attr("markerWidth", 5)
    .attr("markerHeight", 5)
    .attr("orient", "auto");

  const path = isReverse ? "M10,-5L0,0L10,5" : "M0,-5L10,0L0,5";
  marker.append("path").attr("d", path).attr("fill", color);
}

function getEntityBorderPoint(
  entityBounds,
  targetX,
  targetY,
  flowType = null,
  index = 0,
) {
  const centerX = entityBounds.x + entityBounds.width / 2;
  const centerY = entityBounds.y + entityBounds.height / 2;

  const dx = targetX - centerX;
  const dy = targetY - centerY;

  const halfWidth = entityBounds.width / 2;
  const halfHeight = entityBounds.height / 2;

  const slope = Math.abs(dy / dx);
  const rectSlope = halfHeight / halfWidth;

  let intersectX, intersectY;

  if (slope <= rectSlope) {
    intersectX = dx > 0 ? centerX + halfWidth : centerX - halfWidth;
    intersectY = centerY + (dy / dx) * halfWidth * Math.sign(dx);
  } else {
    intersectY = dy > 0 ? centerY + halfHeight : centerY - halfHeight;
    intersectX = centerX + (dx / dy) * halfHeight * Math.sign(dy);
  }

  if (flowType) {
    const offset = getConnectionOffset(flowType);

    if (slope <= rectSlope) {
      intersectY += offset;
      intersectY = Math.max(
        entityBounds.y + 5,
        Math.min(entityBounds.y + entityBounds.height - 5, intersectY),
      );
    } else {
      intersectX += offset;
      intersectX = Math.max(
        entityBounds.x + 5,
        Math.min(entityBounds.x + entityBounds.width - 5, intersectX),
      );
    }
  }

  return { x: intersectX, y: intersectY };
}

function getConnectionOffset(flowType) {
  const offsets = {
    Material: -12,
    Financial: 0,
    Information: 12,
  };
  return offsets[flowType.flow_category] || 0;
}

function createCurvedPath(startPoint, endPoint) {
  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;

  const midX = (startPoint.x + endPoint.x) / 2;
  const midY = (startPoint.y + endPoint.y) / 2;

  const distance = Math.sqrt(dx * dx + dy * dy);
  const curvature = Math.min(distance * 0.1, 20);

  const controlX = midX + (Math.abs(dy) > Math.abs(dx) ? curvature : 0);
  const controlY = midY + (Math.abs(dx) > Math.abs(dy) ? curvature : 0);

  return `M${startPoint.x},${startPoint.y} Q${controlX},${controlY} ${endPoint.x},${endPoint.y}`;
}

// ============================================================================
// FORCE SIMULATION FUNCTIONS
// ============================================================================

function addEntityToSimulation(entityId, entity, x, y, width, height) {
  const node = { id: entityId, x, y, width, height, entity };

  const existingNodeIndex = nodes.findIndex((n) => n.id === entityId);
  if (existingNodeIndex >= 0) {
    nodes[existingNodeIndex] = node;
  } else {
    nodes.push(node);
  }

  if (forceSimulation) {
    forceSimulation.nodes(nodes);
    forceSimulation.alpha(0.3).restart();
  }
}

function addFlowToSimulation(flowId, entityId1, entityId2, flow) {
  const link = { id: flowId, source: entityId1, target: entityId2, flow };

  const existingLinkIndex = links.findIndex((l) => l.id === flowId);
  if (existingLinkIndex >= 0) {
    links[existingLinkIndex] = link;
  } else {
    links.push(link);
  }

  if (forceSimulation) {
    forceSimulation.force("link").links(links);
    forceSimulation.alpha(0.3).restart();
  }
}

function updateSimulation() {
  if (forceSimulation) {
    forceSimulation.nodes(nodes);
    forceSimulation.force("link").links(links);
    forceSimulation.alpha(0.3).restart();
  }
}

function initForceSimulation() {
  forceSimulation = d3
    .forceSimulation()
    .force("charge", d3.forceManyBody().strength(-50))
    .force(
      "link",
      d3
        .forceLink()
        .id((d) => d.id)
        .distance(100)
        .strength(0.1),
    )
    .force(
      "collision",
      d3.forceCollide().radius((d) => {
        return Math.sqrt(d.width * d.width + d.height * d.height) / 2 + 10;
      }),
    )
    .on("tick", updateEntityPositions);

  return forceSimulation;
}

function updateEntityPositions() {
  if (!resourcePooling.g) return;

  resourcePooling.g.selectAll(".entity").each(function () {
    const entityElement = d3.select(this);
    const entityId = entityElement.attr("id");
    const node = nodes.find((n) => n.id === entityId);

    if (node) {
      entityElement.attr("transform", `translate(${node.x}, ${node.y})`);
    }
  });

  updateAllFlowPaths();
}

function updateAllFlowPaths() {
  if (!resourcePooling.g) return;

  resourcePooling.g.selectAll(".flow").each(function () {
    const flowElement = d3.select(this);
    const flowId = flowElement.attr("id");
    const link = links.find((l) => l.id === flowId);

    if (link && link.source && link.target) {
      const sourceNode =
        typeof link.source === "object"
          ? link.source
          : nodes.find((n) => n.id === link.source);
      const targetNode =
        typeof link.target === "object"
          ? link.target
          : nodes.find((n) => n.id === link.target);

      if (sourceNode && targetNode) {
        updateFlowPath(flowElement, sourceNode, targetNode);
      }
    }
  });
}

function updateFlowPath(flowElement, sourceNode, targetNode) {
  const sourceBounds = {
    x: sourceNode.x,
    y: sourceNode.y,
    width: sourceNode.width || 150,
    height: sourceNode.height || 100,
    centerX: sourceNode.x + (sourceNode.width || 150) / 2,
    centerY: sourceNode.y + (sourceNode.height || 100) / 2,
  };

  const targetBounds = {
    x: targetNode.x,
    y: targetNode.y,
    width: targetNode.width || 150,
    height: targetNode.height || 100,
    centerX: targetNode.x + (targetNode.width || 150) / 2,
    centerY: targetNode.y + (targetNode.height || 100) / 2,
  };

  flowElement.selectAll(".flow-path, .flow-hover").each(function (d, i) {
    const pathElement = d3.select(this);
    const flowData = pathElement.datum();

    const flowType = flowData?.flowType || null;

    const startPoint = getEntityBorderPoint(
      sourceBounds,
      targetBounds.centerX,
      targetBounds.centerY,
      flowType,
      i,
    );
    const endPoint = getEntityBorderPoint(
      targetBounds,
      sourceBounds.centerX,
      sourceBounds.centerY,
      flowType,
      i,
    );

    const pathData = createCurvedPath(startPoint, endPoint);
    pathElement.attr("d", pathData);
  });
}

function updateLinkReferences(entityId) {
  const updatedNode = nodes.find((n) => n.id === entityId);
  if (!updatedNode) return;

  links.forEach((link) => {
    if (typeof link.source === "object" && link.source.id === entityId) {
      link.source = updatedNode;
    } else if (link.source === entityId) {
      link.source = updatedNode;
    }

    if (typeof link.target === "object" && link.target.id === entityId) {
      link.target = updatedNode;
    } else if (link.target === entityId) {
      link.target = updatedNode;
    }
  });

  if (forceSimulation) {
    forceSimulation.force("link").links(links);
    forceSimulation.nodes(nodes);
    forceSimulation.alpha(0.3).restart();
  }
}

// ============================================================================
// INITIALISATION AND CLEAR FUNCTIONS
// ============================================================================

function createResourcePooling() {
  const shadowRoot = document.querySelector("resource-pooling").shadowRoot;
  const resourcePoolingDiv = shadowRoot.getElementById("resource-pooling");
  const width = resourcePoolingDiv.clientWidth;
  const height = window.innerHeight * 0.6;

  resourcePooling.svg = d3
    .select(shadowRoot.getElementById("resource-pooling"))
    .append("svg")
    .attr("width", "100%")
    .style("width", width)
    .attr("height", height)
    .style("cursor", "crosshair");

  resourcePooling.g = resourcePooling.svg.append("g");

  resourcePooling.g.append("g").attr("class", "flows-group");
  resourcePooling.g.append("g").attr("class", "entities-group");

  setupZoomBehavior();
  resourcePooling.svg.append("defs");
  initForceSimulation();

  window.addEventListener("resize", () => {
    const newWidth = resourcePoolingDiv.clientWidth;
    const newHeight = window.innerHeight * 0.6;

    resourcePooling.svg.style("width", newWidth).attr("height", newHeight);
  });
}

function setupZoomBehavior() {
  const zoom = d3
    .zoom()
    .scaleExtent([0.1, 200])
    .on("zoom", (event) => {
      resourcePooling.g.attr("transform", event.transform);
    })
    .on("end", (event) => {
      resourcePooling.g.attr("transform", `${event.transform} translate(0, 0)`);
      requestAnimationFrame(() => {
        resourcePooling.g.attr("transform", event.transform);
      });
    });

  resourcePooling.svg.call(zoom);
}

function clearResourcePooling() {
  if (resourcePooling.g) {
    resourcePooling.g.selectAll(".entity").remove();
    resourcePooling.g.selectAll(".flow").remove();
    nodes = [];
    links = [];
    if (forceSimulation) {
      forceSimulation.nodes([]);
      forceSimulation.force("link").links([]);
    }
  }
}
