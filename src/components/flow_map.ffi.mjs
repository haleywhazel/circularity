// ============================================================================
// CONSTANTS AND CONFIGURATION
// ============================================================================

const CONFIG = {
  nodeRadius: 1.5,
  arrowOffset: 2.5, // nodeRadius + 1
  mapHeight: 0.6, // 60% of window height
  animationDuration: 150,
  pathAnimationDuration: 300,
  hoverDuration: 200,
  bundleBeta: 0.85,
  alphaDecay: 0.1,
  forceStrength: 0.5,
  chargeDistanceMax: 50,
  hoverStrokeWidth: 2.5,
};

const SCALES = {
  pathThickness: d3.scaleLinear().range([0.2, 1.2]),
  segments: d3.scaleLinear().domain([0, 500]).range([1, 8]),
};

const COLORS = {
  node: "#ef4444",
  nodeStroke: "#ffffff",
  tempNode: "#6b7280",
  path: "#3b82f6",
  country: "#9ca3af",
  countryStroke: "#f3f4f6",
  text: "#1f2937",
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
    .curve(d3.curveBundle.beta(CONFIG.bundleBeta))
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
      x: xScale(i),
      y: yScale(i),
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
}

function updatePathScales() {
  const totalSum = flowMap.bundleData.paths.reduce(
    (sum, path) => sum + path.value,
    0,
  );
  SCALES.pathThickness.domain([0, totalSum]);
}

function setupForceLayout(visiblePaths, hoverAreas, line) {
  stopForceLayout();

  flowMap.forceLayout = d3
    .forceSimulation()
    .alphaDecay(CONFIG.alphaDecay)
    .randomSource(d3.randomLcg(42))
    .force(
      "charge",
      d3
        .forceManyBody()
        .strength(CONFIG.forceStrength)
        .distanceMax(CONFIG.chargeDistanceMax),
    )
    .force("link", d3.forceLink().strength(CONFIG.forceStrength).distance(1))
    .on("tick", function () {
      visiblePaths.attr("d", (d) => line(d.segments));
      hoverAreas.attr("d", (d) => line(d.segments));
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
