window.onload = main;

function main() {
    var width = window.innerWidth,
        height = window.innerHeight;

    var svg = d3.select("svg");

    var projection = d3
        .geoMercator()
        .center([121.5654, 25.085]) // 中心點(經緯度)
        .scale(width * 90) // 放大倍率
        .translate([width / 3, height / 2]) // 置中
        .precision(0.1);
    var path = d3.geoPath().projection(projection);

    const zoom = d3.zoom().scaleExtent([0.6, 100]).on("zoom", zoomed);
    svg.call(zoom);

    function zoomed() {
        svg.selectAll("g") // To prevent stroke width from scaling
            .attr("transform", d3.event.transform);
    }

    // Data and color scale
    var colorScale = d3
        .scaleThreshold()
        .domain([100, 200, 400, 700, 1000, 1500, 2000])
        .range(d3.schemeBlues[7]);

    var files = ["https://raw.githubusercontent.com/PM25/DataVisualization-YouBike/master/data/TOWN_MOI_1090324.json","https://raw.githubusercontent.com/ycychsiao/tmp/master/Taipei_UBike_site.json"];
    //var site_points = "https://raw.githubusercontent.com/ycychsiao/tmp/master/Taipei_UBike_site.json";
    var ubike = "https://tcgbusfs.blob.core.windows.net/blobyoubike/YouBikeTP.json";
    
    Promise.all(files.map((url) => d3.json(url))).then(function (values) {
        
    //   setInterval(function() { 動態去網頁抓json -> 區間可以調；我先註解掉要不然一直跑很麻煩
         
          d3.json(ubike).then(function(data) {
            
           
            
            var sbi=[];
            var sna=[];
            for (let key in data["retVal"]) {
                sna.push(data["retVal"][key]["sna"]);
                sbi.push(data["retVal"][key]["sna"]);
            }
            
            /*
            var area_data = {};
            for (let key in data["retVal"]) {
                area = data["retVal"][key];
                if (area in area_data) {
                    area_data[area].push(ubike_data[key]);
                } else {
                    area_data[area] = [];
                }
            }
                var area_data = {};
                area_data[key]["total"]["tot"] = area_data[key], "tot";
                area_data[key]["total"]["sbi"] = sumup(area_data[key], "sbi");
                area_data[key]["total"]["bemp"] = sumup(area_data[key], "bemp");*/
           
            //svg.select("g").selectAll("circle").remove();
           
            
            var update = group.selectAll("circle")
            .data(sna)
            .on("mouseover", function (d, i) {
                
                 svg.append("text").attr("class", "title-text")
                    .style("fill", "black")
                    .text(sna[i])
                    .attr("text-anchor", "middle")
                    .attr("x", width-165) //需要調
                    .attr("y", height-500);
            })
            .on("mouseout", function (d) {
                svg.select(".title-text").remove();
            });
            
        });  
        //}, 2000);
        sites = values[1];
        
        var coordinates=[]
        for (var key in sites["id"]){
          coordinates.push(Object.values(sites["id"][key])[0]);	
        }
      
        for(var i = 0; i < coordinates.length; i++) {
           coordinates[i] = projection(coordinates[i]);
        }
        //console.log(coordinates)
        /*
        // Load Data
        ubike_data = values[1];
      
        function sumup(arr, key) {
            total = 0;
            for (var i = 0; i < arr.length; ++i) {
                total += parseInt(arr[i][key]);
            }
            return total;
        }

        var area_data = {};

        for (let key in ubike_data) {
            area = ubike_data[key]["sarea"];
            if (area in area_data) {
                area_data[area].push(ubike_data[key]);
            } else {
                area_data[area] = [];
            }
        }

        for (let key in area_data) {
            area_data[key]["total"] = {};
            area_data[key]["total"]["tot"] = sumup(area_data[key], "tot");
            area_data[key]["total"]["sbi"] = sumup(area_data[key], "sbi");
            area_data[key]["total"]["bemp"] = sumup(area_data[key], "bemp");
        }*/

        // Draw Map
        taiwan = values[0];
        
        taipei_features = topojson
            .feature(taiwan, taiwan.objects.TOWN_MOI_1090324)
            .features.filter(function (data) {
                // console.log(data.properties.COUNTYNAME);
                return data.properties.COUNTYNAME == "臺北市";
            });

        non_taipei_features = topojson
            .feature(taiwan, taiwan.objects.TOWN_MOI_1090324)
            .features.filter(function (data) {
                // console.log(data.properties.COUNTYNAME);
                return data.properties.COUNTYNAME != "臺北市";
            });
        
         var group = svg.selectAll("g")
                    .data(taipei_features)
                    .enter()
                    .append("g")
         
         
         group.selectAll("circle")
            .data(coordinates)
            .enter()
            .append("circle")
			.attr("class", "point")
			.attr("cx", 
				function(d,i){return coordinates[i][0];}
			)
			.attr("cy", 
               function(d,i){return coordinates[i][1];}
			)
			.attr("fill", "red")
			.attr("r", 1);
           /* .on("click", function(){
              //在这里添加交互内容
              console.log("hey");
            });*/
      
        // Draw Taipei City
        
         group.append("path")
            .attr("class", "taipei")
            .attr("d", path)
            .attr("fill", function (data) {
                // data.total = area_data.get(data.TOWNNAME) || 0;
                console.log(
                    data.properties.TOWNNAME,
                    area_data[data.properties.TOWNNAME]["total"]["bemp"]
                );
                return colorScale(
                    area_data[data.properties.TOWNNAME]["total"]["bemp"]
                );
            })
            .attr("id", (data) => {
                return "city" + data.properties.TOWNID;
            })
            .on("mouseover", (data) => {
                document.querySelector(".info .content").innerHTML =
                    data.properties.TOWNNAME;
            });
      
        // Draw Towns that is not Taipei
       /* svg.selectAll("path.non-taipei")
            .data(non_taipei_features)
            .enter()
            .append("path")
            .attr("class", "non-taipei")
            .attr("d", path);

        // Draw Boundary
        svg.append("path")
            .datum(
                topojson.mesh(
                    taiwan,
                    taiwan.objects.TOWN_MOI_1090324
                    // function (a, b) {
                    //     return (
                    //         a.properties.COUNTYNAME == "臺北市" ||
                    //         b.properties.COUNTYNAME == "臺北市"
                    //     );
                    // }
                )
            )
            .attr("d", path)
            .attr("class", "boundary");*/
        
    });
}
