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
    const taiwan_coords = [121.5654, 25.033];
    const countries_color = "#639a67";
    const zoom_range = [0.3, 15];
    const links_scale = 0.01;

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
        flights_data = values[1];
        flights_data_dict = {};
        for (let i = 0; i < flights_data.length; ++i) {
            let code = flights_data[i]["代碼"];
            flights_data_dict[code] = flights_data[i];
        }

        // Draw Map
        world = values[0];
        world = topojson.feature(world, world.objects.countries);

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
        var links_components = draw_links(in_links, infobox, tooltip);
        var links = links_components[0],
            points = links_components[1];

        enable_zoom_drag(globe_bg, links, points);
        var rotation_btn = new Rotation_Btn();
        var departure_btn = new Departure_Btn(
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
            .style("background", "#fffa");

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
            .style("fill", countries_color)
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
            d3.select("#country" + code).style("fill", countries_color);
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
                coordinates: [target_coords, taiwan_coords],
            });
            out_links.push({
                type: "LineString",
                code: code,
                coordinates: [taiwan_coords, target_coords],
            });
        }

        return [in_links, out_links];
    }

    function draw_links(
        links_data,
        infobox,
        tooltip,
        color = "#ffb367",
        duration = 3000
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
                set_tooltip(flights_data_dict[d.code], tooltip);
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
                show_info(flights_data_dict[d.code], infobox);
            })
            .call(links_transition);

        // Draw Points
        var points = links_base
            .append("circle")
            .attr("id", (d) => "point" + d.code)
            .attr("r", InitialScale / 150)
            .style("fill", "orange")
            .style("opacity", 0.9);
        points_transition();

        function links_transition(path) {
            path.transition()
                .duration(duration)
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

        function points_transition() {
            points
                .transition()
                .delay(1500)
                .duration(6000)
                .ease(d3.easePoly)
                .tween("pathTween", function (d, i) {
                    return pathTween(links.nodes()[i]);
                })
                .on("end", points_transition);

            function pathTween(path_node) {
                let length = path_node.getTotalLength();
                let r = d3.interpolate(0, length);
                return function (t) {
                    var point = path_node.getPointAtLength(r(t));

                    if (t < 0.25) t = 0.25;
                    else if (t < 0.5) t = 0.5;
                    else if (t < 0.75) t = 0.75;
                    else t = 1;
                    d3.select(this)
                        .attr("r", t * projection.scale() * links_scale)
                        .attr("cx", point.x)
                        .attr("cy", point.y);
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
                if (d3.event.transform.k < zoom_range[0]) {
                    d3.event.transform.k = zoom_range[0];
                } else if (d3.event.transform.k > zoom_range[1]) {
                    d3.event.transform.k = zoom_range[1];
                } else {
                    projection.scale(InitialScale * d3.event.transform.k);
                    path = d3.geoPath().projection(projection);
                    svg.selectAll("path").attr("d", path);
                    globe_bg.attr("r", projection.scale());
                    links.style(
                        "stroke-width",
                        projection.scale() * links_scale
                    );
                    points.attr("r", projection.scale() * links_scale);
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
                add_links(in_links);
                d3.select(this).style("background", "none");
            } else {
                this.departure = true;
                clear_links();
                add_links(out_links);
                d3.select(this).style("background", "#7777");
            }
        });

        function clear_links() {
            for (let i = links_components.length - 1; i >= 0; --i) {
                links_components[i].remove();
                links_components.pop();
            }
        }

        function add_links(links) {
            var components = draw_links(links, infobox, tooltip);
            for (let i = 0; i < components.length; ++i) {
                links_components.push(components[i]);
            }
        }
    }
}
