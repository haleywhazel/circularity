// ============================================================================
// CONSTANTS AND CONFIGURATION
// ============================================================================

const CONFIG = {
  nodeRadius: 1.5,
  mapHeight: 0.6, // 60% of window height
  animationDuration: 150,
  pathAnimationDuration: 150,
  hoverDuration: 200,
  bundleBeta: 0.9,
  alphaDecay: 0.1,
  chargeStrength: 0.1,
  linkStrength: 0.1,
  chargeDistanceMax: 100,
  linkDistance: 1,
  pathOffset: 5,
  hoverStrokeWidth: 2.5,
  arrowSize: 3,
};

const SCALES = {
  pathThickness: d3.scaleLinear().range([0.4, 2]),
  segments: d3.scaleLinear().domain([0, 500]).range([1, 8]),
};

const COLORS = {
  node: "#1f2937",
  nodeStroke: "#ffffff",
  tempNode: "#6b7280",
  path: "#4b5563",
  country: "#9ca3af",
  countryStroke: "#f3f4f6",
  text: "#1f2937",
  legendBackground: "rgba(255, 255, 255, 0.5)",
  labelBackground: "rgba(255, 255, 255, 0)",
  labelBackgroundHover: "rgba(255, 255, 255, 0.5)",
  labelBackgroundDrag: "rgba(255, 255, 255, 0.8)",
};

const STYLES = {
  fontFamily: "Arial, sans-serif",
  fontSize: "4px",
  strokeWidth: {
    node: 0.5,
    country: 0.25,
  },
};

// ============================================================================
// GLOBAL STATE
// ============================================================================

let flowMap = {
  svg: null,
  g: null,
  countries: null,
  nodesList: null,
  pathsList: null,
  projection: null,
  tempNode: null,
  forceLayout: null,
  initialised: false,
  unitSymbol: "",
  unitLocation: "",
  bundleData: { nodes: [], links: [], paths: [] },
};

let messageDispatch = null;

// ============================================================================
// PUBLIC API FUNCTIONS
// ============================================================================

export function initFlowMap() {
  if (flowMap.initialised) return null;

  requestAnimationFrame(() => {
    const flowMapElement = document.querySelector("flow-map");
    const isHidden = flowMapElement.closest(".hidden") !== null;

    if (isHidden) {
      initFlowMap();
      return;
    }

    const element = flowMapElement.shadowRoot?.getElementById("flow-map");
    if (element) {
      createMap();
      flowMap.initialised = true;
    } else {
      initFlowMap();
    }
  });

  return null;
}

export function setDispatch(dispatch) {
  messageDispatch = dispatch;
  return null;
}

export function addNode(nodeId, lat, lon, nodeLabel) {
  if (!isMapReady()) {
    requestAnimationFrame(() => addNode(nodeId, lat, lon, nodeLabel));
    return null;
  }

  removeTempNode();
  removeExistingNode(nodeId);

  const [x, y] = flowMap.projection([lon, lat]);
  const nodeGroup = createNodeGroup(nodeId, x, y);

  setupNodeVisuals(nodeGroup, nodeLabel);
  setupNodeInteraction(nodeGroup, nodeId);
  animateNodeIn(nodeGroup);

  return null;
}

export function editNode(nodeId, lat, lon, nodeLabel) {
  if (!isMapReady()) {
    requestAnimationFrame(() => editNode(nodeId, lat, lon, nodeLabel));
    return null;
  }

  removeTempNode();

  const existingNode = flowMap.nodesList?.select(`#${nodeId}`);
  if (!existingNode || existingNode.empty()) {
    console.warn(`Node with id ${nodeId} not found`);
    return null;
  }

  const [x, y] = flowMap.projection([lon, lat]);
  updateNodePosition(existingNode, x, y);
  updateNodeLabel(existingNode, nodeLabel);
  updatePathsForNode(nodeId, lat, lon);

  return null;
}

export function deleteNode(nodeId) {
  if (!flowMap.initialised || !flowMap.nodesList) {
    console.warn("Cannot delete node: map not initialised or no nodes exist");
    return null;
  }

  const existingNode = flowMap.nodesList.select(`#${nodeId}`);
  if (!existingNode || existingNode.empty()) {
    console.warn(`Node with id ${nodeId} not found`);
    return null;
  }

  const connectedPaths = flowMap.bundleData.paths.filter(
    (path) => path.source.id === nodeId || path.target.id === nodeId,
  );

  connectedPaths.forEach((path) => {
    removeBundleData(path.id);
    const pathElement = flowMap.pathsList?.select(`#${path.id}`);
    if (pathElement && !pathElement.empty()) {
      pathElement.remove();
    }
    const hoverElement = flowMap.pathsList?.select(
      `path.flow-hover[data-path-id="${path.id}"]`,
    );
    if (hoverElement && !hoverElement.empty()) {
      hoverElement.remove();
    }
  });

  if (flowMap.bundleData.paths.length > 0) {
    regenerateBundling();
  }

  animateNodeOut(existingNode);
  return null;
}

export function addPath(pathId, originNodeId, destinationNodeId, value) {
  if (!isPathCreationReady()) {
    requestAnimationFrame(() =>
      addPath(pathId, originNodeId, destinationNodeId, value),
    );
    return null;
  }

  removeTempNode();

  const { originCoords, destinationCoords } = getNodeCoordinates(
    originNodeId,
    destinationNodeId,
  );
  if (!originCoords || !destinationCoords) {
    console.warn(
      `Cannot create path: nodes ${originNodeId} or ${destinationNodeId} not found`,
    );
    return null;
  }

  ensurePathsGroup();
  removeExistingPath(pathId);
  addToBundleData(
    pathId,
    originCoords,
    destinationCoords,
    originNodeId,
    destinationNodeId,
    value,
  );
  regenerateBundling();

  return null;
}

export function editPath(pathId, originNodeId, destinationNodeId, value) {
  if (!isPathCreationReady()) return null;

  removeTempNode();

  const { originCoords, destinationCoords } = getNodeCoordinates(
    originNodeId,
    destinationNodeId,
  );
  if (!originCoords || !destinationCoords) {
    console.warn(
      `Cannot edit path: nodes ${originNodeId} or ${destinationNodeId} not found`,
    );
    return null;
  }

  updateBundleDataPath(
    pathId,
    originCoords,
    destinationCoords,
    originNodeId,
    destinationNodeId,
    value,
  );
  regenerateBundling();

  return null;
}

export function deletePath(pathId) {
  if (!flowMap.initialised || !flowMap.pathsList) {
    console.warn("Cannot delete path: map not initialised or no paths exist");
    return null;
  }

  removeTempNode();

  const existingPath = flowMap.pathsList.select(`#${pathId}`);
  if (!existingPath.empty()) {
    animatePathOut(existingPath);

    const hoverPath = flowMap.pathsList
      .selectAll("path.flow-hover")
      .filter((d) => d.id === pathId);
    if (!hoverPath.empty()) {
      hoverPath.remove();
    }

    removeBundleData(pathId);
    regenerateBundling();
  } else {
    console.warn(`Path with id ${pathId} not found`);
  }

  return null;
}

export function removeTempNode() {
  if (flowMap.tempNode) {
    flowMap.tempNode.remove();
    flowMap.tempNode = null;
  }
}

export function showTempNodeAtCoords(lat, lon) {
  if (!flowMap.projection) {
    requestAnimationFrame(() => showTempNodeAtCoords(lat, lon));
    return null;
  }

  removeTempNode();

  const [x, y] = flowMap.projection([lon, lat]);
  createTempNode(x, y);

  return null;
}

export function downloadModelData(gleamJsonData) {
  const gleamState = JSON.parse(gleamJsonData);

  const d3State = {
    nodes: [],
    paths: [],
  };

  if (flowMap.nodesList) {
    flowMap.nodesList.selectAll(".node").each(function () {
      const nodeElement = d3.select(this);
      const nodeId = nodeElement.attr("id");
      const transform = nodeElement.attr("transform");
      const match = transform.match(/translate\(([^,]+),([^)]+)\)/);

      if (match && flowMap.projection) {
        const x = parseFloat(match[1]);
        const y = parseFloat(match[2]);
        const [lon, lat] = flowMap.projection.invert([x, y]);

        const labelGroup = nodeElement.select(".label-group");
        const labelText = labelGroup.select("text");
        const labelDx = parseFloat(labelText.attr("dx")) || 0;
        const labelDy = parseFloat(labelText.attr("dy")) || -6;

        d3State.nodes.push({
          id: nodeId,
          lat: lat,
          lon: lon,
          x: x,
          y: y,
          labelDx: labelDx,
          labelDy: labelDy,
        });
      }
    });
  }

  if (flowMap.pathsList) {
    flowMap.pathsList.selectAll(".flow").each(function () {
      const pathElement = d3.select(this);
      const pathId = pathElement.attr("id");

      d3State.paths.push({
        id: pathId,
      });
    });
  }

  const combinedData = {
    gleam_state: gleamState,
    d3_state: d3State,
  };

  const jsonData = JSON.stringify(combinedData, null, 2);
  const blob = new Blob([jsonData], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `flow-map-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function setupFileImport(dispatch) {
  requestAnimationFrame(() => {
    const shadowRoot = document.querySelector("flow-map").shadowRoot;
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

    const fileLabel = shadowRoot.querySelector('label[for="import-file"]');
    if (fileLabel) {
      fileLabel.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          fileInput.click();
        }
      });
    }
  });
}

export function setUnits(unitSymbol, unitLocation) {
  flowMap.unitSymbol = unitSymbol;
  flowMap.unitLocation = unitLocation;

  createLegend();
}

export function restoreD3State(nodes, paths, unitSymbol, unitLocation) {
  const d3State = window.pendingD3State;

  clearFlowMap();

  nodes.toArray().forEach((node) => {
    const nodeState = d3State?.nodes.find((n) => n.id === node.node_id);
    addNode(node.node_id, node.lat, node.lon, node.node_label);

    if (nodeState && (nodeState.labelDx !== 0 || nodeState.labelDy !== -6)) {
      requestAnimationFrame(() => {
        const nodeElement = flowMap.nodesList.select(`#${node.node_id}`);
        if (!nodeElement.empty()) {
          const labelGroup = nodeElement.select(".label-group");
          const labelText = labelGroup.select("text");
          const rect = labelGroup.select("rect");

          labelText.attr("dx", nodeState.labelDx).attr("dy", nodeState.labelDy);

          if (!rect.empty()) {
            const bbox = labelText.node().getBBox();
            rect
              .attr("x", bbox.x - 1)
              .attr("y", bbox.y - 1)
              .attr("width", bbox.width + 2)
              .attr("height", bbox.height + 2);
          }
        }
      });
    }
  });

  paths.toArray().forEach((path) => {
    addPath(
      path.path_id,
      path.origin_node_id,
      path.destination_node_id,
      path.value,
    );
  });

  setUnits(unitSymbol, unitLocation);

  if (window.pendingD3State) {
    delete window.pendingD3State;
  }
}

export function exportMapAsPNG() {
  if (!flowMap.svg || !flowMap.initialised) {
    console.warn("Map not ready for export");
    return null;
  }

  const svgNode = flowMap.svg.node();
  const clonedSvg = svgNode.cloneNode(true);

  const currentTransform = flowMap.g.attr("transform");

  const clonedGroup = clonedSvg.querySelector("g");
  if (clonedGroup && currentTransform) {
    clonedGroup.setAttribute("transform", currentTransform);
  }

  const bbox = flowMap.g.node().getBBox();

  const padding = 40;
  const width = bbox.width + padding * 2;
  const height = bbox.height + padding * 2;

  clonedSvg.setAttribute(
    "viewBox",
    `${bbox.x - padding} ${bbox.y - padding} ${width} ${height}`,
  );

  clonedSvg.setAttribute("width", width);
  clonedSvg.setAttribute("height", height);

  // Add white background
  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect.setAttribute("x", bbox.x - padding);
  rect.setAttribute("y", bbox.y - padding);
  rect.setAttribute("width", width);
  rect.setAttribute("height", height);
  rect.setAttribute("fill", "white");
  clonedGroup.insertBefore(rect, clonedGroup.firstChild);

  clonedSvg.style.cursor = "default";

  if (!clonedSvg.getAttribute("xmlns")) {
    clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  }

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clonedSvg);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const scale = 15;
  canvas.width = width * scale;
  canvas.height = height * scale;

  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const img = new Image();
  const svgBlob = new Blob([svgString], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(svgBlob);

  img.onload = function () {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(function (blob) {
      const pngUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = pngUrl;
      link.download = `flow-map-${new Date().toISOString().slice(0, 10)}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(pngUrl);
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  img.src = url;

  return null;
}

// ============================================================================
// NODE MANAGEMENT FUNCTIONS
// ============================================================================

function createNodeGroup(nodeId, x, y) {
  ensureNodesGroup();

  return flowMap.nodesList
    .append("g")
    .attr("class", "node")
    .attr("id", nodeId)
    .attr("transform", `translate(${x}, ${y})`);
}

function setupNodeVisuals(nodeGroup, nodeLabel) {
  createNodeCircle(nodeGroup);
  createNodeLabel(nodeGroup, nodeLabel);
}

function createNodeCircle(nodeGroup) {
  nodeGroup
    .append("circle")
    .attr("r", CONFIG.nodeRadius)
    .attr("stroke", COLORS.nodeStroke)
    .attr("stroke-width", STYLES.strokeWidth.node)
    .attr("fill", COLORS.node)
    .style("cursor", "pointer");
}

function createNodeLabel(nodeGroup, nodeLabel) {
  const labelGroup = nodeGroup.append("g").attr("class", "label-group");

  const labelText = labelGroup
    .append("text")
    .attr("dy", -6)
    .attr("text-anchor", "middle")
    .style("font-size", STYLES.fontSize)
    .style("font-family", STYLES.fontFamily)
    .style("fill", COLORS.text)
    .style("cursor", "pointer")
    .text(nodeLabel);

  if (nodeLabel && nodeLabel.trim() !== "") {
    createLabelBackground(labelGroup, labelText);
  }

  setupLabelDragBehavior(labelGroup, labelText);
}

function createLabelBackground(labelGroup, labelText) {
  const bbox = labelText.node().getBBox();
  const rect = labelGroup
    .insert("rect", "text")
    .attr("x", bbox.x - 1)
    .attr("y", bbox.y - 1)
    .attr("width", bbox.width + 2)
    .attr("height", bbox.height + 2)
    .attr("fill", COLORS.labelBackground)
    .attr("rx", 2)
    .style("cursor", "move");

  return rect;
}

function setupNodeInteraction(nodeGroup, nodeId) {
  nodeGroup
    .on("mouseover", function () {
      animateNodeHover(d3.select(this), true);
    })
    .on("mouseout", function () {
      animateNodeHover(d3.select(this), false);
    })
    .on("mousedown", function (event) {
      if (event.target.tagName === "circle") {
        event.stopPropagation();
        if (messageDispatch) {
          messageDispatch("node_id:" + nodeId);
        }
      }
    });
}

function setupLabelDragBehavior(labelGroup, labelText) {
  const nodeId = labelGroup.node().parentNode.id;
  const drag = createLabelDragBehavior(nodeId);

  labelText.call(drag);
  const rect = labelGroup.select("rect");
  if (!rect.empty()) {
    rect.call(drag);
  }
}

function animateNodeHover(nodeGroup, isHover) {
  const scale = isHover ? 2 : 1;
  const opacity = isHover ? 0.5 : 0;

  nodeGroup
    .select("circle")
    .transition()
    .duration(CONFIG.hoverDuration)
    .attr("r", CONFIG.nodeRadius * scale);

  nodeGroup
    .select(".label-group rect")
    .transition()
    .duration(CONFIG.hoverDuration)
    .attr(
      "fill",
      isHover ? COLORS.labelBackgroundHover : COLORS.labelBackground,
    );
}

function animateNodeIn(nodeGroup) {
  nodeGroup
    .style("opacity", 0)
    .transition()
    .duration(CONFIG.animationDuration)
    .style("opacity", 1);
}

function animateNodeOut(nodeGroup) {
  nodeGroup
    .transition()
    .duration(CONFIG.animationDuration)
    .style("opacity", 0)
    .remove();
}

function updateNodePosition(existingNode, x, y) {
  existingNode
    .transition()
    .duration(CONFIG.animationDuration)
    .attr("transform", `translate(${x}, ${y})`);
}

function updateNodeLabel(existingNode, nodeLabel) {
  const labelGroup = existingNode.select(".label-group");
  const labelText = labelGroup.select("text");
  const currentDx = parseFloat(labelText.attr("dx")) || 0;
  const currentDy = parseFloat(labelText.attr("dy")) || -6;

  labelText.text(nodeLabel).attr("dx", currentDx).attr("dy", currentDy);

  updateLabelBackground(labelGroup, labelText, nodeLabel);
  updateLabelDragBehavior(labelGroup, labelText);
}

function updateLabelBackground(labelGroup, labelText, nodeLabel) {
  let rectElement = labelGroup.select("rect");

  if (nodeLabel && nodeLabel.trim() !== "") {
    const bbox = labelText.node().getBBox();

    if (rectElement.empty()) {
      rectElement = createLabelBackground(labelGroup, labelText);
      const nodeId = labelGroup.node().parentNode.id;
      const dragBehavior = createLabelDragBehavior(nodeId);
      rectElement.call(dragBehavior);
    }

    rectElement
      .attr("x", bbox.x - 1)
      .attr("y", bbox.y - 1)
      .attr("width", bbox.width + 2)
      .attr("height", bbox.height + 2);
  } else if (!rectElement.empty()) {
    rectElement.remove();
  }
}

function updateLabelDragBehavior(labelGroup, labelText) {
  const nodeId = labelGroup.node().parentNode.id;

  if (!labelText.node().__on) {
    const dragBehavior = createLabelDragBehavior(nodeId);
    labelText.call(dragBehavior);

    const rectElement = labelGroup.select("rect");
    if (!rectElement.empty()) {
      rectElement.call(dragBehavior);
    }
  }
}

function createLabelDragBehavior(nodeId) {
  return d3
    .drag()
    .on("start", function (event) {
      event.sourceEvent.stopPropagation();
      d3.select(this.parentNode)
        .select("rect")
        .transition()
        .duration(100)
        .attr("fill", COLORS.labelBackgroundDrag);
    })
    .on("drag", function (event) {
      const labelGroup = d3.select(this.parentNode);
      const textElement = labelGroup.select("text");
      const rectElement = labelGroup.select("rect");

      textElement.attr("dx", event.x).attr("dy", event.y);

      if (!rectElement.empty()) {
        const bbox = textElement.node().getBBox();
        rectElement
          .attr("x", bbox.x - 1)
          .attr("y", bbox.y - 1)
          .attr("width", bbox.width + 2)
          .attr("height", bbox.height + 2);
      }
    })
    .on("end", function (event) {
      d3.select(this.parentNode)
        .select("rect")
        .transition()
        .duration(100)
        .attr("fill", COLORS.labelBackground);

      const textElement = d3.select(this);
      const dx = parseFloat(textElement.attr("dx")) || 0;
      const dy = parseFloat(textElement.attr("dy")) || -6;

      if (messageDispatch) {
        messageDispatch(`label_moved:${nodeId}:${dx}:${dy}`);
      }
    });
}

function createTempNode(mouseX, mouseY) {
  ensureNodesGroup();

  flowMap.tempNode = flowMap.nodesList
    .append("circle")
    .attr("cx", mouseX)
    .attr("cy", mouseY)
    .attr("r", CONFIG.nodeRadius)
    .attr("fill", COLORS.tempNode)
    .attr("stroke", COLORS.nodeStroke)
    .attr("stroke-width", STYLES.strokeWidth.node)
    .attr("opacity", 0.7);
}

// ============================================================================
// PATH MANAGEMENT FUNCTIONS
// ============================================================================

function createPathElements() {
  const line = d3
    .line()
    .curve(d3.curveCatmullRom.alpha(1))
    .x((d) => d.x)
    .y((d) => d.y);

  clearExistingPaths();

  const hoverAreas = createHoverAreas(line);
  const visiblePaths = createVisiblePaths(line);

  return { hoverAreas, visiblePaths, line };
}

function clearExistingPaths() {
  flowMap.pathsList.selectAll("path.flow").remove();
  flowMap.pathsList.selectAll("path.flow-hover").remove();
}

function createHoverAreas(line) {
  return flowMap.pathsList
    .selectAll("path.flow-hover")
    .data(flowMap.bundleData.paths)
    .enter()
    .append("path")
    .attr("d", (d) => line(d.segments))
    .attr("class", "flow-hover")
    .attr("fill", "none")
    .attr("data-path-id", (d) => d.id)
    .attr("stroke", "transparent")
    .attr("stroke-width", CONFIG.hoverStrokeWidth)
    .style("cursor", "pointer")
    .on("mouseover", handlePathHover)
    .on("mouseout", handlePathUnhover)
    .on("click", handlePathClick);
}

function createVisiblePaths(line) {
  return flowMap.pathsList
    .selectAll("path.flow")
    .data(flowMap.bundleData.paths)
    .enter()
    .append("path")
    .attr("d", (d) => line(d.segments))
    .attr("class", "flow")
    .attr("id", (d) => d.id)
    .attr("fill", "none")
    .attr("stroke", COLORS.path)
    .attr("stroke-width", (d) => SCALES.pathThickness(d.value))
    .attr("marker-mid", "url(#arrowhead)")
    .style("pointer-events", "none");
}

function handlePathHover(event, d) {
  flowMap.pathsList
    .select(`path.flow#${d.id}`)
    .transition()
    .duration(CONFIG.hoverDuration)
    .attr("stroke-width", SCALES.pathThickness(d.value) + 1);
}

function handlePathUnhover(event, d) {
  flowMap.pathsList
    .select(`path.flow#${d.id}`)
    .transition()
    .duration(CONFIG.hoverDuration)
    .attr("stroke-width", SCALES.pathThickness(d.value));
}

function handlePathClick(event, d) {
  event.stopPropagation();
  removeTempNode();

  if (messageDispatch) {
    messageDispatch("path_id:" + d.id);
  }
}

function animatePathsIn(visiblePaths) {
  const pathLengths = visiblePaths.nodes().map((node) => node.getTotalLength());

  visiblePaths
    .attr("stroke-dasharray", (d, i) => `${pathLengths[i]} ${pathLengths[i]}`)
    .attr("stroke-dashoffset", (d, i) => pathLengths[i])
    .transition()
    .duration(CONFIG.pathAnimationDuration)
    .attr("stroke-dashoffset", 0)
    .on("end", function () {
      d3.select(this).attr("stroke-dasharray", "none");
    });
}

function animatePathOut(pathElement) {
  pathElement
    .transition()
    .duration(CONFIG.animationDuration)
    .style("opacity", 0)
    .remove();
}

// ============================================================================
// BUNDLE DATA MANAGEMENT FUNCTIONS
// ============================================================================

function addToBundleData(
  pathId,
  originCoords,
  destinationCoords,
  fromNodeId,
  toNodeId,
  value,
) {
  const pathData = {
    id: pathId,
    source: {
      ...originCoords,
      id: fromNodeId,
      fx: originCoords.x,
      fy: originCoords.y,
    },
    target: {
      ...destinationCoords,
      id: toNodeId,
      fx: destinationCoords.x,
      fy: destinationCoords.y,
    },
  };

  const segments = generateSegments(pathData);

  flowMap.bundleData.paths.push({
    id: pathId,
    value: value,
    segments: segments.local,
    source: pathData.source,
    target: pathData.target,
  });

  flowMap.bundleData.nodes.push(...segments.nodes);
  flowMap.bundleData.links.push(...segments.links);
}

function updateBundleDataPath(
  pathId,
  originCoords,
  destinationCoords,
  originNodeId,
  destinationNodeId,
  value,
) {
  const pathIndex = flowMap.bundleData.paths.findIndex((p) => p.id === pathId);
  if (pathIndex === -1) {
    console.warn(`Path ${pathId} not found for editing`);
    return;
  }

  removeBundleData(pathId);
  addToBundleData(
    pathId,
    originCoords,
    destinationCoords,
    originNodeId,
    destinationNodeId,
    value,
  );
}

function removeBundleData(pathId) {
  const pathIndex = flowMap.bundleData.paths.findIndex((p) => p.id === pathId);
  if (pathIndex === -1) return;

  const pathToRemove = flowMap.bundleData.paths[pathIndex];

  removePathSegments(pathToRemove);
  removePathLinks(pathToRemove);

  flowMap.bundleData.paths.splice(pathIndex, 1);
}

function removePathSegments(pathToRemove) {
  pathToRemove.segments.forEach((segment) => {
    if (segment.generated) {
      const nodeIndex = flowMap.bundleData.nodes.findIndex(
        (n) => n === segment,
      );
      if (nodeIndex !== -1) {
        flowMap.bundleData.nodes.splice(nodeIndex, 1);
      }
    }
  });
}

function removePathLinks(pathToRemove) {
  flowMap.bundleData.links = flowMap.bundleData.links.filter(
    (link) =>
      !pathToRemove.segments.includes(link.source) &&
      !pathToRemove.segments.includes(link.target),
  );
}

function generateSegments(pathData) {
  const length = calculateDistance(pathData.source, pathData.target);
  const segmentCount = Math.round(SCALES.segments(length));

  const dx = pathData.target.x - pathData.source.x;
  const dy = pathData.target.y - pathData.source.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  const perpX = -dy / dist;
  const perpY = dx / dist;

  const offsetAmount = CONFIG.pathOffset;

  const basePerpX = perpX * offsetAmount;
  const basePerpY = perpY * offsetAmount;

  const xScale = d3
    .scaleLinear()
    .domain([0, segmentCount + 1])
    .range([pathData.source.x, pathData.target.x]);

  const yScale = d3
    .scaleLinear()
    .domain([0, segmentCount + 1])
    .range([pathData.source.y, pathData.target.y]);

  let source = pathData.source;
  const local = [source];
  const nodes = [];
  const links = [];

  for (let i = 1; i <= segmentCount; i++) {
    const target = {
      x: xScale(i) + basePerpX,
      y: yScale(i) + basePerpY,
      generated: true,
    };

    local.push(target);
    nodes.push(target);
    links.push({ source, target });

    source = target;
  }

  local.push(pathData.target);
  links.push({ source, target: pathData.target });

  return { local, nodes, links };
}

function updatePathsForNode(nodeId, lat, lon) {
  const connectedPaths = flowMap.bundleData.paths.filter(
    (path) => path.source.id === nodeId || path.target.id === nodeId,
  );

  if (connectedPaths.length === 0) return;

  const [x, y] = flowMap.projection([lon, lat]);
  const newCoords = { x, y };

  connectedPaths.forEach((pathData) => {
    updatePathNodePosition(pathData, nodeId, newCoords, x, y);
    regeneratePathSegments(pathData);
  });

  regenerateBundling();
}

function updatePathNodePosition(pathData, nodeId, newCoords, x, y) {
  const pathIndex = flowMap.bundleData.paths.findIndex(
    (p) => p.id === pathData.id,
  );
  if (pathIndex !== -1) {
    const pathToRemove = flowMap.bundleData.paths[pathIndex];
    removePathSegments(pathToRemove);
    removePathLinks(pathToRemove);
  }

  if (pathData.source.id === nodeId) {
    pathData.source = { ...newCoords, id: nodeId, fx: x, fy: y };
  }
  if (pathData.target.id === nodeId) {
    pathData.target = { ...newCoords, id: nodeId, fx: x, fy: y };
  }
}

function regeneratePathSegments(pathData) {
  const segments = generateSegments({
    id: pathData.id,
    source: pathData.source,
    target: pathData.target,
  });

  pathData.segments = segments.local;
  flowMap.bundleData.nodes.push(...segments.nodes);
  flowMap.bundleData.links.push(...segments.links);
}

// ============================================================================
// FORCE LAYOUT AND BUNDLING FUNCTIONS
// ============================================================================

function regenerateBundling() {
  if (flowMap.bundleData.paths.length === 0) {
    stopForceLayout();
    return;
  }

  updatePathScales();
  const { hoverAreas, visiblePaths, line } = createPathElements();

  setupForceLayout(visiblePaths, hoverAreas, line);
  animatePathsIn(visiblePaths);

  requestAnimationFrame(() => {
    createLegend();
  });
}

function updatePathScales() {
  const totalSum = flowMap.bundleData.paths.reduce(
    (sum, path) => sum + path.value,
    0,
  );
  SCALES.pathThickness.domain([0, totalSum]);
}

function setupForceLayout(visiblePaths, hoverAreas, line) {
  const pathInitialSegments = new Map();

  flowMap.bundleData.paths.forEach((p) => {
    const existingPath = flowMap.pathsList.select(`#${p.id}`);
    if (!existingPath.empty()) {
      pathInitialSegments.set(
        p.id,
        p.segments.map((s) => ({ x: s.x, y: s.y })),
      );
    }
  });

  stopForceLayout();

  flowMap.forceLayout = d3
    .forceSimulation()
    .alphaDecay(CONFIG.alphaDecay)
    .randomSource(d3.randomLcg(42))
    .force(
      "charge",
      d3
        .forceManyBody()
        .strength(CONFIG.chargeStrength)
        .distanceMax(CONFIG.chargeDistanceMax),
    )
    .force(
      "link",
      d3
        .forceLink()
        .strength(CONFIG.linkStrength)
        .distance(CONFIG.linkDistance),
    )
    .on("tick", function () {
      // Don't update visuals during simulation
    })
    .on("end", function () {
      // Store final bundled positions
      const finalSegments = flowMap.bundleData.paths.map((p) =>
        p.segments.map((s) => ({ x: s.x, y: s.y })),
      );

      // Separate new paths from existing paths
      const newPaths = visiblePaths.filter(
        (d) => !pathInitialSegments.has(d.id),
      );
      const existingPaths = visiblePaths.filter((d) =>
        pathInitialSegments.has(d.id),
      );

      if (!newPaths.empty()) {
        const newPathLengths = newPaths
          .nodes()
          .map((node) => node.getTotalLength());

        newPaths
          .attr("d", (d, i) => {
            const dataIndex = flowMap.bundleData.paths.findIndex(
              (p) => p.id === d.id,
            );
            return line(finalSegments[dataIndex]);
          })
          .attr(
            "stroke-dasharray",
            (d, i) => `${newPathLengths[i]} ${newPathLengths[i]}`,
          )
          .attr("stroke-dashoffset", (d, i) => newPathLengths[i])
          .transition()
          .duration(CONFIG.pathAnimationDuration)
          .attr("stroke-dashoffset", 0)
          .on("end", function () {
            d3.select(this).attr("stroke-dasharray", "none");
          });

        newPaths.each(function (d) {
          const dataIndex = flowMap.bundleData.paths.findIndex(
            (p) => p.id === d.id,
          );
          hoverAreas
            .filter((hd) => hd.id === d.id)
            .attr("d", line(finalSegments[dataIndex]));
        });
      }

      if (!existingPaths.empty()) {
        const duration = CONFIG.pathAnimationDuration;
        const startTime = Date.now();

        function animate() {
          const elapsed = Date.now() - startTime;
          const t = Math.min(elapsed / duration, 1);
          const eased = d3.easeCubicInOut(t);

          existingPaths.each(function (d) {
            const dataIndex = flowMap.bundleData.paths.findIndex(
              (p) => p.id === d.id,
            );
            const initial = pathInitialSegments.get(d.id);
            const final = finalSegments[dataIndex];

            const interpolatedSegments = initial.map((s, j) => ({
              x: s.x + (final[j].x - s.x) * eased,
              y: s.y + (final[j].y - s.y) * eased,
            }));

            d3.select(this).attr("d", line(interpolatedSegments));

            hoverAreas
              .filter((hd) => hd.id === d.id)
              .attr("d", line(interpolatedSegments));
          });

          if (t < 1) {
            requestAnimationFrame(animate);
          }
        }

        animate();
      }
    });

  flowMap.forceLayout
    .nodes(flowMap.bundleData.nodes)
    .force("link")
    .links(flowMap.bundleData.links);
}

function stopForceLayout() {
  if (flowMap.forceLayout) {
    flowMap.forceLayout.stop();
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function isMapReady() {
  return flowMap.initialised && flowMap.projection;
}

function isPathCreationReady() {
  return flowMap.initialised && flowMap.projection && flowMap.nodesList;
}

function ensureNodesGroup() {
  if (!flowMap.nodesList) {
    flowMap.nodesList = flowMap.g.append("g").attr("class", "nodes");
  }
}

function ensurePathsGroup() {
  if (!flowMap.pathsList) {
    flowMap.pathsList = flowMap.g.insert("g", ".nodes").attr("class", "paths");
  }
}

function removeExistingNode(nodeId) {
  const existingNode = flowMap.nodesList?.select(`#${nodeId}`);
  if (existingNode && !existingNode.empty()) {
    existingNode.remove();
  }
}

function removeExistingPath(pathId) {
  const existingPath = flowMap.pathsList?.select(`#${pathId}`);
  if (existingPath && !existingPath.empty()) {
    existingPath.remove();
    removeBundleData(pathId);
  }
}

function getNodeCoordinates(originNodeId, destinationNodeId) {
  const originNode = flowMap.nodesList.select(`#${originNodeId}`);
  const destinationNode = flowMap.nodesList.select(`#${destinationNodeId}`);

  if (originNode.empty() || destinationNode.empty()) {
    return { originCoords: null, destinationCoords: null };
  }

  const originCoords = parseTransform(originNode.attr("transform"));
  const destinationCoords = parseTransform(destinationNode.attr("transform"));

  return { originCoords, destinationCoords };
}

function parseTransform(transform) {
  if (!transform) return null;

  const match = transform.match(/translate\(([^,]+),([^)]+)\)/);
  return match
    ? {
        x: parseFloat(match[1]),
        y: parseFloat(match[2]),
      }
    : null;
}

function calculateDistance(source, target) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function clearFlowMap() {
  if (flowMap.g) {
    flowMap.g.selectAll(".node").remove();
    flowMap.g.selectAll(".flow").remove();
    flowMap.svg.selectAll(".legend").remove();
    flowMap.bundleData = { nodes: [], links: [], paths: [] };
    stopForceLayout();
  }
}

function createLegend() {
  flowMap.svg.selectAll(".legend").remove();

  if (flowMap.bundleData.paths.length === 0) return;

  const legendGroup = flowMap.svg.append("g").attr("class", "legend");

  const maxValue = SCALES.pathThickness.domain()[1];
  const minValue = SCALES.pathThickness.domain()[0];

  const legendValues = [
    minValue,
    maxValue * 0.25,
    maxValue * 0.5,
    maxValue * 0.75,
    maxValue,
  ].filter((v) => v > 0);

  const legendX = 20;
  const svgHeight = parseFloat(flowMap.svg.attr("height"));
  const legendHeight = legendValues.length * 20 + 25;
  const legendY = svgHeight - legendHeight - 10;

  legendGroup
    .append("text")
    .attr("x", legendX + 3)
    .attr("y", legendY)
    .style("font-size", "10px")
    .style("font-family", STYLES.fontFamily)
    .style("font-weight", "bold")
    .style("fill", COLORS.text)
    .text("LEGEND");

  const textElements = [];

  legendValues.forEach((value, i) => {
    const y = legendY + 15 + i * 20;

    legendGroup
      .append("line")
      .attr("x1", legendX + 3)
      .attr("y1", y)
      .attr("x2", legendX + 35)
      .attr("y2", y)
      .attr("stroke", COLORS.path)
      .attr("stroke-width", SCALES.pathThickness(value));

    const formattedValue = formatValueWithUnit(
      value,
      flowMap.unitSymbol,
      flowMap.unitLocation,
    );

    const textElement = legendGroup
      .append("text")
      .attr("x", legendX + 42)
      .attr("y", y + 1.5)
      .style("font-size", "8px")
      .style("font-family", STYLES.fontFamily)
      .style("fill", COLORS.text)
      .text(formattedValue);

    textElements.push(textElement);
  });

  const legendBBox = legendGroup.node().getBBox();
  const legendWidth = legendBBox.width + 10;

  legendGroup
    .insert("rect", ":first-child")
    .attr("x", legendX - 5)
    .attr("y", legendY - 15)
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .attr("fill", COLORS.legendBackground)
    .attr("stroke", COLORS.node)
    .attr("stroke-width", 0.5)
    .attr("rx", 2);
}

function formatValueWithUnit(value, unitSymbol, unitLocation) {
  const formattedNumber = Math.round(value).toLocaleString();

  if (!unitSymbol) return formattedNumber;

  if (unitLocation === "before") {
    return `${unitSymbol}${formattedNumber}`;
  } else if (unitLocation === "after") {
    return `${formattedNumber} ${unitSymbol}`;
  }

  return formattedNumber;
}

// ============================================================================
// INITIALISATION FUNCTIONS
// ============================================================================

function createMap() {
  const shadowRoot = document.querySelector("flow-map").shadowRoot;
  const flowMapDiv = shadowRoot.getElementById("flow-map");
  const width = flowMapDiv.clientWidth;
  const height = window.innerHeight * CONFIG.mapHeight;

  setupSVG(shadowRoot, width, height);
  setupZoomBehavior();
  setupMapInteraction();
  setupProjection(width, height);
  loadWorldData(width, height);

  window.addEventListener("resize", () => {
    const newWidth = flowMapDiv.clientWidth;
    const newHeight = window.innerHeight * 0.6;

    flowMap.svg.style("width", newWidth).attr("height", newHeight);
    createLegend();
  });
}

function setupSVG(shadowRoot, width, height) {
  flowMap.svg = d3
    .select(shadowRoot.getElementById("flow-map"))
    .append("svg")
    .attr("width", "100%")
    .style("width", width)
    .attr("height", height)
    .style("cursor", "crosshair");

  flowMap.g = flowMap.svg.append("g");

  flowMap.svg
    .append("defs")
    .append("marker")
    .attr("id", "arrowhead")
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 5)
    .attr("refY", 0)
    .attr("markerWidth", CONFIG.arrowSize)
    .attr("markerHeight", CONFIG.arrowSize)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,-5L10,0L0,5")
    .attr("fill", COLORS.path);
}

function setupZoomBehavior() {
  const zoom = d3
    .zoom()
    .scaleExtent([0.1, 200])
    .on("zoom", (event) => {
      flowMap.g.attr("transform", event.transform);
    })
    .on("end", (event) => {
      flowMap.g.attr("transform", `${event.transform} translate(0, 0)`);
      requestAnimationFrame(() => {
        flowMap.g.attr("transform", event.transform);
      });
    });

  flowMap.svg.call(zoom);
}

function setupMapInteraction() {
  flowMap.svg.on("click", function (event) {
    if (isInteractiveElement(event.target)) return;

    const [mouseX, mouseY] = d3.pointer(event, flowMap.g.node());

    if (flowMap.projection) {
      const [lon, lat] = flowMap.projection.invert([mouseX, mouseY]);

      removeTempNode();
      createTempNode(mouseX, mouseY);

      if (messageDispatch) {
        messageDispatch(`coords:${lat},${lon}`);
      }
    }
  });
}

function isInteractiveElement(target) {
  return ["circle", "text", "rect"].includes(target.tagName);
}

function setupProjection(width, height) {
  flowMap.projection = d3.geoNaturalEarth1();
}

function loadWorldData(width, height) {
  const path = d3.geoPath().projection(flowMap.projection);

  d3.json(
    "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json",
  ).then((world) => {
    flowMap.countries = topojson.feature(world, world.objects.countries);
    flowMap.projection.fitSize([width, height], flowMap.countries);

    renderWorldMap(path);
  });
}

function renderWorldMap(path) {
  flowMap.g
    .selectAll("path")
    .data(flowMap.countries.features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("fill", COLORS.country)
    .attr("stroke", COLORS.countryStroke)
    .attr("stroke-width", STYLES.strokeWidth.country);
}
