const ENTITY_COLOURS = {
  Consumer: {
    fill: "#fecaca", // red-200
    stroke: "#dc2626", // red-600
  },
  Producer: {
    fill: "#bbf7d0", // green-200
    stroke: "#16a34a", // green-600
  },
  Scavenger: {
    fill: "#bfdbfe", // blue-200
    stroke: "#2563eb", // blue-600
  },
  Decomposer: {
    fill: "#fef3c7", // yellow-200
    stroke: "#d97706", // yellow-600
  },
};

const CONFIG = {
  minWidth: 150,
  minHeight: 100,
  maxWidth: 600,
  maxHeight: 300,
  maxAspectRatio: 3, // width:height
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
};

let resourcePooling = {
  svg: null,
  g: null,
  initialised: false,
};

let messageDispatch = null;

let forceSimulation = null;

// EXPORTED FUNCTIONS

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

  if (!forceSimulation) {
    forceSimulation = d3
      .forceSimulation()
      .force("charge", d3.forceManyBody().strength(-1000))
      .force("center", d3.forceCenter(400, 300))
      .force("collision", d3.forceCollide().radius(100).strength(1))
      .alpha(0.3)
      .alphaDecay(0.02);
  }

  return null;
}

export function setDispatch(dispatch) {
  messageDispatch = dispatch;
  return null;
}

export function createEntity(entity, materials, x = null, y = null) {
  if (!resourcePooling.g) return;

  // Convert Gleam lists to JavaScript arrays using built-in toArray method
  const entityId = entity.entity_id;
  const valueActivities = entity.value_activities.toArray();
  const entityMaterials = entity.materials.toArray();
  const materialsArray = materials.toArray();

  // Calculate dimensions first for force simulation
  const { width, height } = calculateEntityDimensions(entity);

  // Create node data for force simulation
  const nodeData = {
    id: entityId,
    entity: entity,
    materials: materials,
    width: width,
    height: height,
    x: x || 50,
    y: y || 50,
    fx: x, // Fixed position if manually specified
    fy: y,
  };

  // Create entity group at initial position
  const entityGroup = resourcePooling.g
    .append("g")
    .attr("class", "entity")
    .attr("id", entityId)
    .attr("transform", `translate(${nodeData.x}, ${nodeData.y})`);

  const mainRect = entityGroup.append("rect").attr("class", "main-rect");
  const headerRect = entityGroup.append("rect").attr("class", "header-rect");

  const titleText = entityGroup
    .append("text")
    .attr("x", CONFIG.nameXPadding)
    .attr("y", CONFIG.nameHeight)
    .attr("text-anchor", "left")
    .style("font-size", CONFIG.nameFontSize)
    .style("font-weight", "bold")
    .style("fill", "#e5e7eb")
    .text(entity.name);

  const titleBBox = titleText.node().getBBox();
  const titleWidth = titleBBox.width + CONFIG.padding * 2 + CONFIG.nameXPadding;

  // Text created first, and bounding box created afterwards
  let activityElements = [];
  let materialElements = [];
  let maxActivityWidth = 0;
  let maxMaterialWidth = 0;

  // Create value activity badges and measure them
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

        const badge = entityGroup
          .append("g")
          .attr("class", "activity-badge")
          .attr(
            "transform",
            `translate(${CONFIG.padding + xOffset}, ${CONFIG.nameHeight + CONFIG.padding + 20 + rowInColumn * (CONFIG.badgeHeight + CONFIG.badgeSpacing)})`,
          );

        const text = badge
          .append("text")
          .attr("x", 0)
          .attr("y", CONFIG.badgeHeight / 2 + 4)
          .style("font-size", "12px")
          .style("fill", "#000000")
          .text(activity);

        const bbox = text.node().getBBox();
        const badgeWidth = bbox.width + 16;
        columnMaxWidth = Math.max(columnMaxWidth, badgeWidth);

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

        activityElements.push({ badge, width: badgeWidth, column: col });
      }
      columnWidths.push(columnMaxWidth);
    }
    maxActivityWidth =
      columnWidths.reduce((sum, w) => sum + w, 0) +
      (numColumns - 1) * CONFIG.columnGap;
  }

  // Create material elements and measure them
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

        const text = materialGroup
          .append("text")
          .attr("x", 10)
          .attr("y", 12)
          .style("font-size", "13px")
          .style("fill", "#374151")
          .text(material.name);

        const bbox = text.node().getBBox();
        const materialWidth = bbox.width + 25;
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

  // Calculate final dimensions
  const minWidthForTitle = Math.max(CONFIG.minWidth, titleWidth);
  const contentWidth =
    maxActivityWidth +
    maxMaterialWidth +
    (maxActivityWidth > 0 && maxMaterialWidth > 0 ? CONFIG.columnGap : 0);
  const finalWidth = Math.max(
    minWidthForTitle,
    contentWidth + CONFIG.padding * 2,
  );

  const numActivities = valueActivities.length;
  const numMaterials = entityMaterials.length;

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

  const finalHeight = Math.max(
    CONFIG.minHeight,
    CONFIG.nameHeight + CONFIG.padding * 2 + contentHeight + 20,
  );

  // Update nodeData with final dimensions
  nodeData.width = finalWidth;
  nodeData.height = finalHeight;

  // Now position materials based on calculated width
  materialElements.forEach(({ group }) => {
    const currentTransform = group.attr("transform");
    const yPos = currentTransform.match(/translate\(0, ([\d.]+)\)/)[1];
    group.attr(
      "transform",
      `translate(${CONFIG.padding + maxActivityWidth + CONFIG.columnGap}, ${yPos})`,
    );
  });

  const rect_colours = ENTITY_COLOURS[entity.entity_type];

  // Main rectangle
  mainRect
    .attr("width", finalWidth)
    .attr("height", finalHeight)
    .style("fill", rect_colours.fill)
    .style("stroke", rect_colours.stroke)
    .style("stroke-width", 1.5)
    .style("cursor", "move");

  headerRect
    .attr("width", finalWidth)
    .attr("height", CONFIG.nameHeight + 14)
    .style("fill", rect_colours.stroke)
    .style("cursor", "move");

  // Divider
  if (maxActivityWidth > 0 && maxMaterialWidth > 0) {
    const dividerX = CONFIG.padding + maxActivityWidth + CONFIG.columnGap / 2;
    const dividerStartY = CONFIG.nameHeight + 10;
    const dividerEndY = finalHeight;

    entityGroup
      .append("line")
      .attr("class", "content-divider")
      .attr("x1", dividerX)
      .attr("y1", dividerStartY)
      .attr("x2", dividerX)
      .attr("y2", dividerEndY)
      .style("stroke", rect_colours.stroke)
      .style("stroke-width", 2)
      .style("opacity", 0.5);
  }

  // Add to force simulation
  const currentNodes = forceSimulation.nodes();
  currentNodes.push(nodeData);

  forceSimulation
    .nodes(currentNodes)
    .force(
      "collision",
      d3.forceCollide().radius((d) => Math.max(d.width, d.height) / 2 + 20),
    )
    .alpha(0.3)
    .restart();

  // Add drag behavior with force simulation
  let dragStartX,
    dragStartY,
    initialX = nodeData.x,
    initialY = nodeData.y;

  entityGroup
    .call(
      d3
        .drag()
        .on("start", function (event) {
          if (!event.active) forceSimulation.alphaTarget(0.3).restart();

          dragStartX = event.x - initialX;
          dragStartY = event.y - initialY;

          nodeData.fx = nodeData.x;
          nodeData.fy = nodeData.y;
        })
        .on("drag", function (event) {
          // Calculate new position accounting for the initial click offset
          const newX = event.x - dragStartX;
          const newY = event.y - dragStartY;

          // Update the stored position
          initialX = newX;
          initialY = newY;

          // Update force simulation
          nodeData.fx = newX;
          nodeData.fy = newY;
        })
        .on("end", function (event) {
          if (!event.active) forceSimulation.alphaTarget(0);
        }),
    )
    .on("click", function (event) {
      event.stopPropagation();
      if (messageDispatch) {
        messageDispatch("entity_id:" + entityId);
      }
    });

  // Update positions on simulation tick
  forceSimulation.on("tick", function () {
    const nodes = forceSimulation.nodes();
    nodes.forEach((node) => {
      const entityGroup = resourcePooling.g.select(`#${node.id}`);
      if (!entityGroup.empty()) {
        entityGroup.attr("transform", `translate(${node.x}, ${node.y})`);
      }
    });
  });

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

  // Get current transform (position) of the entity
  const transform = existingEntity.attr("transform");
  const translateMatch = transform.match(/translate\(([^,]+),([^)]+)\)/);
  const currentX = translateMatch ? parseFloat(translateMatch[1]) : 0;
  const currentY = translateMatch ? parseFloat(translateMatch[2]) : 0;

  // Remove the existing entity
  existingEntity.remove();

  // Create the updated entity at the same position
  createEntity(entity, materials, currentX, currentY);
}

export function deleteEntity(entityId) {
  if (resourcePooling.g) {
    resourcePooling.g.select(`#${entityId}`).remove();
  }

  const currentNodes = forceSimulation.nodes().filter((n) => n.id !== entityId);
  forceSimulation.nodes(currentNodes);
  forceSimulation.alpha(0.3).restart();
}

export function updateMaterial(name, materialId) {
  if (!resourcePooling.g) return;

  // Find all entities that contain this material
  const allEntities = resourcePooling.g.selectAll(".entity");

  allEntities.each(function () {
    const entityGroup = d3.select(this);

    // Find material items within this entity that match the material ID
    const materialItems = entityGroup
      .selectAll(".material-item")
      .filter(function () {
        return d3.select(this).attr("data-material-id") === materialId;
      });

    materialItems.each(function () {
      const materialGroup = d3.select(this);
      const textElement = materialGroup.select("text");

      // Update the text with the new name
      textElement.text(name);

      // Recalculate the bounding box for proper spacing
      const bbox = textElement.node().getBBox();
      const newWidth = bbox.width + 25;
    });
  });
}

export function createFlow(flow) {
  if (!resourcePooling.g) return;

  const [entityId1, entityId2] = flow.entity_ids;

  dagreGraph.setEdge(entityId1, entityId2, {
    flow: flow,
  });

  relayoutGraph();
}

export function deleteFlow(flowId) {
  if (resourcePooling.g) {
    resourcePooling.g.select(`#${flowId}`).remove();
  }
}

// ENTITY HELPER FUNCTIONS

export function createEntityVisual(entity, materials, x, y) {
  if (!resourcePooling.g) return;

  // Convert Gleam lists to JavaScript arrays using built-in toArray method
  const entityId = entity.entity_id;
  const valueActivities = entity.value_activities.toArray();
  const entityMaterials = entity.materials.toArray();
  const materialsArray = materials.toArray();

  // Create entity group
  const entityGroup = resourcePooling.g
    .append("g")
    .attr("class", "entity")
    .attr("id", entityId)
    .attr("transform", `translate(${x}, ${y})`);

  const mainRect = entityGroup.append("rect").attr("class", "main-rect");
  const headerRect = entityGroup.append("rect").attr("class", "header-rect");

  const titleText = entityGroup
    .append("text")
    .attr("x", CONFIG.nameXPadding)
    .attr("y", CONFIG.nameHeight)
    .attr("text-anchor", "left")
    .style("font-size", CONFIG.nameFontSize)
    .style("font-weight", "bold")
    .style("fill", "#e5e7eb")
    .text(entity.name);

  const titleBBox = titleText.node().getBBox();
  const titleWidth = titleBBox.width + CONFIG.padding * 2 + CONFIG.nameXPadding;

  // Text created first, and bounding box created afterwards
  let activityElements = [];
  let materialElements = [];
  let maxActivityWidth = 0;
  let maxMaterialWidth = 0;

  // Entity name at the top

  // Create value activity badges and measure them
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

        const badge = entityGroup
          .append("g")
          .attr("class", "activity-badge")
          .attr(
            "transform",
            `translate(${CONFIG.padding + xOffset}, ${CONFIG.nameHeight + CONFIG.padding + 20 + rowInColumn * (CONFIG.badgeHeight + CONFIG.badgeSpacing)})`,
          );

        const text = badge
          .append("text")
          .attr("x", 0)
          .attr("y", CONFIG.badgeHeight / 2 + 4)
          .style("font-size", "12px")
          .style("fill", "#000000")
          .text(activity);

        const bbox = text.node().getBBox();
        const badgeWidth = bbox.width + 16;
        columnMaxWidth = Math.max(columnMaxWidth, badgeWidth);

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

        activityElements.push({ badge, width: badgeWidth, column: col });
      }
      columnWidths.push(columnMaxWidth);
    }
    maxActivityWidth =
      columnWidths.reduce((sum, w) => sum + w, 0) +
      (numColumns - 1) * CONFIG.columnGap;
  }

  // Create material elements and measure them
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

        const text = materialGroup
          .append("text")
          .attr("x", 10)
          .attr("y", 12)
          .style("font-size", "13px")
          .style("fill", "#374151")
          .text(material.name);

        const bbox = text.node().getBBox();
        const materialWidth = bbox.width + 25;
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

  // Calculate final dimensions
  const minWidthForTitle = Math.max(CONFIG.minWidth, titleWidth);
  const contentWidth =
    maxActivityWidth +
    maxMaterialWidth +
    (maxActivityWidth > 0 && maxMaterialWidth > 0 ? CONFIG.columnGap : 0);
  const width = Math.max(minWidthForTitle, contentWidth + CONFIG.padding * 2);

  const numActivities = valueActivities.length;
  const numMaterials = entityMaterials.length;

  const maxActivityRows = Math.min(
    CONFIG.itemsPerActivityColumn,
    numActivities,
  ); // Max 5 rows for activities
  const maxMaterialRows = Math.min(CONFIG.itemsPerMaterialColumn, numMaterials); // Max 5 rows for materials

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

  // Now position materials based on calculated width
  materialElements.forEach(({ group }) => {
    const currentTransform = group.attr("transform");
    const yPos = currentTransform.match(/translate\(0, ([\d.]+)\)/)[1];
    group.attr(
      "transform",
      `translate(${CONFIG.padding + maxActivityWidth + CONFIG.columnGap}, ${yPos})`,
    );
  });

  const rect_colours = ENTITY_COLOURS[entity.entity_type];

  // Main rectangle
  mainRect
    .attr("width", width)
    .attr("height", height)
    .style("fill", rect_colours.fill)
    .style("stroke", rect_colours.stroke)
    .style("stroke-width", 1.5)
    .style("cursor", "move");

  headerRect
    .attr("width", width)
    .attr("height", CONFIG.nameHeight + 14)
    .style("fill", rect_colours.stroke)
    .style("cursor", "move");

  // Divider
  if (maxActivityWidth > 0 && maxMaterialWidth > 0) {
    const dividerX = CONFIG.padding + maxActivityWidth + CONFIG.columnGap / 2;
    const dividerStartY = CONFIG.nameHeight + 10;
    const dividerEndY = height;

    entityGroup
      .append("line")
      .attr("class", "content-divider")
      .attr("x1", dividerX)
      .attr("y1", dividerStartY)
      .attr("x2", dividerX)
      .attr("y2", dividerEndY)
      .style("stroke", rect_colours.stroke)
      .style("stroke-width", 2)
      .style("opacity", 0.5);
  }

  // Add drag behavior with proper offset handling
  let dragStartX,
    dragStartY,
    initialX = x,
    initialY = y;

  entityGroup.call(
    d3
      .drag()
      .on("start", function (event, d) {
        if (!event.active) forceSimulation.alphaTarget(0.3).restart();

        // Find node in simulation
        const nodes = forceSimulation.nodes();
        const node = nodes.find((n) => n.id === entity.entity_id);
        if (node) {
          node.fx = node.x;
          node.fy = node.y;
        }
      })
      .on("drag", function (event, d) {
        const nodes = forceSimulation.nodes();
        const node = nodes.find((n) => n.id === entity.entity_id);
        if (node) {
          node.fx = event.x;
          node.fy = event.y;
        }
      })
      .on("end", function (event, d) {
        if (!event.active) forceSimulation.alphaTarget(0);

        // Optionally release the node to move freely again
        // const nodes = forceSimulation.nodes();
        // const node = nodes.find(n => n.id === entity.entity_id);
        // if (node) {
        //   node.fx = null;
        //   node.fy = null;
        // }
      }),
  );

  entityGroup.on("click", function (event) {
    event.stopPropagation();

    if (messageDispatch) {
      messageDispatch("entity_id:" + entityId);
    }
  });

  return entityGroup;
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
    x: x,
    y: y,
    width: width,
    height: height,
    centerX: x + width / 2,
    centerY: y + height / 2,
    right: x + width,
    bottom: y + height,
  };
}

function newEntityPlacement(margin = 40) {
  if (!resourcePooling.g) return { x: 100, y: 100 };

  const existingEntities = resourcePooling.g.selectAll(".entity");

  if (existingEntities.empty()) {
    return { x: 100, y: 100 };
  }

  // Calculate bounding box of all existing entities
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

    // Update bounding box
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x + width);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y + height);

    // For averaging positions
    avgX += x;
    avgY += y;
    count++;
  });

  // Calculate aspect ratio of the existing entities group
  const groupWidth = maxX - minX;
  const groupHeight = maxY - minY;
  const groupAspectRatio = groupWidth / groupHeight;

  // Threshold for deciding placement direction
  const isGroupWide = groupAspectRatio > 1.5; // Adjust threshold as needed

  if (isGroupWide) {
    // Group is wide: place new entity below
    return {
      x: avgX / count, // Average X position of existing entities
      y: maxY + margin, // Below the bottom of the group
    };
  } else {
    // Group is tall: place new entity to the right
    return {
      x: maxX + margin, // To the right of the group
      y: avgY / count, // Average Y position of existing entities
    };
  }
}

function calculateEntityDimensions(entity) {
  const valueActivities = entity.value_activities.toArray();
  const entityMaterials = entity.materials.toArray();

  // Calculate based on content (same logic as your current createEntity)
  const numActivities = valueActivities.length;
  const numMaterials = entityMaterials.length;

  const activitiesWidth = Math.ceil(numActivities / 3) * 120;
  const materialsWidth = Math.ceil(numMaterials / 5) * 100;
  const contentWidth =
    activitiesWidth +
    materialsWidth +
    (activitiesWidth > 0 && materialsWidth > 0 ? 20 : 0);

  const width = Math.max(CONFIG.minWidth, contentWidth + CONFIG.padding * 2);
  const height = Math.max(
    CONFIG.minHeight,
    CONFIG.nameHeight +
      CONFIG.padding * 2 +
      Math.max(
        Math.ceil(numActivities / 3) * 30,
        Math.ceil(numMaterials / 5) * 18,
      ) +
      20,
  );

  return { width, height };
}

// FLOW FUNCTIONS

function createFlowVisuals(flow, edgeId) {
  const edge = dagreGraph.edge(edgeId);
  const sourceNode = dagreGraph.node(edgeId.v);
  const targetNode = dagreGraph.node(edgeId.w);

  // Get Dagre edge points (if any)
  const points = edge.points || [
    { x: sourceNode.x, y: sourceNode.y },
    { x: targetNode.x, y: targetNode.y },
  ];

  const flowTypes = flow.flow_types.toArray();
  const numFlows = flowTypes.length;

  // Calculate offset for multiple flows
  const baseOffset = 10; // pixels between flows
  const totalOffset = (numFlows - 1) * baseOffset;
  const startOffset = -totalOffset / 2;

  const flowGroup = resourcePooling.g
    .append("g")
    .attr("class", "flow")
    .attr("id", flow.flow_id);

  flowTypes.forEach((flowType, index) => {
    const offset = startOffset + index * baseOffset;
    createSingleFlowPath(flowGroup, points, flowType, offset);
  });
}

function createSingleFlowPath(flowGroup, points, flowType, offset) {
  const FLOW_COLORS = {
    Material: "#16a34a",
    Financial: "#dc2626",
    Information: "#2563eb",
  };

  // Create offset path
  const offsetPoints = points.map((point, i) => {
    if (i === 0 || i === points.length - 1) {
      return point; // Don't offset start/end points
    }

    // Offset middle points perpendicular to the direction
    const prevPoint = points[i - 1];
    const nextPoint = points[i + 1] || point;

    // Calculate perpendicular offset
    const dx = nextPoint.x - prevPoint.x;
    const dy = nextPoint.y - prevPoint.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length === 0) return point;

    const perpX = (-dy / length) * offset;
    const perpY = (dx / length) * offset;

    return {
      x: point.x + perpX,
      y: point.y + perpY,
    };
  });

  // Create path from offset points
  let pathData = `M${offsetPoints[0].x},${offsetPoints[0].y}`;
  for (let i = 1; i < offsetPoints.length; i++) {
    pathData += `L${offsetPoints[i].x},${offsetPoints[i].y}`;
  }

  const flowPath = flowGroup
    .append("path")
    .attr("class", "flow-path")
    .attr("d", pathData)
    .style("fill", "none")
    .style("stroke", FLOW_COLORS[flowType.flow_category] || "#666")
    .style("stroke-width", 2)
    .style("opacity", flowType.is_future ? 0.5 : 1)
    .style("stroke-dasharray", flowType.is_future ? "5,5" : "none");

  // Add arrows (your existing arrow code)
}

// LAYOUT

function updateEntityPositions() {
  const nodes = forceSimulation.nodes();

  nodes.forEach((nodeData) => {
    const entityGroup = resourcePooling.g.select(`#${nodeData.id}`);
    if (!entityGroup.empty()) {
      entityGroup.attr("transform", `translate(${nodeData.x}, ${nodeData.y})`);
    }
  });
}

// INITIALIZATION FUNCTIONS

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
    .attr("height", height);

  // Create a group for all map elements to allow zoom
  resourcePooling.g = resourcePooling.svg.append("g");
  resourcePooling.svg.style("cursor", "crosshair");

  const zoom = d3
    .zoom()
    .scaleExtent([0.1, 200])
    .on("zoom", (event) => {
      resourcePooling.g.attr("transform", event.transform);
    })
    .on("end", (event) => {
      // Force re-render by slightly modifying and restoring the transform
      resourcePooling.g.attr("transform", `${event.transform} translate(0, 0)`);
      // Use requestAnimationFrame to restore the original transform
      requestAnimationFrame(() => {
        resourcePooling.g.attr("transform", event.transform);
      });
    });

  resourcePooling.svg.call(zoom);

  resourcePooling.svg.append("defs");
}
