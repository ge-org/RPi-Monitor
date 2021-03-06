//Load data from localStorage
var activestat;
var graphconf;
var pageid;

function Start() {
  $.getJSON('statistic.json', function (data) {
    localStorage.setItem('graphconf', JSON.stringify(data));
    graphconf = eval('(' + localStorage.getItem('graphconf') + ')');
    activestat = localStorage.getItem('activestat') || 0;
    pageid = 0;
    FetchGraph();
  })
  .fail(function () {
    $('#message').html("<b>Can not get information (statistics.json) from RPi-Monitor server.</b>");
    $('#message').removeClass('hide');
  })
}

function SetGraphlist() {
  var graphlist = "Graph: <select id='selected_graph'>\n";
  for (var iloop = 0; iloop < graphconf[pageid].content.length; iloop++) {
    graphlist += "<option value='" + iloop + "'";
    if (activestat == iloop) {
      graphlist += " selected ";
    }
    graphlist += ">" + graphconf[pageid].content[iloop].name + "</option>\n";
  }
  graphlist += "</select>\n";

  $("#mygraph_res_title").html(graphlist);
  
  $('#selected_graph').on('change', function (e) {
    activestat = this.value;
    localStorage.setItem('activestat', activestat);
    FetchGraph();
  });
}

function FetchGraph() {
  $('#preloader').removeClass('hide');
  graph = graphconf[pageid].content[activestat].graph;
  try {
    for (var iloop = 0; iloop < graph.length; iloop++) {
      FetchBinaryURLAsync('stat/' + graph[iloop] + '.rrd', UpdateHandler, iloop);
    }
  } catch (err) {
    alert("Failed loading stat/" + graph[iloop] + ".rrd\n" + err);
  }
}

function UpdateHandler(bf, idx) {
  var i_rrd_data = undefined;
  graph = graphconf[pageid].content[activestat].graph;
  try {
    var i_rrd_data = new RRDFile(bf);
  } catch (err) {
    alert("File stat/" + graph[idx] + ".rrd is not a valid RRD archive!");
  }
  if (i_rrd_data != undefined) {
    rrd_data[idx] = i_rrd_data;
    PrepareGraph(idx);
  }
  ready = 0;
  for (var iloop = 0; iloop < graph.length; iloop++) {
    if (rrd_data[iloop] != undefined) {
      ready++
    }
  }
  if (ready == graph.length) {
    UpdateGraph()
  }
}

function DoNothing(ds) {
  this.getName = function () {
    return ds;
  }
  this.getDSNames = function () {
    return [ds];
  }
  this.computeResult = function (val_list) {
    return val_list[0];
  }
}

function Zero(ds_name) { //create a fake DS.
  this.getName = function () {
    return ds_name;
  }
  this.getDSNames = function () {
    return [];
  }
  this.computeResult = function (val_list) {
    return 0;
  }
}

function PrepareGraph(idx) {
  // http://javascriptrrd.sourceforge.net/docs/javascriptrrd_v0.6.0/src/examples/rrdJFlotFilter.html
  // http://sourceforge.net/p/javascriptrrd/discussion/914914/thread/935d8541/#17d3
  // Create a RRDFilterOp object that has the all DS's, with the one
  // existing in the original RRD populated with real values, and the other set to 0.
  graph = graphconf[pageid].content[activestat].graph;
  var op_list = []; //list of operations
  //create a new rrdlist, which contains all original elements (kept the same by DoNothing())
  for (var iloop = 0; iloop < graph.length; iloop++) {
    if (iloop != idx) {
      op_list.push(new Zero(graph[iloop]));
    }
    else {
      op_list.push(new DoNothing(rrd_data[idx].getDS(0).getName()));
    }
  }
  rrd_data[idx] = new RRDFilterOp(rrd_data[idx], op_list);
}

function UpdateGraph() {
  graph_opts=null;
  ds_graph_opts=null;
  rrdflot_defaults={ graph_width:"750px",graph_height:"285px", scale_width:"350px", scale_height:"90px" };
  pageid = 0;
  ds_graph_opts = graphconf[pageid].content[activestat].ds_graph_opts;

  rrd_data_sum = new RRDFileSum( rrd_data );
  var f = new rrdFlot("mygraph", rrd_data_sum, graph_opts, ds_graph_opts, rrdflot_defaults );
  SetGraphlist();
  $('#preloader').addClass('hide');
  $('#Legend').addClass('hide');
}

$(function () {
  // Remove the Javascript warning
  document.getElementById("infotable").deleteRow(0);

  rrd_data = [];

  $.ajaxSetup({
    cache : false
  });

  Start();
});
