var max_x = 0;
var max_y = 0;
var drawGraph = function(graph) {
  var width = window.innerWidth,
    height = window.innerHeight*0.96,
    radius = 70,
    color = d3.scale.category20();
  var force = d3.layout.force()
      .charge(-300)
      .linkDistance(100)
      .size([width, height]);

  var svg = d3.select("#graph").append("svg")
  var group = svg
      .attr("width", width)
      .attr("height", height)
      .attr("preserveAspectRatio", 'meet')
      .attr("viewBox", '0 0 '+width+' '+height)
      .append('g')
  force
    .nodes(graph.nodes)
    .links(graph.links)
    .start();

  group.append("svg:defs").selectAll("marker")
    .data(["arrow"])
    .enter()
    .append("marker")
      .attr("id", function(d) { return d; })
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 10)
      .attr("refY", 0)
      .attr("markerWidth", 10)
      .attr("markerHeight", 10)
      .attr("orient", "auto")
    .append("path")
      .style("stroke", function(d) { return "grey"; })
      .style("fill", function(d) { return "grey"; })
      .attr("d", "M0,-5L10,0L0,5");

  var links = group.selectAll(".link")
    .data(graph.links)
    .enter()
      .append("svg:path")
      .style("fill", function(d) { return "none"; })
      .style("stroke", function(d) { return "grey"; })
      .attr("marker-end", function(d) { return "url(#arrow)"; });

  var gnodes = group.selectAll('g.gnode')
     .data(graph.nodes)
     .enter()
     .append('g')
     .classed('gnode', true);

  var node = gnodes.append("path")
    .attr("d", d3.svg.symbol()
      .size(function(d) { return radius+d.size*radius; })
      .type(function(d) { return d.shape; })
    )
    .style("fill", function(d) { return color(d.group); })
    .style("stroke", function(d) { return d3.rgb(color(d.group)).darker(); })
    .call(force.drag);

  var labels = gnodes.append("text")
    .text(function(d) { return d.name; })
    .attr("x", function(d) { return 10 + d.size; })
    .attr("y", "3")
    .attr("font-family", "sans-serif")
    .attr("font-size","7pt")
    .attr("fill", function(d) { return d3.rgb(color(d.group)).darker(); });

  force.on("tick", function() {
    links.attr('d', linkRespectingRadius);
    gnodes.attr("transform", function(d) {
        if ( d.x >= max_x ) { max_x = d.x;}
        if ( d.y >= max_y ) { max_y = d.y;}
        if ( d.x <= max_x ) { min_x = d.x;}
        if ( d.y <= max_y ) { min_y = d.y;}
        return 'translate(' + [d.x, d.y] + ')';
    });
    //force.size([max_x-min_x, max_y-min_y])
    //svg.attr("viewBox", '0 0 '+(max_x-min_x)+' '+(max_y-min_y))
  });
};
var GRAPH_DATA_PARAMETER='g'
var GRAPH_DATA_URL_PARAMETER='u'

if (getParameterByName('configUrl')) {
  dataIsLoaded(buildGraphFromXML(loadConfigDocument()))
}
else if (getParameterByName(GRAPH_DATA_PARAMETER)) {
  var decompressed = decompressFromString(getParameterByName(GRAPH_DATA_PARAMETER))
  dataIsLoaded(decompressed)
}
else if (getParameterByName(GRAPH_DATA_URL_PARAMETER)) {
  var script = document.createElement('script');
  script.src = getParameterByName(GRAPH_DATA_URL_PARAMETER)
  document.getElementsByTagName('head')[0].appendChild(script);
}
else {
  dataIsLoaded(buildGraphFromXML(loadConfigDocument()))
}
function dataIsLoaded(data) {
  var graph = buildD3Data(data)

  clearOut("graph")
  clearOut("graph-link-placeholder")
  drawGraph(graph)
  addControls(data)
}

function clearOut(elementId) {
  var myNode = document.getElementById(elementId);
  while (myNode.firstChild) {
      myNode.removeChild(myNode.firstChild);
  }
}

function showLabels() { return getParameterByName('h') === null }

function buildGraphFromXML (xmlDoc) {
  var data = {},
    nodes = [],
    groups = [],
    pipelineGroups=xmlDoc.getElementsByTagName("pipelines"),
    templatePipelineElements=xmlDoc.getElementsByTagName("templates")[0].getElementsByTagName("pipeline")
  data.p = []
  data.r = {}
  data.t = {}
  data.k = {}
  data.l = {}
  data.l.links = {}

  for(templateIndex=0; templateIndex < templatePipelineElements.length; templateIndex++) {
    foundTemplatePipeline(templatePipelineElements[templateIndex].getAttribute('name'), nodes, data)
  }
  for(groupIndex=0; groupIndex < pipelineGroups.length; groupIndex++) {
    var pipelineGroup = pipelineGroups[groupIndex],
      groupName = pipelineGroup.getAttribute('group'),
      pipelineElements = pipelineGroup.getElementsByTagName('pipeline')
    foundGroup(groupName, groups)
    for(var pipelineIndex=0; pipelineIndex < pipelineElements.length; pipelineIndex++) {

      var pipeline = pipelineElements[pipelineIndex],
        pipelineName=pipeline.getAttribute('name')
      if (pipelineName) {
        var pipelineNodeIndex = foundPipeline(pipelineName, groupName, nodes, groups, data)
        if (pipeline.getAttribute('template')) {
          var templateNodeIndex = foundTemplatePipeline(pipeline.getAttribute('template'), nodes, data)
          linkFrom(pipelineNodeIndex, templateNodeIndex, data)
        }
        var materialsTag = pipeline.getElementsByTagName('materials')[0]
        if (materialsTag) {
          var materials=materialsTag.children
          for (materialIndex=0; materialIndex < materials.length; materialIndex++) {
            var material=materials[materialIndex],
              materialName,
              materialNodeIndex = -1
            if (material.tagName==='pipeline') {
              materialName=material.getAttribute('pipelineName')
              materialNodeIndex = foundPipeline(materialName, groupName, nodes, groups, data)
            }
            else if (material.tagName==='package') {
              var packageId = material.getAttribute('ref')
              materialNodeIndex = foundPackage(packageId, nodes, data)
            }
            else {
              materialName = material.getAttribute('url')
              materialNodeIndex = foundRepo(materialName, material.tagName, nodes, data)
            }
            linkFrom(pipelineNodeIndex, materialNodeIndex, data)
          }
        }
      }
    }
  }
  return data
}
function linkFrom(sourceNodeIndex, targetNodeIndex, data) {
  if (!data.l.links[targetNodeIndex]) data.l.links[targetNodeIndex]=[]
  data.l.links[targetNodeIndex].push(sourceNodeIndex)
}
function foundGroup (groupName, groups) {
  if (groups.indexOf(groupName) < 0) groups.push(groupName)
  return groups.indexOf(groupName)
}
function foundPipeline(pipelineName, groupName, nodes, groups, data) {
  var groupNumber=foundGroup(groupName, groups)
  var newNodeAction = function(nodeIndex) { data.p.push([nodeIndex, groupNumber, hideLabelIfRequired(pipelineName)]) }
  return indexOfNode(pipelineName, newNodeAction, nodes)
}
function foundRepo(repoUrl, repoType, nodes, data) {
  var newNodeAction = function(repoNodeIndex) { data.r[repoNodeIndex]=hideLabelIfRequired(repoUrl) }
  return indexOfNode(repoUrl, newNodeAction, nodes)
}
function foundTemplatePipeline(templateName, nodes, data) {
  var newNodeAction = function(nodeIndex) { data.t[nodeIndex]=hideLabelIfRequired(templateName) }
  return indexOfNode(templateName, newNodeAction, nodes)
}
function foundPackage(packageId, nodes, data) {
  var newNodeAction = function(nodeIndex) { data.k[nodeIndex]=hideLabelIfRequired(packageId) }
  return indexOfNode(packageId, newNodeAction, nodes)
}
function hideLabelIfRequired(label) { return showLabels() ? label : "" }
function indexOfNode(name, newNodeAction, nodes) {
  if (nodes.indexOf(name) < 0) {
    nodes.push(name)
    newNodeAction(nodes.indexOf(name))
  }
  return nodes.indexOf(name);
}

function compressToString(object) {
  return new JSZip().file('object', JSON.stringify(object)).generate({type:"base64", compression:"deflate"})
}
function decompressFromString(compressed) {
  return JSON.parse(new JSZip().load(compressed, {base64: true, compression:"deflate"}).file('object').asText());
}

function buildD3Data(data) {
  data.l.sizeOf = function (nodeIndex) { return data.l.links[nodeIndex] ? data.l.links[nodeIndex].length : 0 }
  var graph = {'nodes': [], 'links': []}
  var templates = data.t, repositories = data.r, packages = data.k, pipelines = data.p, nodeLinks = data.l

  for (var index in templates) {
    graph.nodes[index]={'name': templates[index], 'group': 'templates', 'shape': 'square', 'size': nodeLinks.sizeOf(index)}
  }
  for (var index in repositories) {
    graph.nodes[index]={'name': repositories[index], 'group': 'repositories', 'shape': 'triangle-up', 'size': nodeLinks.sizeOf(index)}
  }
  for (var index in packages) {
    graph.nodes[index]={'name': packages[index], 'group': 'packages', 'shape': 'triangle-down', 'size': nodeLinks.sizeOf(index)}
  }
  for (var index=0; index < pipelines.length; index++) {
    var pipeline = pipelines[index]
    graph.nodes[pipeline[0]]={'name': pipeline[2], 'group': pipeline[1], 'shape': 'circle', 'size': nodeLinks.sizeOf(pipeline[0])}
  }
  for (var target in nodeLinks.links) {
    for (var sourceIndex=0; sourceIndex < nodeLinks.links[target].length; sourceIndex++) {
      graph.links.push({'source': nodeLinks.links[target][sourceIndex], 'target': parseInt(target)})
    }
  }
  return graph
}
function addControls(dependencies) {
  shareLinkUrl = '?'+GRAPH_DATA_PARAMETER+'='+encodeURIComponent(compressToString(dependencies))
  var labelsControl
  if (showLabels()) {
    if (document.location.search.length === 0) {
      labelsControl = '<a href="' + document.location + '?h=true">hide labels</a>'
    }
    else {
      labelsControl = '<a href="' + document.location + '&h=true">hide labels</a>'
    }
  }
  else {
    labelsControl = '<a href="' + String(document.location).replace(/[?&]h=true/,'') + '">show labels</a>'
  }
  document.getElementById('graph-link-placeholder').innerHTML += labelsControl
  var CHROME_URL_LIMIT = 10000
  if (shareLinkUrl.length < CHROME_URL_LIMIT) {
    document.getElementById('graph-link-placeholder').innerHTML += '&nbsp;<a href="'+shareLinkUrl+'">share graph</a>&nbsp;';
  }
  else {
    document.getElementById('graph-link-placeholder').innerHTML += '&nbsp;too big to share. try hiding labels.';
  }
}

function loadConfigDocument() {
  SYNCHRONOUS=false
  if (window.XMLHttpRequest) { // code for IE7+, Firefox, Chrome, Opera, Safari
    xmlHttp=new XMLHttpRequest();
  }
  else { // code for IE6, IE5
    xmlHttp=new ActiveXObject("Microsoft.XMLHTTP");
  }

  configUrl=getParameterByName("configUrl") || "sample.xml";
  xmlHttp.open("GET", configUrl, SYNCHRONOUS)
  xmlHttp.withCredentials = "true"; // Tells the browser to send authentication cookies.
  xmlHttp.send();
  return xmlHttp.responseXML;
}
function getParameterByName(name, url) {
  var url = typeof url !== 'undefined' ? url : window.location.href
  name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
  var regexS = "[\\?&]" + name + "=([^&#]*)";
  var regex = new RegExp(regexS);
  var results = regex.exec(url);
  if(results == null)
    return null;
  else
    return decodeURIComponent(results[1].replace(/\+/g, " "));
}

function linkRespectingRadius(d) {
  // Total difference in x and y from source to target
  diffX = d.target.x - d.source.x;
  diffY = d.target.y - d.source.y;

  // Length of path from center of source node to center of target node
  pathLength = Math.sqrt((diffX * diffX) + (diffY * diffY));
  radiusOfTarget=d.target.size+7
  // x and y distances from center to outside edge of target node
  offsetX = (diffX * radiusOfTarget) / pathLength;
  offsetY = (diffY * radiusOfTarget) / pathLength;

  return "M" + d.source.x + "," + d.source.y + "L" + (d.target.x - offsetX) + "," + (d.target.y - offsetY);
}
function parseXMLFromForm() {
  var xml = document.getElementById('config-xml').value;
  var xmlDoc
  if (window.DOMParser)
  {
  parser=new DOMParser();
  xmlDoc=parser.parseFromString(xml,"text/xml");
  }
else // Internet Explorer
  {
  xmlDoc=new ActiveXObject("Microsoft.XMLDOM");
  xmlDoc.async=false;
  xmlDoc.loadXML(xml);
  }
  dataIsLoaded(buildGraphFromXML(xmlDoc))
}
