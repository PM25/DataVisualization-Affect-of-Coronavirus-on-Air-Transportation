window.onload = main;

function main() {
    var width = window.innerWidth,
        height = window.innerHeight;

    var svg = d3.select("svg");

    var projection = d3
        .geoOrthographic()
        .scale(700) // 放大倍率
        .center([0, 0])
        .rotate([-121.5654, -25.033])
        .translate([width / 2, height / 2]); // 置中
    var path = d3.geoPath().projection(projection);

    const initialScale = projection.scale();
    const zoom = d3.zoom().scaleExtent([0.6, 10]).on("zoom", zoomed);
    const sensitivity = 50;
    // svg.call(
    //     d3.drag().on("drag", () => {
    //         const rotate = projection.rotate();
    //         const k = sensitivity / projection.scale();
    //         projection.rotate([
    //             rotate[0] + d3.event.dx * k,
    //             rotate[1] - d3.event.dy * k,
    //         ]);
    //         path = d3.geoPath().projection(projection);
    //         svg.selectAll("path").attr("d", path);
    //     })
    // ).call(
    //     d3.zoom().on("zoom", () => {
    //         if (d3.event.transform.k > 0.3) {
    //             projection.scale(initialScale * d3.event.transform.k);
    //             path = d3.geoPath().projection(projection);
    //             svg.selectAll("path").attr("d", path);
    //             globe.attr("r", projection.scale());
    //         } else {
    //             d3.event.transform.k = 0.3;
    //         }
    //     })
    // );

    function zoomed() {
        svg.selectAll("path") // To prevent stroke width from scaling
            .attr("transform", d3.event.transform);
    }

    var files = [
        "https://unpkg.com/world-atlas@1/world/110m.json",
        "data/flights.csv",
    ];

    var promises = [];
    files.forEach((url) => {
        let splited_url = url.split(".");
        if (splited_url[splited_url.length - 1] == "json") {
            promises.push(d3.json(url));
        } else if (splited_url[splited_url.length - 1] == "csv") {
            promises.push(d3.csv(url));
        }
    });

    taiwan_coords = [121.5654, 25.033];
    Promise.all(promises).then(function (values) {
        flights_data = values[1];
        flights_data_dict = {};
        for (let i = 0; i < flights_data.length; ++i) {
            let code = flights_data[i]["代碼"];
            flights_data_dict[code] = flights_data[i];
        }

        var tooltip = d3
            .select("body")
            .append("div")
            .style("position", "absolute")
            .style("z-index", "10")
            .style("visibility", "hidden")
            .style("background", "#fffc")
            .style("padding", "1px 5px")
            .style("font-size", "1.2em")
            .style("border-radius", ".5em");

        // Draw Map
        world = values[0];
        world = topojson.feature(world, world.objects.countries);

        let globe = svg
            .append("circle")
            .attr("fill", "#588da8")
            .attr("stroke", "#000")
            .attr("stroke-width", "0.2")
            .attr("cx", width / 2)
            .attr("cy", height / 2)
            .attr("r", initialScale)
            .attr("class", "globe")
            .on("click", function () {
                d3.select("#infobox").style("visibility", "hidden");
            });

        svg.selectAll("path")
            .data(world.features)
            .enter()
            .append("path")
            .attr("class", "world")
            .attr("d", path)
            .attr("id", (d) => "country" + d.id)
            .on("mouseover", function (d) {
                if (d.id in flights_data_dict) {
                    set_tooltip(d.id);
                    tooltip.style("visibility", "visible");
                    d3.select("#link" + d.id).style("opacity", 1);
                    d3.select(this).style("fill", "#ffb367aa");
                }
            })
            .on("mousemove", function () {
                return tooltip
                    .style("top", event.pageY - 10 + "px")
                    .style("left", event.pageX + 10 + "px");
            })
            .on("mouseout", function (d) {
                tooltip.style("visibility", "hidden");
                if (d.id in flights_data_dict) {
                    d3.select("#link" + d.id).style("opacity", 0.25);
                    d3.select(this).style("fill", "#639a67");
                }
            })
            .on("click", function (d) {
                if (d.id in flights_data_dict) {
                    d3.select("#infobox").style("visibility", "visible");
                    d3.select("#infobox .title")
                        .text(flights_data_dict[d.id]["國家"])
                        .style("font-size", "1.5em");
                    d3.select("#infobox .content").html(
                        "2019年 12月: " +
                            flights_data_dict[d.id]["12月"] +
                            "<br>" +
                            "2020年 1月: " +
                            flights_data_dict[d.id]["1月"] +
                            "<br>" +
                            "2020年 2月: " +
                            flights_data_dict[d.id]["2月"] +
                            "<br>" +
                            "2020年 3月: " +
                            flights_data_dict[d.id]["3月"]
                    );
                } else {
                    d3.select("#infobox").style("visibility", "hidden");
                }
            });

        // Draw Boundary
        svg.append("path")
            .datum(world)
            .attr("d", path)
            .attr("class", "boundary");

        drawGraticule();

        // Top 10 flight export countries
        flights_data = values[1];

        var links = [];
        var out_links = [];
        for (let i = 0; i < 10; ++i) {
            let code = flights_data[i]["代碼"];
            let target_coords = [
                parseFloat(flights_data[i]["緯度"]),
                parseFloat(flights_data[i]["經度"]),
            ];

            links.push({
                type: "LineString",
                code: code,
                coordinates: [target_coords, taiwan_coords],
            });
            out_links.push({
                type: "LineString",
                code: code,
                coordinates: [taiwan_coords, target_coords],
            });
        }

        d3.select("#infobox")
            .style("visibility", "hidden")
            .style("background", "#fffa");

        draw_links(links);
        var myLinks, people;
        function draw_links(links) {
            let myLinks_base = svg.selectAll("_path").data(links).enter();
            myLinks = myLinks_base
                .append("path")
                .attr("d", (d) => path(d))
                .attr("class", "link")
                .attr("id", (d) => "link" + d.code)
                .style("fill", "none")
                .style("stroke-width", initialScale / 150)
                .on("mouseover", function (d) {
                    // tooltip.text(flights_data_dict[d.code]["國家"]);
                    set_tooltip(d.code);
                    tooltip.style("visibility", "visible");
                    d3.select(this).style("opacity", 1);
                    d3.select("#country" + d.code).style("fill", "#ffb367aa");
                })
                .on("mousemove", function () {
                    return tooltip
                        .style("top", event.pageY - 10 + "px")
                        .style("left", event.pageX + 10 + "px");
                })
                .on("mouseout", function (d) {
                    tooltip.style("visibility", "hidden");
                    d3.select(this).style("opacity", 0.25);
                    d3.select("#country" + d.code).style("fill", "#639a67");
                })
                .on("click", function (d) {
                    d3.select("#infobox").style("visibility", "visible");
                    d3.select("#infobox .title")
                        .text(flights_data_dict[d.code]["國家"])
                        .style("font-size", "1.5em");
                    d3.select("#infobox .content").html(
                        "2019年 12月: " +
                            flights_data_dict[d.code]["12月"] +
                            "<br>" +
                            "2020年 1月: " +
                            flights_data_dict[d.code]["1月"] +
                            "<br>" +
                            "2020年 2月: " +
                            flights_data_dict[d.code]["2月"] +
                            "<br>" +
                            "2020年 3月: " +
                            flights_data_dict[d.code]["3月"]
                    );
                })
                .call(transition);

            people = myLinks_base
                .append("circle")
                .attr("id", (d) => "point" + d.code)
                .attr("r", initialScale / 150)
                .style("fill", "orange")
                .style("opacity", 0.9)
                .call(foo);
        }

        function set_tooltip(id) {
            tooltip.text(
                flights_data_dict[id]["國家"]
                // flights_data_dict[id]["12月"]
            );
        }

        function foo(paths) {
            paths
                .transition()
                .delay(1500)
                .duration(6000)
                .ease(d3.easePoly)
                .tween("pathTween", function (d, i) {
                    return pathTween(myLinks.nodes()[i]);
                })
                .on("end", foo2);
        }

        function foo2() {
            people
                .transition()
                .delay(250)
                .duration(6000)
                .ease(d3.easePoly)
                .tween("pathTween", function (d, i) {
                    return pathTween(myLinks.nodes()[i]);
                })
                .on("end", foo2);
        }

        function pathTween(path_node) {
            let length = path_node.getTotalLength(); // Get the length of the path
            let r = d3.interpolate(0, length); //Set up interpolation from 0 to the path length
            return function (t) {
                var point = path_node.getPointAtLength(r(t)); // Get the next point along the path
                // console.log(path.node().getPointAtLength(length));
                // console.log(path.node().getPointAtLength(r(t)));
                d3.select(this) // Select the circle
                    .attr("r", (1 + t * 2 * projection.scale()) / 150)
                    .attr("cx", point.x) // Set the cx
                    .attr("cy", point.y); // Set the cy
            };
        }

        function transition(path) {
            path.transition()
                .duration(3000)
                .attrTween("stroke-dasharray", tweenDash)
                .on("end", function (d, i) {
                    d3.select(this).style("stroke-dasharray", "none");
                });
        }

        function tweenDash() {
            var l = this.getTotalLength(),
                i = d3.interpolateString("0," + l, l + "," + l);
            return function (t) {
                return i(t);
            };
        }

        svg.call(
            d3.drag().on("drag", () => {
                const rotate = projection.rotate();
                const k = sensitivity / projection.scale();
                projection.rotate([
                    rotate[0] + d3.event.dx * k,
                    rotate[1] - d3.event.dy * k,
                ]);
                path = d3.geoPath().projection(projection);
                svg.selectAll("path").attr("d", path);

                people.attr("x", function (d, i) {
                    let path_node = myLinks.nodes()[i];
                    let length = path_node.getTotalLength(); // Get the length of the path
                    let point = path_node.getPointAtLength(length);
                    d3.select(this).attr("cx", point.x).attr("cy", point.y);
                });
            })
        ).call(
            d3.zoom().on("zoom", () => {
                if (d3.event.transform.k < 0.3) {
                    d3.event.transform.k = 0.3;
                } else if (d3.event.transform.k > 15) {
                    d3.event.transform.k = 15;
                } else {
                    projection.scale(initialScale * d3.event.transform.k);
                    path = d3.geoPath().projection(projection);
                    svg.selectAll("path").attr("d", path);
                    globe.attr("r", projection.scale());
                    myLinks.style("stroke-width", projection.scale() / 150);
                    people.attr("r", projection.scale() / 150);

                    people.attr("x", function (d, i) {
                        let path_node = myLinks.nodes()[i];
                        let length = path_node.getTotalLength(); // Get the length of the path
                        let point = path_node.getPointAtLength(length);
                        d3.select(this).attr("cx", point.x).attr("cy", point.y);
                    });
                }
            })
        );

        var rotate = false;
        var rotation_timer = enableRotation();
        rotation_timer.stop();
        d3.select("#repeat-btn").on("click", function () {
            if (!rotate) {
                rotation_timer.restart(function (elapsed) {
                    const rotate = projection.rotate();
                    const k = sensitivity / projection.scale();
                    projection.rotate([rotate[0] - 1 * k, rotate[1]]);
                    path = d3.geoPath().projection(projection);
                    svg.selectAll("path").attr("d", path);
                    people.attr("x", function (d, i) {
                        let path_node = myLinks.nodes()[i];
                        let length = path_node.getTotalLength(); // Get the length of the path
                        let point = path_node.getPointAtLength(length);
                        d3.select(this).attr("cx", point.x).attr("cy", point.y);
                    });
                });
                rotate = true;
                d3.select(this).style("background", "#7777");
            } else {
                rotation_timer.stop();
                rotate = false;
                d3.select(this).style("background", "none");
            }
        });

        var departure = false;
        d3.select("#departure-btn").on("click", function () {
            if (departure) {
                people.remove();
                myLinks.remove();
                draw_links(links);
                departure = false;
                d3.select(this).style("background", "none");
            } else {
                people.remove();
                myLinks.remove();
                draw_links(out_links);
                departure = true;
                d3.select(this).style("background", "#7777");
            }
        });

        // enableRotation();
        function enableRotation() {
            let roatation_timer = d3.interval(function (elapsed) {
                const rotate = projection.rotate();
                const k = sensitivity / projection.scale();
                projection.rotate([rotate[0] - 1 * k, rotate[1]]);
                path = d3.geoPath().projection(projection);
                svg.selectAll("path").attr("d", path);
                people.attr("x", function (d, i) {
                    let path_node = myLinks.nodes()[i];
                    let length = path_node.getTotalLength(); // Get the length of the path
                    let point = path_node.getPointAtLength(length);
                    d3.select(this).attr("cx", point.x).attr("cy", point.y);
                });
            }, 500);

            return roatation_timer;
        }

        function drawGraticule() {
            const graticule = d3.geoGraticule().step([10, 10]);

            svg.append("path")
                .datum(graticule)
                .attr("class", "graticule")
                .attr("d", path)
                .style("fill", "none")
                .style("stroke", "#cccc")
                .style("stroke-width", 0.2);
        }
    });
}
