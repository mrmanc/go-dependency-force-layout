#!/usr/bin/awk -f
BEGIN{PROCINFO["sorted_in"]="@ind_num_asc"}
$0 ~ /<pipelines / {
	split($2,groupBits,"\"")
	pipelineGroup=groupBits[2]
	nodeIndex++
	nodeIndex--
}
inMaterials==0 && $0 ~ /<pipeline name=/ {
	split($2, name, "\"")
	currentPipeline=name[2]
	nodeIndices[currentPipeline]=nodeIndex
	nodes[nodeIndex]="{\"name\":\"" currentPipeline "\", \"group\": \"" pipelineGroup "\", \"shape\": \"circle\"},"
	nodeIndex++
}
$0 ~ /<materials>/ {
	inMaterials=1
}
$0 ~ /<\/materials>/ {
	inMaterials=0
}
inMaterials==1 && $0 ~ /<pipeline / {
	split($2, name, "\"")
	links[linkIndex++]=currentPipeline "," name[2]
}
inMaterials==1 && $0 ~ /url="/ {
	split($2, urlBits, "\"")
	url=urlBits[2]
	node="{\"name\":\"" url "\", \"group\": \"Source Code\"},"
	if (! nodeIndices[url]) {
		nodeIndices[url]=nodeIndex
		nodes[nodeIndex++]="{\"name\":\"" url "\", \"group\": \"Source Code\", \"shape\": \"triangle-up\"},"
	}
	links[linkIndex++]=currentPipeline "," url
}

END {
	print "var graph = {\n\"nodes\":["
	for(n in nodes) {
		print nodes[n]
	}
	print "],\n\"links\":["
	for (l in links){
		split(links[l], edge, ",")
		print "{\"source\":" nodeIndices[edge[1]] ", \"target\":" nodeIndices[edge[2]] ", \"value\": 1},"
	}
	print "]\n};"
	print "// there were " length(nodes) " nodes and " length(links) " links."
}