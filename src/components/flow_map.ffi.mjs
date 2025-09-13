// Global ref
let flowMap = {
  svg: null,
  g: null,
  countries: null,
  nodesList: null,
  pathsList: null,
  projection: null,
  tempNode: null,
  initialised: false,
  bundleData: { nodes: [], links: [], paths: [] },
};

let messageDispatch = null;

const pathScales = {
  thickness: d3.scaleLinear().range([0.2, 1.2]),
};

const scales = {
  segments: d3.scaleLinear().domain([0, 500]).range([1, 8]),
};

const nodeRadius = 1.5;
const arrowOffset = nodeRadius + 1;

export function initFlowMap() {
  requestAnimationFrame(() => {
    const shadowRoot = document.querySelector("flow-map")?.shadowRoot;
    const element = shadowRoot?.getElementById("flow-map");
    if (element) {
      createMap();
      flowMap.initialised = true;
    } else if (!element) {
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
  if (!flowMap.initialised || !flowMap.projection) {
    requestAnimationFrame(() => editNode(nodeId, lat, lon, nodeLabel));
    return null;
  }

  removeTempNode();

  const existingNode = flowMap.nodesList?.select(`#${nodeId}`);
  if (existingNode && !existingNode.empty()) {
    existingNode.remove();
  }

  const [x, y] = flowMap.projection([lon, lat]);

  if (!flowMap.nodesList) {
    flowMap.nodesList = flowMap.g.append("g").attr("class", "nodes");
  }

  const nodeGroup = flowMap.nodesList
    .append("g")
    .attr("class", "node")
    .attr("id", nodeId)
    .attr("transform", `translate(${x}, ${y})`);

  nodeGroup
    .append("circle")
    .attr("r", nodeRadius)
    .attr("stroke", "#ffffff")
    .attr("stroke-width", 0.5)
    .attr("fill", "#ef4444")
    .style("cursor", "pointer");

  const labelGroup = nodeGroup.append("g").attr("class", "label-group");

  const labelText = labelGroup
    .append("text")
    .attr("dy", -6)
    .attr("text-anchor", "middle")
    .style("font-size", "4px")
    .style("font-family", "Arial, sans-serif")
    .style("fill", "#1f2937")
    .style("cursor", "pointer")
    .style("cursor", "move")
    .text(nodeLabel);

  // White bg behind the text
  if (nodeLabel && nodeLabel.trim() !== "") {
    const bbox = labelText.node().getBBox();
    labelGroup
      .insert("rect", "text")
      .attr("x", bbox.x - 1)
      .attr("y", bbox.y - 1)
      .attr("width", bbox.width + 2)
      .attr("height", bbox.height + 2)
      .attr("fill", "rgba(255, 255, 255, 0)")
      .attr("rx", 2)
      .style("cursor", "move");
  }

  const dragBehavior = createLabelDragBehavior(labelGroup, nodeId);
  labelText.call(dragBehavior);
  if (!labelGroup.select("rect").empty()) {
    labelGroup.select("rect").call(dragBehavior);
  }

  nodeGroup
    .on("mouseover", function () {
      d3.select(this)
        .select("circle")
        .transition()
        .duration(200)
        .attr("r", nodeRadius * 2);
      d3.select(this)
        .select(".label-group")
        .select("rect")
        .transition()
        .duration(200)
        .attr("fill", "rgba(255, 255, 255, 0.5)");
    })
    .on("mouseout", function () {
      d3.select(this)
        .select("circle")
        .transition()
        .duration(200)
        .attr("r", nodeRadius);
      d3.select(this)
        .select(".label-group")
        .select("rect")
        .transition()
        .duration(200)
        .attr("fill", "rgba(255, 255, 255, 0)");
    })
    .on("mousedown", function (event) {
      if (event.target.tagName === "circle") {
        event.stopPropagation();
        if (messageDispatch) {
          messageDispatch("node_id:" + nodeId);
        }
      }
    });

  nodeGroup.style("opacity", 0).transition().duration(150).style("opacity", 1);

  return null;
}

export function editNode(nodeId, lat, lon, nodeLabel) {
  if (!flowMap.initialised || !flowMap.projection) {
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

  existingNode
    .transition()
    .duration(150)
    .attr("transform", `translate(${x}, ${y})`);

  const labelGroup = existingNode.select(".label-group");
  const labelText = labelGroup.select("text");
  const currentDx = parseFloat(labelText.attr("dx")) || 0;
  const currentDy = parseFloat(labelText.attr("dy")) || -6;
  labelText.text(nodeLabel).attr("dx", currentDx).attr("dy", currentDy);

  let rectElement = labelGroup.select("rect");

  if (nodeLabel && nodeLabel.trim() !== "") {
    const bbox = labelText.node().getBBox();

    if (rectElement.empty()) {
      rectElement = labelGroup
        .insert("rect", "text")
        .attr("fill", "rgba(255, 255, 255, 0)")
        .attr("rx", 2)
        .style("cursor", "move");

      const dragBehavior = createLabelDragBehavior(labelGroup, nodeId);
      rectElement.call(dragBehavior);
    }

    rectElement
      .attr("x", bbox.x - 1)
      .attr("y", bbox.y - 1)
      .attr("width", bbox.width + 2)
      .attr("height", bbox.height + 2);
  } else {
    if (!rectElement.empty()) {
      rectElement.remove();
    }
  }

  if (nodeLabel && nodeLabel.trim() !== "" && !labelText.node().__on) {
    const dragBehavior = createLabelDragBehavior(labelGroup, nodeId);
    labelText.call(dragBehavior);
    if (!rectElement.empty()) {
      rectElement.call(dragBehavior);
    }
  }

  updatePathsForNode(nodeId, lat, lon);

  return null;
}

export function deleteNode(nodeId) {
  if (!flowMap.initialised || !flowMap.nodesList) {
    console.warn(`Cannot delete node: map not initialized or no nodes exist`);
    return null;
  }

  const existingNode = flowMap.nodesList.select(`#${nodeId}`);

  if (!existingNode || existingNode.empty()) {
    console.warn(`Node with id ${nodeId} not found`);
    return null;
  }

  existingNode.transition().duration(150).style("opacity", 0).remove();

  return null;
}

export function addPath(pathId, originNodeId, destinationNodeId, value) {
  if (!flowMap.initialised || !flowMap.projection || !flowMap.nodesList) {
    requestAnimationFrame(() =>
      addPath(pathId, originNodeId, destinationNodeId, value),
    );
    return null;
  }

  removeTempNode();

  const originNode = flowMap.nodesList.select(`#${originNodeId}`);
  const destinationNode = flowMap.nodesList.select(`#${destinationNodeId}`);

  if (originNode.empty() || destinationNode.empty()) {
    console.warn(
      `Cannot create path: nodes ${originNodeId} or ${destinationNodeId} not found`,
    );
    return null;
  }

  if (!flowMap.pathsList) {
    flowMap.pathsList = flowMap.g.insert("g", ".nodes").attr("class", "paths");
  }

  const existingPath = flowMap.pathsList.select(`#${pathId}`);
  if (!existingPath.empty()) {
    existingPath.remove();
    removeBundleData(pathId);
  }

  const originTransform = originNode.attr("transform");
  const destinationTransform = destinationNode.attr("transform");

  const originCoords = parseTransform(originTransform);
  const destinationCoords = parseTransform(destinationTransform);

  if (!originCoords || !destinationCoords) {
    console.warn("Could not parse node positions");
    return null;
  }

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
  if (!flowMap.initialised || !flowMap.projection || !flowMap.nodesList) {
    return null;
  }

  removeTempNode();

  const originNode = flowMap.nodesList.select(`#${originNodeId}`);
  const destinationNode = flowMap.nodesList.select(`#${destinationNodeId}`);

  if (originNode.empty() || destinationNode.empty()) {
    console.warn(
      `Cannot edit path: nodes ${originNodeId} or ${destinationNodeId} not found`,
    );
    return null;
  }

  const originCoords = parseTransform(originNode.attr("transform"));
  const destinationCoords = parseTransform(destinationNode.attr("transform"));

  const pathIndex = flowMap.bundleData.paths.findIndex((p) => p.id === pathId);
  if (pathIndex === -1) {
    console.warn(`Path ${pathId} not found for editing`);
    return null;
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
  regenerateBundling();

  return null;
}

export function deletePath(pathId) {
  if (!flowMap.initialised || !flowMap.pathsList) {
    console.warn(`Cannot delete path: map not initialized or no paths exist`);
    return null;
  }

  removeTempNode();

  const existingPath = flowMap.pathsList.select(`#${pathId}`);

  if (!existingPath.empty()) {
    existingPath.transition().duration(150).style("opacity", 0).remove();
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

function createMap() {
  const shadowRoot = document.querySelector("flow-map").shadowRoot;
  const flowMapDiv = shadowRoot.getElementById("flow-map");
  const width = flowMapDiv.clientWidth;
  const height = window.innerHeight * 0.6;

  flowMap.svg = d3
    .select(shadowRoot.getElementById("flow-map"))
    .append("svg")
    .attr("width", "100%")
    .style("width", width)
    .attr("height", height);

  // Create a group for all map elements to allow zoom
  flowMap.g = flowMap.svg.append("g");
  flowMap.svg.style("cursor", "crosshair");

  const zoom = d3
    .zoom()
    .scaleExtent([0.1, 200])
    .on("zoom", (event) => {
      flowMap.g.attr("transform", event.transform);
    })
    .on("end", (event) => {
      // Force re-render by slightly modifying and restoring the transform
      flowMap.g.attr("transform", `${event.transform} translate(0, 0)`);
      // Use requestAnimationFrame to restore the original transform
      requestAnimationFrame(() => {
        flowMap.g.attr("transform", event.transform);
      });
    });

  flowMap.svg.call(zoom);

  // Return latitude and longitude when clicking on the svg
  flowMap.svg.on("click", function (event) {
    if (
      event.target.tagName === "circle" ||
      event.target.tagName === "text" ||
      event.target.tagName === "rect"
    ) {
      return;
    }

    const [mouseX, mouseY] = d3.pointer(event, flowMap.g.node());

    if (flowMap.projection) {
      const [lon, lat] = flowMap.projection.invert([mouseX, mouseY]);

      removeTempNode();

      if (!flowMap.nodesList) {
        flowMap.nodesList = flowMap.g.append("g").attr("class", "nodes");
      }

      flowMap.tempNode = flowMap.nodesList
        .append("circle")
        .attr("cx", mouseX)
        .attr("cy", mouseY)
        .attr("r", nodeRadius)
        .attr("fill", "#6b7280")
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 0.5)
        .attr("opacity", 0.7);

      if (messageDispatch) {
        messageDispatch(`coords:${lat},${lon}`);
      }
    }
  });

  flowMap.projection = d3.geoNaturalEarth1();
  const path = d3.geoPath().projection(flowMap.projection);

  // Load world data
  d3.json(
    "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json",
  ).then((world) => {
    // Convert TopoJSON to GeoJSON
    flowMap.countries = topojson.feature(world, world.objects.countries);
    flowMap.projection.fitSize([width, height], flowMap.countries);

    flowMap.g
      .selectAll("path")
      .data(flowMap.countries.features)
      .enter()
      .append("path")
      .attr("d", path)
      .attr("fill", "#9ca3af")
      .attr("stroke", "#f3f4f6")
      .attr("stroke-width", 0.25);
  });
}

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

  // Generate segments for this path
  const segments = generateSegments(pathData);

  flowMap.bundleData.paths.push({
    id: pathId,
    value: value,
    segments: segments.local,
    source: pathData.source,
    target: pathData.target,
  });

  // Add nodes and links to the global bundle data
  flowMap.bundleData.nodes.push(...segments.nodes);
  flowMap.bundleData.links.push(...segments.links);
}

function removeBundleData(pathId) {
  // Remove path
  const pathIndex = flowMap.bundleData.paths.findIndex((p) => p.id === pathId);
  if (pathIndex !== -1) {
    const pathToRemove = flowMap.bundleData.paths[pathIndex];

    // Remove associated nodes and links
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

    // Remove links associated with this path
    flowMap.bundleData.links = flowMap.bundleData.links.filter(
      (link) =>
        !pathToRemove.segments.includes(link.source) &&
        !pathToRemove.segments.includes(link.target),
    );

    flowMap.bundleData.paths.splice(pathIndex, 1);
  }
}

function generateSegments(pathData) {
  const length = distance(pathData.source, pathData.target);
  const total = Math.round(scales.segments(length));

  const xscale = d3
    .scaleLinear()
    .domain([0, total + 1])
    .range([pathData.source.x, pathData.target.x]);

  const yscale = d3
    .scaleLinear()
    .domain([0, total + 1])
    .range([pathData.source.y, pathData.target.y]);

  let source = pathData.source;
  let target = null;
  const local = [source];
  const nodes = [];
  const links = [];

  for (let j = 1; j <= total; j++) {
    target = {
      x: xscale(j),
      y: yscale(j),
      generated: true, // Mark as generated node
    };

    local.push(target);
    nodes.push(target);

    links.push({
      source: source,
      target: target,
    });

    source = target;
  }

  local.push(pathData.target);

  // Add last link to target node
  links.push({
    source: target,
    target: pathData.target,
  });

  return { local, nodes, links };
}

function regenerateBundling() {
  if (flowMap.bundleData.paths.length === 0) {
    if (flowMap.forceLayout) {
      flowMap.forceLayout.stop();
    }
    return;
  }

  const totalSum = flowMap.bundleData.paths.reduce(
    (sum, path) => sum + path.value,
    0,
  );

  // Scale based on proportion of total (0% = 0.1, 100% = 1.0)
  pathScales.thickness.domain([0, totalSum]);

  // Create line generator with bundle curve
  const line = d3
    .line()
    .curve(d3.curveBundle.beta(0.85))
    .x((d) => d.x)
    .y((d) => d.y);

  flowMap.pathsList.selectAll("path.flow").remove();
  flowMap.pathsList.selectAll("path.flow-hover").remove();

  // Create invisible hover areas first (underneath visible paths)
  const hoverAreas = flowMap.pathsList
    .selectAll("path.flow-hover")
    .data(flowMap.bundleData.paths)
    .enter()
    .append("path")
    .attr("d", (d) => line(d.segments))
    .attr("class", "flow-hover")
    .attr("fill", "none")
    .attr("stroke", "transparent")
    .attr("stroke-width", 2.5)
    .style("cursor", "pointer")
    .on("mouseover", function (event, d) {
      // Target the visible path for the hover effect
      flowMap.pathsList
        .select(`path.flow#${d.id}`)
        .transition()
        .duration(200)
        .attr("stroke-width", pathScales.thickness(d.value) + 1);
    })
    .on("mouseout", function (event, d) {
      // Target the visible path for the hover effect
      flowMap.pathsList
        .select(`path.flow#${d.id}`)
        .transition()
        .duration(200)
        .attr("stroke-width", pathScales.thickness(d.value));
    })
    .on("click", function (event, d) {
      event.stopPropagation();

      removeTempNode();

      if (messageDispatch) {
        messageDispatch("path_id:" + d.id);
      }
    });

  // Create visible paths (no mouse events needed now)
  const links = flowMap.pathsList
    .selectAll("path.flow")
    .data(flowMap.bundleData.paths)
    .enter()
    .append("path")
    .attr("d", (d) => line(d.segments))
    .attr("class", "flow")
    .attr("id", (d) => d.id)
    .attr("fill", "none")
    .attr("stroke", "#3b82f6")
    .attr("stroke-width", (d) => pathScales.thickness(d.value))
    .style("pointer-events", "none"); // Disable pointer events on visible paths

  if (flowMap.forceLayout) {
    flowMap.forceLayout.stop();
  }

  flowMap.forceLayout = d3
    .forceSimulation()
    .alphaDecay(0.1)
    .randomSource(d3.randomLcg(42))
    .force("charge", d3.forceManyBody().strength(0.5).distanceMax(50))
    .force("link", d3.forceLink().strength(0.5).distance(1))
    .on("tick", function () {
      links.attr("d", (d) => line(d.segments));
      hoverAreas.attr("d", (d) => line(d.segments));
    })
    .on("end", function () {
      // console.log("bundling layout complete");
    });

  flowMap.forceLayout
    .nodes(flowMap.bundleData.nodes)
    .force("link")
    .links(flowMap.bundleData.links);

  // Animate paths in
  const pathLength = links.nodes().map((node) => node.getTotalLength());
  links
    .attr("stroke-dasharray", (d, i) => pathLength[i] + " " + pathLength[i])
    .attr("stroke-dashoffset", (d, i) => pathLength[i])
    .transition()
    .duration(300)
    .attr("stroke-dashoffset", 0)
    .on("end", function () {
      d3.select(this).attr("stroke-dasharray", "none");
    });
}

function updatePathsForNode(nodeId, lat, lon) {
  const connectedPaths = flowMap.bundleData.paths.filter(
    (path) => path.source.id === nodeId || path.target.id === nodeId,
  );

  if (connectedPaths.length === 0) {
    return;
  }

  const [x, y] = flowMap.projection([lon, lat]);
  const newCoords = { x, y };

  connectedPaths.forEach((pathData) => {
    const pathIndex = flowMap.bundleData.paths.findIndex(
      (p) => p.id === pathData.id,
    );
    if (pathIndex !== -1) {
      const pathToRemove = flowMap.bundleData.paths[pathIndex];

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

      // Remove links associated with this path
      flowMap.bundleData.links = flowMap.bundleData.links.filter(
        (link) =>
          !pathToRemove.segments.includes(link.source) &&
          !pathToRemove.segments.includes(link.target),
      );
    }

    if (pathData.source.id === nodeId) {
      pathData.source = { ...newCoords, id: nodeId, fx: x, fy: y };
    }
    if (pathData.target.id === nodeId) {
      pathData.target = { ...newCoords, id: nodeId, fx: x, fy: y };
    }

    const segments = generateSegments({
      id: pathData.id,
      source: pathData.source,
      target: pathData.target,
    });

    pathData.segments = segments.local;
    flowMap.bundleData.nodes.push(...segments.nodes);
    flowMap.bundleData.links.push(...segments.links);
  });

  regenerateBundling();
}

function createLabelDragBehavior(nodeId) {
  const drag = d3
    .drag()
    .on("start", function (event) {
      event.sourceEvent.stopPropagation();

      // Vis feedback - change if needed
      d3.select(this.parentNode)
        .select("rect")
        .transition()
        .duration(100)
        .attr("fill", "rgba(255, 255, 255, 0.8)");
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
        .attr("fill", "rgba(255, 255, 255, 0)");

      const textElement = d3.select(this);
      const dx = parseFloat(textElement.attr("dx")) || 0;
      const dy = parseFloat(textElement.attr("dy")) || -6;

      // Do I want to store label locations? Maybe
      if (messageDispatch) {
        messageDispatch(`label_moved:${nodeId}:${dx}:${dy}`);
      }
    });

  return drag;
}

function parseTransform(transform) {
  if (!transform) return null;

  const match = transform.match(/translate\(([^,]+),([^)]+)\)/);
  if (match) {
    return {
      x: parseFloat(match[1]),
      y: parseFloat(match[2]),
    };
  }
  return null;
}

function distance(source, target) {
  const dx2 = Math.pow(target.x - source.x, 2);
  const dy2 = Math.pow(target.y - source.y, 2);
  return Math.sqrt(dx2 + dy2);
}
