import rawdata from './rawdata.js';

// transform the data into a useful representation
// 1 is inner, 2, is outer

// need: inner, outer, links
//
// inner:
// links: { inner: outer: }

var outer = d3.map();
var inner = [];
var links = [];

var outerId = [0];

rawdata["papers"].forEach(function(d){

       if (d == null)
           return;

       let i = { id: 'i' + inner.length, name: d["name"],
             title: d["title"], url: d["url"],
             journal: d["journal"], description: d["description"],
             related_links: [] };

       i.related_nodes = [i.id];
       inner.push(i);

       if (!Array.isArray(d["forcefields"]))
           d["forcefields"] = [d["forcefields"]];

       d["forcefields"].forEach(function(d1){
          let o = outer.get(d1);

           if (o == null)
           {
               o = { name: d1,    id: 'o' + outerId[0], related_links: [] };
               o.related_nodes = [o.id];
               outerId[0] = outerId[0] + 1;

               outer.set(d1, o);
           }

           // create the links
           let l = { id: 'l-' + i.id + '-' + o.id, inner: i, outer: o }
           links.push(l);

           // and the relationships
           i.related_nodes.push(o.id);
           i.related_links.push(l.id);
           o.related_nodes.push(i.id);
           o.related_links.push(l.id);
       });
});

let data = {
    inner: inner,
    outer: outer.values(),
    links: links
}

//data.outer = data.outer.sort()
data.outer.sort(function(a, b){
    if(a.name < b.name) return -1;
    if(a.name > b.name) return 1;
    return 0;
})
// sort the data -- TODO: have multiple sort options
//outer = data.outer;
//data.outer = Array(outer.length);


//var i1 = 0;
//var i2 = outer.length - 1;

//for (var i = 0; i < data.outer.length; ++i)
//{
//    if (i % 2 == 1)
//        data.outer[i2--] = outer[i];
//    else
//        data.outer[i1++] = outer[i];
//}

console.log(data.outer.reduce(function(a,b) { return a + b.related_links.length; }, 0) / data.outer.length);


// from d3 colorbrewer:
// This product includes color specifications and designs developed by Cynthia Brewer (http://colorbrewer.org/).
var colors = ["#a50026","#d73027","#f46d43","#fdae61","#fee090","#ffffbf","#e0f3f8","#abd9e9","#74add1","#4575b4","#313695"]
var color = d3.scale.linear()
    .domain([60, 220])
    .range([colors.length-1, 0])
    .clamp(true);

var diameter = 960;
var rect_width = 180;
var rect_height = 14;

var link_width = "1px";

var il = data.inner.length;
var ol = data.outer.length;

var inner_y = d3.scale.linear()
    .domain([0, il])
    .range([-(il * rect_height)/2, (il * rect_height)/2]);

let mid = (data.outer.length/2.0)
var outer_x = d3.scale.linear()
    .domain([0, mid, mid, data.outer.length])
    .range([15, 170, 190 ,355]);

var outer_y = d3.scale.linear()
    .domain([0, data.outer.length])
    .range([0, diameter / 2 - 120]);


// setup positioning
data.outer = data.outer.map(function(d, i) {
    d.x = outer_x(i);
    d.y = diameter/2.5;
    return d;
});

data.inner = data.inner.map(function(d, i) {
    d.x = -(rect_width / 2);
    d.y = inner_y(i);
    return d;
});

function get_color_ff(name)
{
    if (name.indexOf("CHARMM") !=-1) {
      return '#d7191c';
    } else if (name.indexOf("GROMOS") !=-1) {
      return '#fdae61'
    } else if (name.indexOf("OPLS") !=-1) {
      return '#2b83ba'
    } else if (name.indexOf("AMBER") !=-1) {
      return '#abdda4'
    } else {
      return '#ffffbf';    // fallback color
    }
}

function get_color(name)
{
    var c = Math.round(color(name));
    if (isNaN(c))
        return '#dddddd';    // fallback color

    return colors[c];
}

// Can't just use d3.svg.diagonal because one edge is in normal space, the
// other edge is in radial space. Since we can't just ask d3 to do projection
// of a single point, do it ourselves the same way d3 would do it.


function projectX(x)
{
    return ((x - 90) / 180 * Math.PI) - (Math.PI/2);
}

var diagonal = d3.svg.diagonal()
    .source(function(d) { return {"x": d.outer.y * Math.cos(projectX(d.outer.x)),
                                  "y": -d.outer.y * Math.sin(projectX(d.outer.x))}; })
    .target(function(d) { return {"x": d.inner.y + rect_height/2,
                                  "y": d.outer.x > 180 ? d.inner.x : d.inner.x + rect_width}; })
    .projection(function(d) { return [d.y, d.x]; });


//Create SVG element
var svg = d3.select("#map_container")
            .append("svg")
            .attr("width", diameter)
            .attr("height", diameter)
            .append("g")
            .attr("transform", "translate(" + diameter / 2 + "," + diameter / 2 + ")");

            // Define column headers and datatypes
            var columns = [
            { head: 'Citation', cl:'name', html: function(row) { return "<a href=\"" + row.url + "\">" + row.name + "</a>"; } },
            { head: 'Title', cl:'title', html: function(row) { return row.title; } } ];

            var table = d3.select("#table_container").append("table"),
            thead = table.append("thead"),
            tbody = table.append("tbody");

             // append the header row
             thead.append("tr")
                   .selectAll("th")
                   .data(columns)
                   .enter()
                   .append("th")
                   .attr('class', function(f) { return f.cl })
                   .text(function(f) { return f.head })

             table.append('tbody')
                .selectAll('tr')
                .data(data.inner).enter()
                .append('tr')
                .selectAll('td')
                .data(function(row, i) {
                    // evaluate column objects against the current row
                    return columns.map(function(c) {
                        var cell = {};
                        d3.keys(c).forEach(function(k) {
                            cell[k] = typeof c[k] == 'function' ? c[k](row,i) : c[k];
                        });
                        return cell;
                    });
                }).enter()
                .append('td')
                .html(function(f) { return f.html })
                .attr('class', function(f) { return f.cl });

// links
var link = svg.append('g').attr('class', 'links').selectAll(".link")
    .data(data.links)
  .enter().append('path')
    .attr('class', 'link')
    .attr('id', function(d) { return d.id })
    .attr("d", diagonal)
    .attr('stroke', function(d) { return get_color_ff(d.outer.name); })
    .attr('stroke-width', link_width);

// outer nodes

var onode = svg.append('g').selectAll(".outer_node")
    .data(data.outer)
  .enter().append("g")
    .attr("class", "outer_node")
    .attr("transform", function(d) { return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")"; })
    .on("mouseover", mouseover)
    .on("mouseout", mouseout);

onode.append("circle")
    .attr('id', function(d) { return d.id })
    .attr("r", 4.5);

onode.append("circle")
    .attr('r', 20)
    //.attr('stroke', function(d) { return get_color_ff(d.outer.name); })
    .attr('visibility', 'hidden');

onode.append("text")
    .attr('id', function(d) { return d.id + '-txt'; })
    .attr("dy", ".31em")
    .attr('stroke', function(d) { return get_color_ff(d.name); })
    .attr("text-anchor", function(d) { return d.x < 180 ? "start" : "end"; })
    .attr("transform", function(d) { return d.x < 180 ? "translate(8)" : "rotate(180)translate(-8)"; })
    .text(function(d) { return d.name; });

// inner nodes

var inode = svg.append('g').selectAll(".inner_node")
    .data(data.inner)
  .enter().append("g")
    .attr("class", "inner_node")
    .attr("transform", function(d, i) { return "translate(" + d.x + "," + d.y + ")"})
    .on("mouseover", mouseover)
    .on("mouseout", mouseout);

inode.append("a")
    .attr("xlink:href", function(d) { return d.url; })
    .append("rect")
    .attr('width', rect_width)
    .attr('height', rect_height)
    .attr('id', function(d) { return d.id; })
    .attr('fill', function(d) { return get_color(d.name); });

inode.append("text")
    .attr('id', function(d) { return d.id + '-txt'; })
    .attr('text-anchor', 'middle')
    .attr("transform", "translate(" + rect_width/2 + ", " + rect_height * .75 + ")")
    .text(function(d) { return d.name; });

// need to specify x/y/etc

d3.select(self.frameElement).style("height", diameter - 150 + "px");

function mouseover(d)
{
    // bring to front
    d3.selectAll('.links .link').sort(function(a, b){ return d.related_links.indexOf(a.id); });

    for (var i = 0; i < d.related_nodes.length; i++)
    {
        d3.select('#' + d.related_nodes[i]).classed('highlight', true);
        d3.select('#' + d.related_nodes[i] + '-txt').attr("font-weight", 'bold');
    }

    for (var i = 0; i < d.related_links.length; i++)
        d3.select('#' + d.related_links[i]).attr('stroke-width', '5px');
}

function mouseout(d)
{
    for (var i = 0; i < d.related_nodes.length; i++)
    {
        d3.select('#' + d.related_nodes[i]).classed('highlight', false);
        d3.select('#' + d.related_nodes[i] + '-txt').attr("font-weight", 'normal');
    }

    for (var i = 0; i < d.related_links.length; i++)
        d3.select('#' + d.related_links[i]).attr('stroke-width', link_width);
}
