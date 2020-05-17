window.onload = main;

function main() {
    var width = window.innerWidth,
        height = window.innerHeight;

    var svg = d3.select("svg");

    const translation = [width / 2, height / 2];
    var projection = d3
        .geoOrthographic()
        .scale(700) // 放大倍率
        .center([0, 0])
        .rotate([-121.5654, -25.033])
        .translate(translation); // 置中
    var path = d3.geoPath().projection(projection);

    const InitialScale = projection.scale();
    const Sensitivity = 50;
    const TaiwanCoords = [121.5654, 25.033];
    const CountriesColor = "#639a67";
    const ZoomRange = [0.2, 15];
    const LinksScale = 0.01;

    var files = [
        "https://unpkg.com/world-atlas@1/world/110m.json",
        "data/flights.csv",
    ];

    var promises = [];
    files.forEach((url) => {
        let splitted_url = url.split(".");
        if (splitted_url[splitted_url.length - 1] == "json") {
            promises.push(d3.json(url));
        } else if (splitted_url[splitted_url.length - 1] == "csv") {
            promises.push(d3.csv(url));
        }
    });

    // Main Function
    Promise.all(promises).then(function (values) {
        let world = values[0];
        world = topojson.feature(world, world.objects.countries);

        // Convert {flights_data} to dictionary
        let flights_data = values[1],
            flights_data_dict = {};
        for (let i = 0; i < 10; ++i) {
            let code = flights_data[i]["代碼"];
            flights_data_dict[code] = flights_data[i];
        }

        var tooltip = create_tooltip();
        var infobox = create_infobox();
        var globe_bg = draw_globe_bg(infobox);
        var countries = draw_countries(
            world,
            tooltip,
            infobox,
            flights_data_dict
        );
        var boundries = draw_boundries(world);
        var graticule = draw_graticule();
        var links_data = create_links(flights_data);
        var in_links = links_data[0],
            out_links = links_data[1];
        var links_components = draw_links(
            flights_data_dict,
            in_links,
            infobox,
            tooltip,
            true
        );
        var links = links_components[0],
            points = links_components[1];

        enable_zoom_drag(globe_bg, links, points);
        var rotation_btn = new Rotation_Btn();
        var departure_btn = new Departure_Btn(
            flights_data_dict,
            links_components,
            in_links,
            out_links,
            infobox,
            tooltip
        );
    });

    function create_tooltip() {
        let tooltip = d3
            .select("body")
            .append("div")
            .style("position", "absolute")
            .style("z-index", "5")
            .style("visibility", "hidden")
            .style("background", "#fffc")
            .style("padding", ".1em .5em")
            .style("font-size", "1.2em")
            .style("border-radius", ".3em");

        return tooltip;
    }

    function create_infobox() {
        let infobox = d3
            .select("body")
            .append("div")
            .style("position", "fixed")
            .style("right", 0)
            .style("bottom", 0)
            .style("width", "35vw")
            .style("height", "60vh")
            .style("background-color", "#ddd")
            .style("border-radius", ".5em")
            .style("margin", "1em")
            .style("margin-top", 0)
            .style("padding", "1em")
            .style("box-sizing", "border-box")
            .style("visibility", "hidden")
            .style("background", "#fffc");

        infobox
            .append("div")
            .attr("class", "title")
            .style("font-size", "1.5em");

        infobox.append("div").attr("class", "content");

        return infobox;
    }

    function draw_globe_bg(infobox) {
        let globe_bg = svg
            .append("circle")
            .attr("fill", "#588da8")
            .attr("stroke", "#000")
            .attr("stroke-width", "0.2")
            .attr("cx", translation[0])
            .attr("cy", translation[1])
            .attr("r", InitialScale)
            .attr("class", "globe_bg")
            .attr("cursor", "pointer")
            .on("click", function () {
                infobox.style("visibility", "hidden");
            });

        return globe_bg;
    }

    function draw_countries(world, tooltip, infobox, flights_data) {
        let countries = svg
            .selectAll("_path")
            .data(world.features)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("id", (d) => "country" + d.id)
            .style("fill", CountriesColor)
            .style("cursor", "pointer")
            .on("mouseover", function (d) {
                if (d.id in flights_data) {
                    set_tooltip(flights_data[d.id], tooltip);
                    highlight(d.id, true);
                } else {
                    d3.select(this).style("fill", "#3339");
                }
            })
            .on("mousemove", function () {
                tooltip
                    .style("top", event.pageY - 10 + "px")
                    .style("left", event.pageX + 10 + "px");
            })
            .on("mouseout", function (d) {
                tooltip.style("visibility", "hidden");
                highlight(d.id, false);
            })
            .on("click", function (d) {
                if (d.id in flights_data) {
                    show_info(flights_data[d.id], infobox);
                } else {
                    infobox.style("visibility", "hidden");
                }
            });

        return countries;
    }

    function highlight(code, on, country_color = "#ffb367aa") {
        if (on) {
            d3.select("#link" + code).style("opacity", 1);
            d3.select("#country" + code).style("fill", country_color);
        } else {
            d3.select("#link" + code).style("opacity", 0.25);
            d3.select("#country" + code).style("fill", CountriesColor);
        }
    }

    function show_info(flight_data, infobox) {
        infobox.style("visibility", "visible");
        infobox.select(".title").text(flight_data["國家"]);
        infobox
            .select(".content")
            .html(
                "2019年 12月: " +
                    flight_data["12月"] +
                    "<br>" +
                    "2020年 1月: " +
                    flight_data["1月"] +
                    "<br>" +
                    "2020年 2月: " +
                    flight_data["2月"] +
                    "<br>" +
                    "2020年 3月: " +
                    flight_data["3月"]
            );
    }

    function set_tooltip(flight_data, tooltip) {
        tooltip.text(flight_data["國家"]).style("visibility", "visible");
    }

    function draw_boundries(world) {
        let boundaries = svg
            .append("path")
            .datum(world)
            .attr("d", path)
            .style("fill", "none")
            .style("stroke", "#333")
            .style("stroke-width", "0.01em");

        return boundaries;
    }

    function draw_graticule(step = [10, 10]) {
        let graticule = svg
            .append("path")
            .datum(d3.geoGraticule().step(step))
            .attr("d", path)
            .style("fill", "none")
            .style("stroke", "#cccc")
            .style("stroke-width", 0.2);

        return graticule;
    }

    function create_links(flights_data, count = 10) {
        let in_links = [],
            out_links = [];

        for (let i = 0; i < count; ++i) {
            let code = flights_data[i]["代碼"];
            let target_coords = [
                parseFloat(flights_data[i]["緯度"]),
                parseFloat(flights_data[i]["經度"]),
            ];

            in_links.push({
                type: "LineString",
                code: code,
                coordinates: [target_coords, TaiwanCoords],
            });
            out_links.push({
                type: "LineString",
                code: code,
                coordinates: [TaiwanCoords, target_coords],
            });
        }

        return [in_links, out_links];
    }

    function draw_links(
        flights_data,
        links_data,
        infobox,
        tooltip,
        points_dynamic_scale = false,
        color = "#ffb367",
        link_duration = 3000,
        point_duration = 20000
    ) {
        let links_base = svg.selectAll("_path").data(links_data).enter();

        // Draw Links
        let links = links_base
            .append("path")
            .attr("d", (d) => path(d))
            .attr("class", "link")
            .attr("id", (d) => "link" + d.code)
            .style("fill", "none")
            .style("stroke-width", InitialScale / 150)
            .style("stroke-linecap", "round")
            .style("opacity", 0.25)
            .style("cursor", "pointer")
            .style("stroke", color)
            .on("mouseover", function (d) {
                set_tooltip(flights_data[d.code], tooltip);
                highlight(d.code, true);
            })
            .on("mousemove", function () {
                tooltip
                    .style("top", event.pageY - 10 + "px")
                    .style("left", event.pageX + 10 + "px");
            })
            .on("mouseout", function (d) {
                tooltip.style("visibility", "hidden");
                highlight(d.code, false);
            })
            .on("click", function (d) {
                show_info(flights_data[d.code], infobox);
            })
            .call(links_transition);

        // Draw Points
        var points = links_base
            .append("circle")
            .attr("id", (d) => "point" + d.code)
            .attr("r", InitialScale / 150)
            .attr("cx", (d, i) => {
                let path_node = links.nodes()[i],
                    point = path_node.getPointAtLength(0);
                return point.x;
            })
            .attr("cy", (d, i) => {
                let path_node = links.nodes()[i],
                    point = path_node.getPointAtLength(0);
                return point.y;
            })
            .style("transition-duration", "0.1s")
            .style("fill", "orange")
            .style("opacity", 0.9);
        points_transition(link_duration);

        function links_transition(path) {
            path.transition()
                .duration(link_duration)
                .attrTween("stroke-dasharray", tweenDash)
                .on("end", function () {
                    d3.select(this).style("stroke-dasharray", "none");
                });

            function tweenDash() {
                let l = this.getTotalLength(),
                    i = d3.interpolateString("0," + l, l + "," + l);
                return function (t) {
                    return i(t);
                };
            }
        }

        function points_transition(delay = 0) {
            points
                .transition()
                .delay(delay)
                .duration(point_duration)
                .ease(d3.easePolyOut.exponent(1.5))
                .tween("pathTween", function (d, i) {
                    return pathTween(links.nodes()[i], flights_data[d.code]);
                })
                .on("end", function () {
                    points_transition();
                });

            function pathTween(path_node, flight_data) {
                let people_count = [
                    parseInt(flight_data["12月"].split(",").join(""), 10),
                    parseInt(flight_data["1月"].split(",").join(""), 10),
                    parseInt(flight_data["2月"].split(",").join(""), 10),
                    parseInt(flight_data["3月"].split(",").join(""), 10),
                ];
                for (let i = people_count.length - 1; i >= 0; --i) {
                    people_count[i] /= people_count[0];
                }

                let points_transition_scale = people_count;

                return function (t) {
                    let length = path_node.getTotalLength(),
                        r = d3.interpolate(0, length),
                        point = path_node.getPointAtLength(r(t)),
                        transition_scale_length =
                            points_transition_scale.length;

                    if (points_dynamic_scale) {
                        for (let i = 1; i <= transition_scale_length; ++i) {
                            if (t * transition_scale_length <= i) {
                                t = points_transition_scale[i - 1];
                                d3.select(this)
                                    .attr("cx", point.x)
                                    .attr("cy", point.y)
                                    .attr(
                                        "r",
                                        t * projection.scale() * LinksScale
                                    );

                                break;
                            }
                        }
                    } else {
                        d3.select(this)
                            .attr("r", projection.scale() * LinksScale)
                            .attr("cx", point.x)
                            .attr("cy", point.y);
                    }
                };
            }
        }

        return [links, points];
    }

    function enable_zoom_drag(globe_bg, links, points) {
        svg.call(
            d3.drag().on("drag", () => {
                const rotate = projection.rotate();
                const k = Sensitivity / projection.scale();
                projection.rotate([
                    rotate[0] + d3.event.dx * k,
                    rotate[1] - d3.event.dy * k,
                ]);
                // Update all path
                path = d3.geoPath().projection(projection);
                svg.selectAll("path").attr("d", path);
            })
        ).call(
            d3.zoom().on("zoom", () => {
                if (d3.event.transform.k < ZoomRange[0]) {
                    d3.event.transform.k = ZoomRange[0];
                } else if (d3.event.transform.k > ZoomRange[1]) {
                    d3.event.transform.k = ZoomRange[1];
                } else {
                    projection.scale(InitialScale * d3.event.transform.k);
                    path = d3.geoPath().projection(projection);
                    svg.selectAll("path").attr("d", path);
                    globe_bg.attr("r", projection.scale());
                    links.style(
                        "stroke-width",
                        projection.scale() * LinksScale
                    );
                    points.attr("r", projection.scale() * LinksScale);
                }
            })
        );
    }

    function Rotation_Btn() {
        this.enable_rotation = false;

        let rotation_timer = d3.interval(rotate, 50);
        rotation_timer.stop();

        let rotation_btn = d3.select("#rotation-btn").on("click", function () {
            if (this.enable_rotate) {
                this.enable_rotate = false;
                rotation_timer.stop();
                d3.select(this).style("background", "none");
            } else {
                this.enable_rotate = true;
                rotation_timer.restart(rotate);
                d3.select(this).style("background", "#7777");
            }
        });

        function rotate(elapsed) {
            const rotate = projection.rotate();
            const k = Sensitivity / projection.scale();
            projection.rotate([rotate[0] - k, rotate[1]]);
            path = d3.geoPath().projection(projection);
            svg.selectAll("path").attr("d", path);
        }

        return rotation_btn;
    }

    function Departure_Btn(
        flights_data_dict,
        links_components,
        in_links,
        out_links,
        infobox,
        tooltip
    ) {
        this.departure = false;

        d3.select("#departure-btn").on("click", function () {
            if (this.departure) {
                this.departure = false;
                clear_links();
                add_links(in_links, true);
                d3.select(this).style("background", "none");
            } else {
                this.departure = true;
                clear_links();
                add_links(out_links, false);
                d3.select(this).style("background", "#7777");
            }
        });

        function clear_links() {
            for (let i = links_components.length - 1; i >= 0; --i) {
                links_components[i].remove();
                links_components.pop();
            }
        }

        function add_links(links, dynamic_size) {
            var components = draw_links(
                flights_data_dict,
                links,
                infobox,
                tooltip,
                dynamic_size
            );
            for (let i = 0; i < components.length; ++i) {
                links_components.push(components[i]);
            }
        }
    }
}
